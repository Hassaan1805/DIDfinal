import { StorageService } from './storage';
import { config, isValidUrl } from '../config/config';

export interface NetworkTestResult {
  url: string;
  success: boolean;
  latency: number;
  error?: string;
}

class NetworkService {
  private currentUrl: string;
  private isConnected: boolean = false;

  constructor() {
    this.currentUrl = config.apiUrl;
  }

  private createAxiosInstance(baseURL: string): any {
    return null; // unused, kept for compatibility
  }

  /**
   * Generate candidate URLs by scanning the /24 subnet of a given base URL.
   * e.g. http://192.168.0.105:3001 → http://192.168.0.1:3001 … http://192.168.0.254:3001
   */
  private generateSubnetUrls(baseUrl: string): string[] {
    try {
      const parsed = new URL(baseUrl);
      const parts = parsed.hostname.split('.');
      if (parts.length !== 4 || parts.some(p => isNaN(Number(p)))) return [];
      const subnet = parts.slice(0, 3).join('.');
      const port = parsed.port || '3001';
      return Array.from({ length: 254 }, (_, i) => `http://${subnet}.${i + 1}:${port}`);
    } catch {
      return [];
    }
  }

  /**
   * Test a single URL for connectivity
   */
  async testUrl(url: string, timeoutMs = 5000): Promise<NetworkTestResult> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        signal: controller.signal as any,
        headers: { 'Content-Type': 'application/json' },
      });

      clearTimeout(timer);
      return { url, success: response.ok, latency: Date.now() - start };
    } catch (error: any) {
      return { url, success: false, latency: Date.now() - start, error: error.message };
    }
  }

  /**
   * Test all configured URLs (including full subnet scan) and find the best one.
   * Subnet hosts are tested with a shorter 1.5s timeout to keep discovery fast.
   */
  async discoverBestUrl(): Promise<string | null> {
    const knownUrls = [this.currentUrl, ...config.fallbackUrls];
    const subnetUrls = this.generateSubnetUrls(config.apiUrl);

    // Test known URLs at full timeout, subnet hosts at 1.5s to avoid long waits
    const knownResults = await Promise.all(knownUrls.map(url => this.testUrl(url)));
    const knownSuccess = knownResults.filter(r => r.success);
    if (knownSuccess.length > 0) {
      knownSuccess.sort((a, b) => a.latency - b.latency);
      await this.setApiUrl(knownSuccess[0].url);
      this.isConnected = true;
      return knownSuccess[0].url;
    }

    // Full subnet scan — all in parallel, short timeout
    const subnetCandidates = subnetUrls.filter(u => !knownUrls.includes(u));
    const subnetResults = await Promise.all(subnetCandidates.map(url => this.testUrl(url, 1500)));
    const allResults = [...knownResults, ...subnetResults];
    const successful = allResults.filter(r => r.success);

    if (successful.length === 0) {
      this.isConnected = false;
      return null;
    }

    successful.sort((a, b) => a.latency - b.latency);
    const bestUrl = successful[0].url;
    await this.setApiUrl(bestUrl);
    this.isConnected = true;
    return bestUrl;
  }

  /**
   * Set the API URL and save to storage
   */
  async setApiUrl(url: string): Promise<void> {
    if (!isValidUrl(url)) throw new Error('Invalid URL format');
    this.currentUrl = url;
    await StorageService.saveApiUrl(url);
  }

  getApiUrl(): string {
    return this.currentUrl;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Initialize network service.
   * Priority: (1) last saved working URL, (2) .env primary URL, (3) full discovery + subnet scan.
   */
  async initialize(): Promise<void> {
    // 1. Try the last URL that actually worked (survives app restarts)
    const savedUrl = await StorageService.getApiUrl();
    if (savedUrl) {
      this.currentUrl = savedUrl;
      const result = await this.testUrl(this.currentUrl);
      if (result.success) {
        this.isConnected = true;
        return;
      }
    }

    // 2. Try the .env primary URL (handles first launch or saved URL went stale)
    this.currentUrl = config.apiUrl;
    const primaryResult = await this.testUrl(this.currentUrl);
    if (primaryResult.success) {
      this.isConnected = true;
      await StorageService.saveApiUrl(this.currentUrl);
      return;
    }

    // 3. Full discovery: fallbacks + subnet scan
    await this.discoverBestUrl();
  }

  /**
   * Make an API request using native fetch
   */
  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ): Promise<T> {
    const makeRequest = async (baseUrl: string): Promise<T> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.networkTimeout);
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method,
          signal: controller.signal as any,
          headers: { 'Content-Type': 'application/json' },
          body: data ? JSON.stringify(data) : undefined,
        });
        clearTimeout(timer);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return (await response.json()) as T;
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      return await makeRequest(this.currentUrl);
    } catch (error: any) {
      if (
        error.name === 'AbortError' ||
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch')
      ) {
        const newUrl = await this.discoverBestUrl();
        if (newUrl) return await makeRequest(newUrl);
      }
      throw error;
    }
  }

  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>('POST', endpoint, data);
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>('PUT', endpoint, data);
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint);
  }
}

export const networkService = new NetworkService();
