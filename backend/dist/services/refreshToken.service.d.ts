interface RefreshTokenRecord {
    token: string;
    userId: string;
    did: string;
    expiresAt: Date;
    createdAt: Date;
    lastUsed: Date;
    deviceInfo?: string;
}
export declare function generateRefreshToken(): string;
export declare function storeRefreshToken(token: string, userId: string, did: string, expiresInDays?: number, deviceInfo?: string): RefreshTokenRecord;
export declare function getRefreshToken(token: string): RefreshTokenRecord | null;
export declare function revokeRefreshToken(token: string): boolean;
export declare function revokeAllUserTokens(userId: string): number;
export declare function revokeAllDIDTokens(did: string): number;
export declare function getUserRefreshTokens(userId: string): RefreshTokenRecord[];
export declare function cleanupExpiredTokens(): number;
export declare function getRefreshTokenStats(): {
    total: number;
    active: number;
    expired: number;
};
export {};
//# sourceMappingURL=refreshToken.service.d.ts.map