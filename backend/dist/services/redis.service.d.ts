import Redis from 'ioredis';
export declare function initializeRedis(): Promise<void>;
export declare function getRedisClient(): Redis | null;
export declare function isRedisConnected(): boolean;
export declare function closeRedis(): Promise<void>;
//# sourceMappingURL=redis.service.d.ts.map