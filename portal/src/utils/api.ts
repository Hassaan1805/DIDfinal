/**
 * API Utilities for Decentralized Trust Platform
 * 
 * This module provides standardized API communication patterns
 * that prevent CORS issues and ensure consistent error handling.
 */

// API Configuration
const API_CONFIG = {
  // Use environment variable for production, fallback to Railway backend for deployment
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://did-platform-backend-production.up.railway.app/api',
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
} as const;

// Standard headers for all API requests
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
} as const;

// API Response interface
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Custom error class for API errors
export class ApiError extends Error {
  public status: number;
  public response?: any;

  constructor(message: string, status: number, response?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
  }
}

/**
 * Standardized fetch wrapper that handles common patterns
 * Always uses relative URLs to work with Vite proxy
 */
export class ApiClient {
  private static baseURL = API_CONFIG.baseURL;

  /**
   * Generic request method with retry logic
   */
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        ...DEFAULT_HEADERS,
        ...options.headers,
      },
      ...options,
    };

    let lastError: Error;
    
    // Retry logic
    for (let attempt = 1; attempt <= API_CONFIG.retries; attempt++) {
      try {
        console.log(`🔄 API Request (attempt ${attempt}): ${config.method || 'GET'} ${url}`);
        
        const response = await fetch(url, config);
        
        console.log(`📡 API Response: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          throw new ApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            response
          );
        }
        
        const data = await response.json();
        console.log('📦 API Data:', data);
        
        return data;
        
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ API Error (attempt ${attempt}):`, error);
        
        // Don't retry on certain errors
        if (error instanceof ApiError && error.status < 500) {
          throw error;
        }
        
        // Wait before retry (except on last attempt)
        if (attempt < API_CONFIG.retries) {
          await new Promise(resolve => 
            setTimeout(resolve, API_CONFIG.retryDelay * attempt)
          );
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * GET request
   */
  static async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  static async post<T>(
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  static async put<T>(
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  static async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

/**
 * Authentication API methods
 */
export class AuthAPI {
  /**
   * Get authentication challenge
   * Returns challenge data including QR code
   */
  static async getChallenge() {
    return ApiClient.get('/auth/challenge');
  }

  /**
   * Submit authentication response
   */
  static async submitResponse(challengeId: string, signature: string) {
    return ApiClient.post('/auth/verify', {
      challengeId,
      signature,
    });
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string) {
    return ApiClient.post('/auth/verify-token', { token });
  }
}

/**
 * Connection status checker
 * Useful for debugging network issues
 */
export class ConnectionChecker {
  /**
   * Check if backend is reachable
   */
  static async checkBackend(): Promise<boolean> {
    try {
      await ApiClient.get('/health');
      return true;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }

  /**
   * Check network connectivity
   */
  static checkNetwork(): boolean {
    return navigator.onLine;
  }

  /**
   * Get comprehensive connection status
   */
  static async getConnectionStatus() {
    const networkOnline = this.checkNetwork();
    const backendReachable = await this.checkBackend();
    
    return {
      networkOnline,
      backendReachable,
      status: networkOnline && backendReachable ? 'connected' : 'disconnected',
    };
  }
}

// Export everything for easy importing
export default {
  ApiClient,
  AuthAPI,
  ConnectionChecker,
  ApiError,
};
