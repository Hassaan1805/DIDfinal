import Redis from 'ioredis';

let redisClient: Redis | null = null;
let isConnected = false;

/**
 * Initialize Redis connection
 * Supports optional Redis URL from environment variable
 * Falls back to in-memory mode if Redis is not available
 */
export async function initializeRedis(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  const storageType = process.env.CHALLENGE_STORAGE_TYPE || 'memory';

  if (storageType !== 'redis') {
    console.log('📦 Challenge storage: IN-MEMORY mode (REDIS_URL not configured or CHALLENGE_STORAGE_TYPE!=redis)');
    return;
  }

  if (!redisUrl) {
    console.warn('⚠️  CHALLENGE_STORAGE_TYPE=redis but REDIS_URL not set. Falling back to in-memory storage.');
    return;
  }

  try {
    console.log('🔌 Connecting to Redis...');
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.error('❌ Redis connection failed after 3 retries. Falling back to in-memory storage.');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        console.log(`🔄 Retrying Redis connection in ${delay}ms...`);
        return delay;
      },
      reconnectOnError: (err: Error) => {
        console.error('Redis error:', err.message);
        return true;
      },
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
      isConnected = true;
    });

    redisClient.on('error', (err: Error) => {
      console.error('❌ Redis client error:', err);
      isConnected = false;
    });

    redisClient.on('close', () => {
      console.log('🔌 Redis connection closed');
      isConnected = false;
    });

    // Test connection
    await redisClient.ping();
    isConnected = true;
    console.log('✅ Redis connection established');
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error);
    console.log('📦 Falling back to in-memory challenge storage');
    redisClient = null;
    isConnected = false;
  }
}

/**
 * Get Redis client instance
 * Returns null if Redis is not connected or not configured
 */
export function getRedisClient(): Redis | null {
  return redisClient;
}

/**
 * Check if Redis is connected and available
 */
export function isRedisConnected(): boolean {
  return isConnected && redisClient !== null;
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('✅ Redis connection closed gracefully');
    } catch (error) {
      console.error('❌ Error closing Redis connection:', error);
    } finally {
      redisClient = null;
      isConnected = false;
    }
  }
}
