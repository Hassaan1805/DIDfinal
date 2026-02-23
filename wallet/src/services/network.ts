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
   * Test a single URL for connectivity
   */
  async testUrl(url: string): Promise<NetworkTestResult> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      });

      clearTimeout(timer);
      return { url, success: response.ok, latency: Date.now() - start };
    } catch (error: any) {
      return { url, success: false, latency: Date.now() - start, error: error.message };
    }
  }

  /**
   * Test all configured URLs and find the best one
   */
  async discoverBestUrl(): Promise<string | null> {
    const urls = [this.currentUrl, ...config.fallbackUrls];
    const allResults = await Promise.all(urls.map(url => this.testUrl(url)));
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
   * Initialize network service — always start from the hardcoded config URL.
   * Ignores any previously-cached URL in AsyncStorage to avoid stale IPs.
   */
  async initialize(): Promise<void> {
    // Always reset to the hardcoded URL from config (never use stale cached URL)
    this.currentUrl = config.apiUrl;
    await StorageService.saveApiUrl(config.apiUrl); // overwrite any stale cached value
    const result = await this.testUrl(this.currentUrl);
    if (result.success) {
      this.isConnected = true;
    }
    // If the primary fails, try fallbacks silently — don't block startup
    if (!this.isConnected) {
      await this.discoverBestUrl();
    }
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
          signal: controller.signal,
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
