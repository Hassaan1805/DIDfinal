"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const refreshToken_service_1 = require("../services/refreshToken.service");
describe('RefreshToken Service', () => {
    const testUserId = 'user-001';
    const testDid = 'did:ethr:0x1234567890abcdef1234567890abcdef12345678';
    test('should generate a cryptographically secure token', () => {
        const token = (0, refreshToken_service_1.generateRefreshToken)();
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.length).toBe(64);
        const token2 = (0, refreshToken_service_1.generateRefreshToken)();
        expect(token).not.toBe(token2);
    });
    test('should store and retrieve a refresh token', () => {
        const token = (0, refreshToken_service_1.generateRefreshToken)();
        const record = (0, refreshToken_service_1.storeRefreshToken)(token, testUserId, testDid);
        expect(record.token).toBe(token);
        expect(record.userId).toBe(testUserId);
        expect(record.did).toBe(testDid);
        expect(record.expiresAt).toBeInstanceOf(Date);
        expect(record.createdAt).toBeInstanceOf(Date);
        expect(record.lastUsed).toBeInstanceOf(Date);
        const retrieved = (0, refreshToken_service_1.getRefreshToken)(token);
        expect(retrieved).not.toBeNull();
        expect(retrieved.userId).toBe(testUserId);
    });
    test('should return null for non-existent token', () => {
        const result = (0, refreshToken_service_1.getRefreshToken)('non-existent-token');
        expect(result).toBeNull();
    });
    test('should revoke a token', () => {
        const token = (0, refreshToken_service_1.generateRefreshToken)();
        (0, refreshToken_service_1.storeRefreshToken)(token, testUserId, testDid);
        const revoked = (0, refreshToken_service_1.revokeRefreshToken)(token);
        expect(revoked).toBe(true);
        const result = (0, refreshToken_service_1.getRefreshToken)(token);
        expect(result).toBeNull();
    });
    test('should return false when revoking non-existent token', () => {
        expect((0, refreshToken_service_1.revokeRefreshToken)('fake-token')).toBe(false);
    });
    test('should revoke all tokens for a user', () => {
        const t1 = (0, refreshToken_service_1.generateRefreshToken)();
        const t2 = (0, refreshToken_service_1.generateRefreshToken)();
        const t3 = (0, refreshToken_service_1.generateRefreshToken)();
        (0, refreshToken_service_1.storeRefreshToken)(t1, 'user-revoke-all', testDid);
        (0, refreshToken_service_1.storeRefreshToken)(t2, 'user-revoke-all', testDid);
        (0, refreshToken_service_1.storeRefreshToken)(t3, 'other-user', testDid);
        const count = (0, refreshToken_service_1.revokeAllUserTokens)('user-revoke-all');
        expect(count).toBe(2);
        expect((0, refreshToken_service_1.getRefreshToken)(t1)).toBeNull();
        expect((0, refreshToken_service_1.getRefreshToken)(t2)).toBeNull();
        expect((0, refreshToken_service_1.getRefreshToken)(t3)).not.toBeNull();
        (0, refreshToken_service_1.revokeRefreshToken)(t3);
    });
    test('should revoke all tokens for a DID', () => {
        const didA = 'did:ethr:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const t1 = (0, refreshToken_service_1.generateRefreshToken)();
        const t2 = (0, refreshToken_service_1.generateRefreshToken)();
        (0, refreshToken_service_1.storeRefreshToken)(t1, 'u1', didA);
        (0, refreshToken_service_1.storeRefreshToken)(t2, 'u2', didA);
        const count = (0, refreshToken_service_1.revokeAllDIDTokens)(didA);
        expect(count).toBe(2);
        expect((0, refreshToken_service_1.getRefreshToken)(t1)).toBeNull();
        expect((0, refreshToken_service_1.getRefreshToken)(t2)).toBeNull();
    });
    test('should list tokens for a user', () => {
        const t1 = (0, refreshToken_service_1.generateRefreshToken)();
        const t2 = (0, refreshToken_service_1.generateRefreshToken)();
        (0, refreshToken_service_1.storeRefreshToken)(t1, 'list-user', testDid);
        (0, refreshToken_service_1.storeRefreshToken)(t2, 'list-user', testDid);
        const tokens = (0, refreshToken_service_1.getUserRefreshTokens)('list-user');
        expect(tokens.length).toBe(2);
        expect(tokens.map((t) => t.token)).toEqual(expect.arrayContaining([t1, t2]));
        (0, refreshToken_service_1.revokeAllUserTokens)('list-user');
    });
    test('should store token with custom expiry', () => {
        const token = (0, refreshToken_service_1.generateRefreshToken)();
        const record = (0, refreshToken_service_1.storeRefreshToken)(token, testUserId, testDid, 1);
        const expectedExpiry = record.createdAt.getTime() + 1 * 24 * 60 * 60 * 1000;
        expect(record.expiresAt.getTime()).toBeCloseTo(expectedExpiry, -3);
        (0, refreshToken_service_1.revokeRefreshToken)(token);
    });
    test('should auto-expire tokens on retrieval', () => {
        const token = (0, refreshToken_service_1.generateRefreshToken)();
        const record = (0, refreshToken_service_1.storeRefreshToken)(token, testUserId, testDid);
        record.expiresAt = new Date(Date.now() - 1000);
        const result = (0, refreshToken_service_1.getRefreshToken)(token);
        expect(result).toBeNull();
    });
    test('should update lastUsed on retrieval', () => {
        const token = (0, refreshToken_service_1.generateRefreshToken)();
        (0, refreshToken_service_1.storeRefreshToken)(token, testUserId, testDid);
        const first = (0, refreshToken_service_1.getRefreshToken)(token);
        const firstLastUsed = first.lastUsed.getTime();
        const second = (0, refreshToken_service_1.getRefreshToken)(token);
        expect(second.lastUsed.getTime()).toBeGreaterThanOrEqual(firstLastUsed);
        (0, refreshToken_service_1.revokeRefreshToken)(token);
    });
    test('getRefreshTokenStats should return correct counts', () => {
        const token = (0, refreshToken_service_1.generateRefreshToken)();
        (0, refreshToken_service_1.storeRefreshToken)(token, 'stats-user', testDid);
        const stats = (0, refreshToken_service_1.getRefreshTokenStats)();
        expect(stats.total).toBeGreaterThanOrEqual(1);
        expect(stats.active).toBeGreaterThanOrEqual(1);
        expect(typeof stats.expired).toBe('number');
        (0, refreshToken_service_1.revokeRefreshToken)(token);
    });
    test('cleanupExpiredTokens should remove expired entries', () => {
        const token = (0, refreshToken_service_1.generateRefreshToken)();
        const record = (0, refreshToken_service_1.storeRefreshToken)(token, 'cleanup-user', testDid);
        record.expiresAt = new Date(Date.now() - 1000);
        const cleaned = (0, refreshToken_service_1.cleanupExpiredTokens)();
        expect(cleaned).toBeGreaterThanOrEqual(1);
    });
    test('should store device info when provided', () => {
        const token = (0, refreshToken_service_1.generateRefreshToken)();
        const record = (0, refreshToken_service_1.storeRefreshToken)(token, testUserId, testDid, 7, 'iPhone 15');
        expect(record.deviceInfo).toBe('iPhone 15');
        (0, refreshToken_service_1.revokeRefreshToken)(token);
    });
});
//# sourceMappingURL=refreshToken.service.test.js.map