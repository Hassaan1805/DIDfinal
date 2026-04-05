/**
 * API Utilities for Decentralized Trust Platform
 * 
 * This module provides standardized API communication patterns
 * that prevent CORS issues and ensure consistent error handling.
 */

// API Configuration
const API_CONFIG = {
  // Use environment variable for production, fallback to local backend for development
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
  static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...DEFAULT_HEADERS,
        ...options.headers,
      },
    };

    let lastError: Error;
    
    // Retry logic
    for (let attempt = 1; attempt <= API_CONFIG.retries; attempt++) {
      try {
        console.log(`🔄 API Request (attempt ${attempt}): ${config.method || 'GET'} ${url}`);
        
        const response = await fetch(url, config);
        
        console.log(`📡 API Response: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          let message = `HTTP ${response.status}: ${response.statusText}`;
          try {
            const body = await response.clone().json();
            if (body?.error) message = body.error;
            else if (body?.message) message = body.message;
          } catch { /* non-JSON body, keep default message */ }
          throw new ApiError(message, response.status, response);
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
 * Audit Timeline API methods
 */
export class AuditAPI {
  /**
   * Get authentication timeline with filters
   */
  static async getTimeline(filters: {
    did?: string;
    userAddress?: string;
    employeeId?: string;
    companyId?: string;
    verifierId?: string;
    eventType?: string;
    status?: string;
    from?: string;
    to?: string;
    limit?: number;
    cursor?: number;
  }) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const queryString = params.toString();
    const endpoint = queryString ? `/auth/timeline?${queryString}` : '/auth/timeline';
    
    return ApiClient.get(endpoint);
  }

  /**
   * Get authenticated user's timeline
   */
  static async getMyTimeline(filters?: {
    eventType?: string;
    status?: string;
    from?: string;
    to?: string;
    limit?: number;
    cursor?: number;
  }) {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/auth/timeline/me?${queryString}` : '/auth/timeline/me';
    
    return ApiClient.get(endpoint);
  }
}

/**
 * Admin API methods
 */
export class AdminAPI {
  private static adminToken: string | null = null;

  /**
   * Set admin token for authenticated requests
   */
  static setAdminToken(token: string) {
    this.adminToken = token;
    localStorage.setItem('admin_token', token);
  }

  /**
   * Get admin token (from memory or localStorage)
   */
  static getAdminToken(): string | null {
    if (!this.adminToken) {
      this.adminToken = localStorage.getItem('admin_token');
    }
    return this.adminToken;
  }

  /**
   * Clear admin token
   */
  static clearAdminToken() {
    this.adminToken = null;
    localStorage.removeItem('admin_token');
  }

  /**
   * Make authenticated admin request
   */
  private static async adminRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getAdminToken();
    if (!token) {
      throw new ApiError('Admin token not set', 401);
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };

    return ApiClient.request<T>(endpoint, { ...options, headers });
  }

  /**
   * List all employees
   */
  static async listEmployees() {
    return this.adminRequest('/admin/employees');
  }

  /**
   * Get employee by ID
   */
  static async getEmployee(employeeId: string) {
    return this.adminRequest(`/admin/employee/${employeeId}`);
  }

  /**
   * Create a new employee
   */
  static async createEmployee(data: {
    id: string;
    name: string;
    department: string;
    email: string;
    address: string;
    did?: string;
    badge?: 'employee' | 'manager' | 'admin' | 'auditor';
    registerOnChain?: boolean;
  }) {
    return this.adminRequest('/admin/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update an employee
   */
  static async updateEmployee(employeeId: string, data: {
    name?: string;
    department?: string;
    email?: string;
    badge?: 'employee' | 'manager' | 'admin' | 'auditor';
  }) {
    return this.adminRequest(`/admin/employees/${employeeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Permanently delete an employee
   */
  static async deleteEmployee(employeeId: string) {
    return this.adminRequest(`/admin/employees/${employeeId}`, { method: 'DELETE' });
  }

  /**
   * Deactivate an employee
   */
  static async deactivateEmployee(employeeId: string) {
    return this.adminRequest(`/admin/employees/${employeeId}/deactivate`, {
      method: 'POST',
    });
  }

  /**
   * Reactivate an employee
   */
  static async reactivateEmployee(employeeId: string) {
    return this.adminRequest(`/admin/employees/${employeeId}/reactivate`, {
      method: 'POST',
    });
  }

  /**
   * Register employee DID on-chain
   */
  static async registerOnChain(employeeId: string) {
    return this.adminRequest(`/admin/employees/${employeeId}/register-onchain`, {
      method: 'POST',
    });
  }

  /**
   * Issue credential to employee
   */
  static async issueCredential(targetEmployeeId: string, badge?: string) {
    return this.adminRequest('/admin/issue-credential', {
      method: 'POST',
      body: JSON.stringify({ targetEmployeeId, badge }),
    });
  }

  /**
   * Revoke the active credential for an employee
   */
  static async revokeCredential(employeeId: string) {
    return this.adminRequest(`/admin/employees/${employeeId}/revoke-credential`, { method: 'POST' });
  }

  /**
   * Get badge definitions
   */
  static async getBadges() {
    return this.adminRequest('/admin/badges');
  }

  /**
   * Get blockchain status
   */
  static async getBlockchainStatus() {
    return ApiClient.get('/did/status/unified');
  }

  /**
   * Send an enrollment request to a user's wallet
   */
  static async sendEnrollmentRequest(data: {
    did: string;
    requesterOrganizationId: string;
    requesterOrganizationName: string;
    purpose: string;
    employeeData: { id: string; name: string; department: string; email: string; badge: string };
    expiresInHours?: number;
  }) {
    return ApiClient.post('/identity/enrollment-requests', data);
  }

  /**
   * List enrollment requests (admin-authenticated)
   */
  static async listEnrollmentRequests(filters?: { status?: string; did?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.did) params.append('did', filters.did);
    const qs = params.toString();
    return this.adminRequest(`/identity/enrollment-requests${qs ? `?${qs}` : ''}`);
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
  AuditAPI,
  AdminAPI,
  ConnectionChecker,
  ApiError,
};
