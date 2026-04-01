/**
 * Refresh Token Service
 * Manages refresh token generation, storage, and validation
 */

import crypto from 'crypto';

interface RefreshTokenRecord {
  token: string;
  userId: string;
  did: string;
  badge?: string;
  permissions?: string[];
  credentialVerified?: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastUsed: Date;
  deviceInfo?: string;
}

// In-memory storage (will be replaced with database)
const refreshTokenStore = new Map<string, RefreshTokenRecord>();

/**
 * Generate a cryptographically secure refresh token
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store a refresh token
 */
export function storeRefreshToken(
  token: string,
  userId: string,
  did: string,
  expiresInDays: number = 7,
  deviceInfo?: string,
  badge?: string,
  permissions?: string[],
  credentialVerified?: boolean,
): RefreshTokenRecord {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

  const record: RefreshTokenRecord = {
    token,
    userId,
    did,
    badge,
    permissions,
    credentialVerified,
    expiresAt,
    createdAt: now,
    lastUsed: now,
    deviceInfo,
  };

  refreshTokenStore.set(token, record);
  return record;
}

/**
 * Validate and retrieve a refresh token
 */
export function getRefreshToken(token: string): RefreshTokenRecord | null {
  const record = refreshTokenStore.get(token);
  
  if (!record) {
    return null;
  }

  // Check if expired
  if (new Date() > record.expiresAt) {
    refreshTokenStore.delete(token);
    return null;
  }

  // Update last used timestamp
  record.lastUsed = new Date();
  refreshTokenStore.set(token, record);

  return record;
}

/**
 * Revoke a refresh token
 */
export function revokeRefreshToken(token: string): boolean {
  return refreshTokenStore.delete(token);
}

/**
 * Revoke all refresh tokens for a user
 */
export function revokeAllUserTokens(userId: string): number {
  let count = 0;
  for (const [token, record] of refreshTokenStore.entries()) {
    if (record.userId === userId) {
      refreshTokenStore.delete(token);
      count++;
    }
  }
  return count;
}

/**
 * Revoke all refresh tokens for a DID
 */
export function revokeAllDIDTokens(did: string): number {
  let count = 0;
  for (const [token, record] of refreshTokenStore.entries()) {
    if (record.did === did) {
      refreshTokenStore.delete(token);
      count++;
    }
  }
  return count;
}

/**
 * Get all refresh tokens for a user (for admin/debugging)
 */
export function getUserRefreshTokens(userId: string): RefreshTokenRecord[] {
  const tokens: RefreshTokenRecord[] = [];
  for (const record of refreshTokenStore.values()) {
    if (record.userId === userId) {
      tokens.push(record);
    }
  }
  return tokens;
}

/**
 * Clean up expired tokens (should be called periodically)
 */
export function cleanupExpiredTokens(): number {
  let count = 0;
  const now = new Date();
  
  for (const [token, record] of refreshTokenStore.entries()) {
    if (now > record.expiresAt) {
      refreshTokenStore.delete(token);
      count++;
    }
  }
  
  return count;
}

/**
 * Get statistics about refresh tokens
 */
export function getRefreshTokenStats() {
  const now = new Date();
  let active = 0;
  let expired = 0;

  for (const record of refreshTokenStore.values()) {
    if (now > record.expiresAt) {
      expired++;
    } else {
      active++;
    }
  }

  return {
    total: refreshTokenStore.size,
    active,
    expired,
  };
}
