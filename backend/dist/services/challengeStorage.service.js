"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeChallengeStorage = initializeChallengeStorage;
exports.getChallengeStorage = getChallengeStorage;
exports.setChallenge = setChallenge;
exports.getChallenge = getChallenge;
exports.deleteChallenge = deleteChallenge;
exports.getAllChallengeIds = getAllChallengeIds;
const redis_service_1 = require("./redis.service");
class InMemoryChallengeStorage {
    constructor() {
        this.challenges = new Map();
    }
    async set(challengeId, challenge, ttlSeconds) {
        this.challenges.set(challengeId, challenge);
        if (ttlSeconds) {
            setTimeout(() => {
                this.challenges.delete(challengeId);
            }, ttlSeconds * 1000);
        }
    }
    async get(challengeId) {
        return this.challenges.get(challengeId) || null;
    }
    async delete(challengeId) {
        this.challenges.delete(challengeId);
    }
    async keys() {
        return Array.from(this.challenges.keys());
    }
    isReady() {
        return true;
    }
}
class RedisChallengeStorage {
    constructor() {
        this.keyPrefix = 'challenge:';
        this.defaultTTL = 600;
    }
    async set(challengeId, challenge, ttlSeconds) {
        const redis = (0, redis_service_1.getRedisClient)();
        if (!redis) {
            throw new Error('Redis client not available');
        }
        const key = this.keyPrefix + challengeId;
        const value = JSON.stringify(challenge);
        const ttl = ttlSeconds || this.defaultTTL;
        await redis.setex(key, ttl, value);
    }
    async get(challengeId) {
        const redis = (0, redis_service_1.getRedisClient)();
        if (!redis) {
            throw new Error('Redis client not available');
        }
        const key = this.keyPrefix + challengeId;
        const value = await redis.get(key);
        if (!value) {
            return null;
        }
        try {
            return JSON.parse(value);
        }
        catch (error) {
            console.error('Error parsing challenge from Redis:', error);
            return null;
        }
    }
    async delete(challengeId) {
        const redis = (0, redis_service_1.getRedisClient)();
        if (!redis) {
            throw new Error('Redis client not available');
        }
        const key = this.keyPrefix + challengeId;
        await redis.del(key);
    }
    async keys() {
        const redis = (0, redis_service_1.getRedisClient)();
        if (!redis) {
            throw new Error('Redis client not available');
        }
        const pattern = this.keyPrefix + '*';
        const keys = await redis.keys(pattern);
        return keys.map((key) => key.replace(this.keyPrefix, ''));
    }
    isReady() {
        return (0, redis_service_1.isRedisConnected)();
    }
}
let storageInstance = null;
function initializeChallengeStorage() {
    const storageType = process.env.CHALLENGE_STORAGE_TYPE || 'memory';
    if (storageType === 'redis' && (0, redis_service_1.isRedisConnected)()) {
        console.log('✅ Challenge storage: REDIS mode');
        storageInstance = new RedisChallengeStorage();
    }
    else {
        console.log('📦 Challenge storage: IN-MEMORY mode');
        storageInstance = new InMemoryChallengeStorage();
    }
}
function getChallengeStorage() {
    if (!storageInstance) {
        initializeChallengeStorage();
    }
    if (!storageInstance) {
        throw new Error('Challenge storage not initialized');
    }
    return storageInstance;
}
async function setChallenge(challengeId, challenge, ttlSeconds = 600) {
    await getChallengeStorage().set(challengeId, challenge, ttlSeconds);
}
async function getChallenge(challengeId) {
    return await getChallengeStorage().get(challengeId);
}
async function deleteChallenge(challengeId) {
    await getChallengeStorage().delete(challengeId);
}
async function getAllChallengeIds() {
    return await getChallengeStorage().keys();
}
//# sourceMappingURL=challengeStorage.service.js.map