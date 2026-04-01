import { getRedisClient, isRedisConnected } from './redis.service';

/**
 * Challenge data structure
 * Contains all authentication challenge metadata and context
 */
export interface AuthChallenge {
  challenge: string;
  timestamp: number;
  used: boolean;
  /** 'standard' (default login) or 'role_proof' (ZKP role challenge) */
  challengeType?: 'standard' | 'role_proof';
  /** For role_proof challenges: the minimum badge the prover must hold */
  requiredBadge?: 'employee' | 'manager' | 'admin' | 'auditor';
  /** For role_proof challenges: what this scoped access grants (e.g. 'security:view') */
  scope?: string;
  token?: string;
  refreshToken?: string;
  userAddress?: string;
  did?: string;
  employeeId?: string;
  employeeName?: string;
  badge?: 'employee' | 'manager' | 'admin' | 'auditor';
  permissions?: string[];
  hashId?: string;
  didRegistrationTxHash?: string;
  authRecordTxHash?: string;
  authVerifyTxHash?: string;
  adminGasPayerAddress?: string;
  adminGasPayerEtherscanUrl?: string;
  companyId?: string;
  verifierId?: string;
  verifierOrganizationId?: string;
  verifierOrganizationName?: string;
  verifierPolicyVersion?: number;
  verifierCredentialRequired?: boolean;
  requestType?: 'portal_access' | 'general_auth';
  requestedClaims?: {
    requestType: string;
    requiredClaims: Array<'subjectDid' | 'employeeId' | 'name' | 'role' | 'department' | 'email'>;
    policyVersion: number;
    proofRequired?: boolean;
    bindingVersion?: string;
  };
  disclosedClaims?: Partial<Record<string, string>>;
  disclosedClaimsVerified?: boolean;
  disclosedClaimsProofVerified?: boolean;
  disclosedClaimsBindingDigest?: string;
  blockchainResults?: {
    registration?: any;
    authRecord?: any;
    verification?: any;
    didInfo?: any;
    completedAt?: string;
  };
  blockchainError?: string;
}

/**
 * Challenge storage interface
 * Defines methods for storing and retrieving authentication challenges
 */
export interface IChallengeStorage {
  /**
   * Store a challenge with optional TTL
   */
  set(challengeId: string, challenge: AuthChallenge, ttlSeconds?: number): Promise<void>;

  /**
   * Retrieve a challenge by ID
   */
  get(challengeId: string): Promise<AuthChallenge | null>;

  /**
   * Delete a challenge
   */
  delete(challengeId: string): Promise<void>;

  /**
   * Get all challenge IDs (for cleanup/iteration)
   */
  keys(): Promise<string[]>;

  /**
   * Check if storage is ready
   */
  isReady(): boolean;
}

/**
 * In-Memory Challenge Storage (Development/Fallback)
 * Stores challenges in a JavaScript Map
 */
class InMemoryChallengeStorage implements IChallengeStorage {
  private challenges = new Map<string, AuthChallenge>();

  async set(challengeId: string, challenge: AuthChallenge, ttlSeconds?: number): Promise<void> {
    this.challenges.set(challengeId, challenge);

    // Optionally handle TTL with setTimeout (basic implementation)
    if (ttlSeconds) {
      setTimeout(() => {
        this.challenges.delete(challengeId);
      }, ttlSeconds * 1000);
    }
  }

  async get(challengeId: string): Promise<AuthChallenge | null> {
    return this.challenges.get(challengeId) || null;
  }

  async delete(challengeId: string): Promise<void> {
    this.challenges.delete(challengeId);
  }

  async keys(): Promise<string[]> {
    return Array.from(this.challenges.keys());
  }

  isReady(): boolean {
    return true; // Always ready
  }
}

/**
 * Redis Challenge Storage (Production)
 * Stores challenges in Redis with automatic expiration
 */
class RedisChallengeStorage implements IChallengeStorage {
  private readonly keyPrefix = 'challenge:';
  private readonly defaultTTL = 600; // 10 minutes in seconds

  async set(challengeId: string, challenge: AuthChallenge, ttlSeconds?: number): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error('Redis client not available');
    }

    const key = this.keyPrefix + challengeId;
    const value = JSON.stringify(challenge);
    const ttl = ttlSeconds || this.defaultTTL;

    await redis.setex(key, ttl, value);
  }

  async get(challengeId: string): Promise<AuthChallenge | null> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error('Redis client not available');
    }

    const key = this.keyPrefix + challengeId;
    const value = await redis.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as AuthChallenge;
    } catch (error) {
      console.error('Error parsing challenge from Redis:', error);
      return null;
    }
  }

  async delete(challengeId: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error('Redis client not available');
    }

    const key = this.keyPrefix + challengeId;
    await redis.del(key);
  }

  async keys(): Promise<string[]> {
    const redis = getRedisClient();
    if (!redis) {
      throw new Error('Redis client not available');
    }

    const pattern = this.keyPrefix + '*';
    const keys = await redis.keys(pattern);

    // Remove prefix from keys
    return keys.map((key: string) => key.replace(this.keyPrefix, ''));
  }

  isReady(): boolean {
    return isRedisConnected();
  }
}

/**
 * Challenge Storage Factory
 * Creates appropriate storage implementation based on configuration
 */
let storageInstance: IChallengeStorage | null = null;

export function initializeChallengeStorage(): void {
  const storageType = process.env.CHALLENGE_STORAGE_TYPE || 'memory';

  if (storageType === 'redis' && isRedisConnected()) {
    console.log('✅ Challenge storage: REDIS mode');
    storageInstance = new RedisChallengeStorage();
  } else {
    console.log('📦 Challenge storage: IN-MEMORY mode');
    storageInstance = new InMemoryChallengeStorage();
  }
}

export function getChallengeStorage(): IChallengeStorage {
  if (!storageInstance) {
    // Lazy initialization fallback
    initializeChallengeStorage();
  }

  if (!storageInstance) {
    throw new Error('Challenge storage not initialized');
  }

  return storageInstance;
}

/**
 * Helper functions for backward compatibility
 */
export async function setChallenge(challengeId: string, challenge: AuthChallenge, ttlSeconds = 600): Promise<void> {
  await getChallengeStorage().set(challengeId, challenge, ttlSeconds);
}

export async function getChallenge(challengeId: string): Promise<AuthChallenge | null> {
  return await getChallengeStorage().get(challengeId);
}

export async function deleteChallenge(challengeId: string): Promise<void> {
  await getChallengeStorage().delete(challengeId);
}

export async function getAllChallengeIds(): Promise<string[]> {
  return await getChallengeStorage().keys();
}
