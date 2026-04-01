"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeRedis = initializeRedis;
exports.getRedisClient = getRedisClient;
exports.isRedisConnected = isRedisConnected;
exports.closeRedis = closeRedis;
const ioredis_1 = __importDefault(require("ioredis"));
let redisClient = null;
let isConnected = false;
async function initializeRedis() {
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
        redisClient = new ioredis_1.default(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                if (times > 3) {
                    console.error('❌ Redis connection failed after 3 retries. Falling back to in-memory storage.');
                    return null;
                }
                const delay = Math.min(times * 50, 2000);
                console.log(`🔄 Retrying Redis connection in ${delay}ms...`);
                return delay;
            },
            reconnectOnError: (err) => {
                console.error('Redis error:', err.message);
                return true;
            },
        });
        redisClient.on('connect', () => {
            console.log('✅ Redis connected successfully');
            isConnected = true;
        });
        redisClient.on('error', (err) => {
            console.error('❌ Redis client error:', err);
            isConnected = false;
        });
        redisClient.on('close', () => {
            console.log('🔌 Redis connection closed');
            isConnected = false;
        });
        await redisClient.ping();
        isConnected = true;
        console.log('✅ Redis connection established');
    }
    catch (error) {
        console.error('❌ Failed to initialize Redis:', error);
        console.log('📦 Falling back to in-memory challenge storage');
        redisClient = null;
        isConnected = false;
    }
}
function getRedisClient() {
    return redisClient;
}
function isRedisConnected() {
    return isConnected && redisClient !== null;
}
async function closeRedis() {
    if (redisClient) {
        try {
            await redisClient.quit();
            console.log('✅ Redis connection closed gracefully');
        }
        catch (error) {
            console.error('❌ Error closing Redis connection:', error);
        }
        finally {
            redisClient = null;
            isConnected = false;
        }
    }
}
//# sourceMappingURL=redis.service.js.map