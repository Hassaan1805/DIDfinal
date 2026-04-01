/**
 * Authentication utilities for portal
 * Handles token storage, validation, and refresh
 */

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export type BadgeType = 'admin' | 'auditor' | 'manager' | 'employee';

const BADGE_HIERARCHY: Record<BadgeType, number> = {
  admin: 4,
  auditor: 3,
  manager: 2,
  employee: 1,
};

export interface TokenPayload {
  address: string;
  did: string;
  authenticated: boolean;
  badge?: BadgeType;
  permissions?: string[];
  credentialVerified?: boolean;
  employeeId?: string;
  employeeName?: string;
  iat?: number;
  exp?: number;
}

/**
 * Check if a badge meets the minimum required level
 */
export function badgeMeetsRequirement(userBadge: BadgeType | undefined, required: BadgeType): boolean {
  const userLevel = BADGE_HIERARCHY[userBadge || 'employee'] ?? 1;
  const requiredLevel = BADGE_HIERARCHY[required] ?? 1;
  return userLevel >= requiredLevel;
}

/**
 * Decode JWT token without verification (client-side)
 */
function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Check if token is expired or near expiry
 */
function isTokenExpiringSoon(token: string, thresholdMinutes: number = 5): boolean {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;

  const expiryTime = payload.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  const threshold = thresholdMinutes * 60 * 1000;

  return (expiryTime - now) < threshold;
}

/**
 * Save tokens to localStorage
 * Note: Also saves under legacy 'authToken' key for backward compatibility
 */
export function saveTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem('authToken', accessToken); // Legacy key for backward compatibility
  
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  
  const payload = decodeToken(accessToken);
  if (payload?.exp) {
    localStorage.setItem(TOKEN_EXPIRY_KEY, payload.exp.toString());
  }
}

/**
 * Save access token only (when no refresh token available)
 */
export function saveAccessToken(accessToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem('authToken', accessToken); // Legacy key for backward compatibility
  
  const payload = decodeToken(accessToken);
  if (payload?.exp) {
    localStorage.setItem(TOKEN_EXPIRY_KEY, payload.exp.toString());
  }
}

/**
 * Get access token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get refresh token
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Clear all auth data
 */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('authToken');
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  // Clean up legacy rbac localStorage keys (now in JWT)
  localStorage.removeItem('rbac_badge');
  localStorage.removeItem('rbac_permissions');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;

  const payload = decodeToken(token);
  if (!payload || !payload.exp) return false;

  // Check if token is expired
  const now = Date.now() / 1000;
  return payload.exp > now;
}

/**
 * Get current user info from token
 */
export function getCurrentUser(): TokenPayload | null {
  const token = getAccessToken();
  if (!token) return null;
  
  return decodeToken(token);
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', response.status);
      clearAuth();
      return false;
    }

    const data = await response.json();
    if (data.success && data.token && data.refreshToken) {
      saveTokens(data.token, data.refreshToken);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Token refresh error:', error);
    clearAuth();
    return false;
  }
}

/**
 * Auto-refresh token if expiring soon
 */
export async function autoRefreshToken(): Promise<void> {
  const token = getAccessToken();
  if (!token) return;

  if (isTokenExpiringSoon(token, 5)) {
    console.log('Token expiring soon, refreshing...');
    await refreshAccessToken();
  }
}

/**
 * Set up periodic token refresh check
 */
export function setupTokenRefreshInterval(): () => void {
  const intervalId = setInterval(() => {
    autoRefreshToken();
  }, 60000); // Check every minute

  // Return cleanup function
  return () => clearInterval(intervalId);
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();

  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
  }

  clearAuth();
}
