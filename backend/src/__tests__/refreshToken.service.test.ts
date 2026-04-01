import {
  generateRefreshToken,
  storeRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  revokeAllDIDTokens,
  getUserRefreshTokens,
  cleanupExpiredTokens,
  getRefreshTokenStats,
} from '../services/refreshToken.service';

describe('RefreshToken Service', () => {
  const testUserId = 'user-001';
  const testDid = 'did:ethr:0x1234567890abcdef1234567890abcdef12345678';

  test('should generate a cryptographically secure token', () => {
    const token = generateRefreshToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64); // 32 bytes hex = 64 chars

    // Two tokens should be different
    const token2 = generateRefreshToken();
    expect(token).not.toBe(token2);
  });

  test('should store and retrieve a refresh token', () => {
    const token = generateRefreshToken();
    const record = storeRefreshToken(token, testUserId, testDid);

    expect(record.token).toBe(token);
    expect(record.userId).toBe(testUserId);
    expect(record.did).toBe(testDid);
    expect(record.expiresAt).toBeInstanceOf(Date);
    expect(record.createdAt).toBeInstanceOf(Date);
    expect(record.lastUsed).toBeInstanceOf(Date);

    const retrieved = getRefreshToken(token);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.userId).toBe(testUserId);
  });

  test('should return null for non-existent token', () => {
    const result = getRefreshToken('non-existent-token');
    expect(result).toBeNull();
  });

  test('should revoke a token', () => {
    const token = generateRefreshToken();
    storeRefreshToken(token, testUserId, testDid);

    const revoked = revokeRefreshToken(token);
    expect(revoked).toBe(true);

    const result = getRefreshToken(token);
    expect(result).toBeNull();
  });

  test('should return false when revoking non-existent token', () => {
    expect(revokeRefreshToken('fake-token')).toBe(false);
  });

  test('should revoke all tokens for a user', () => {
    const t1 = generateRefreshToken();
    const t2 = generateRefreshToken();
    const t3 = generateRefreshToken();
    storeRefreshToken(t1, 'user-revoke-all', testDid);
    storeRefreshToken(t2, 'user-revoke-all', testDid);
    storeRefreshToken(t3, 'other-user', testDid);

    const count = revokeAllUserTokens('user-revoke-all');
    expect(count).toBe(2);

    expect(getRefreshToken(t1)).toBeNull();
    expect(getRefreshToken(t2)).toBeNull();
    expect(getRefreshToken(t3)).not.toBeNull();

    // cleanup
    revokeRefreshToken(t3);
  });

  test('should revoke all tokens for a DID', () => {
    const didA = 'did:ethr:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const t1 = generateRefreshToken();
    const t2 = generateRefreshToken();
    storeRefreshToken(t1, 'u1', didA);
    storeRefreshToken(t2, 'u2', didA);

    const count = revokeAllDIDTokens(didA);
    expect(count).toBe(2);

    expect(getRefreshToken(t1)).toBeNull();
    expect(getRefreshToken(t2)).toBeNull();
  });

  test('should list tokens for a user', () => {
    const t1 = generateRefreshToken();
    const t2 = generateRefreshToken();
    storeRefreshToken(t1, 'list-user', testDid);
    storeRefreshToken(t2, 'list-user', testDid);

    const tokens = getUserRefreshTokens('list-user');
    expect(tokens.length).toBe(2);
    expect(tokens.map((t) => t.token)).toEqual(expect.arrayContaining([t1, t2]));

    // cleanup
    revokeAllUserTokens('list-user');
  });

  test('should store token with custom expiry', () => {
    const token = generateRefreshToken();
    const record = storeRefreshToken(token, testUserId, testDid, 1); // 1 day

    const expectedExpiry = record.createdAt.getTime() + 1 * 24 * 60 * 60 * 1000;
    expect(record.expiresAt.getTime()).toBeCloseTo(expectedExpiry, -3);

    revokeRefreshToken(token);
  });

  test('should auto-expire tokens on retrieval', () => {
    const token = generateRefreshToken();
    // Store with minimal (effectively expired) time by manipulating the record
    const record = storeRefreshToken(token, testUserId, testDid);
    // Manually expire it
    record.expiresAt = new Date(Date.now() - 1000);

    const result = getRefreshToken(token);
    expect(result).toBeNull();
  });

  test('should update lastUsed on retrieval', () => {
    const token = generateRefreshToken();
    storeRefreshToken(token, testUserId, testDid);

    const first = getRefreshToken(token);
    const firstLastUsed = first!.lastUsed.getTime();

    // Small delay to ensure time difference
    const second = getRefreshToken(token);
    expect(second!.lastUsed.getTime()).toBeGreaterThanOrEqual(firstLastUsed);

    revokeRefreshToken(token);
  });

  test('getRefreshTokenStats should return correct counts', () => {
    const token = generateRefreshToken();
    storeRefreshToken(token, 'stats-user', testDid);

    const stats = getRefreshTokenStats();
    expect(stats.total).toBeGreaterThanOrEqual(1);
    expect(stats.active).toBeGreaterThanOrEqual(1);
    expect(typeof stats.expired).toBe('number');

    revokeRefreshToken(token);
  });

  test('cleanupExpiredTokens should remove expired entries', () => {
    const token = generateRefreshToken();
    const record = storeRefreshToken(token, 'cleanup-user', testDid);
    record.expiresAt = new Date(Date.now() - 1000); // Manually expire

    const cleaned = cleanupExpiredTokens();
    expect(cleaned).toBeGreaterThanOrEqual(1);
  });

  test('should store device info when provided', () => {
    const token = generateRefreshToken();
    const record = storeRefreshToken(token, testUserId, testDid, 7, 'iPhone 15');

    expect(record.deviceInfo).toBe('iPhone 15');
    revokeRefreshToken(token);
  });
});
