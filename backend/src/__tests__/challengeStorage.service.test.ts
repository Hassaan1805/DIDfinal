import {
  initializeChallengeStorage,
  getChallengeStorage,
  setChallenge,
  getChallenge,
  deleteChallenge,
  getAllChallengeIds,
  AuthChallenge,
} from '../services/challengeStorage.service';

describe('ChallengeStorage Service (In-Memory)', () => {
  beforeEach(() => {
    process.env.CHALLENGE_STORAGE_TYPE = 'memory';
    initializeChallengeStorage();
  });

  const makeChallengeData = (overrides?: Partial<AuthChallenge>): AuthChallenge => ({
    challenge: 'test-challenge-string',
    timestamp: Date.now(),
    used: false,
    ...overrides,
  });

  test('should store and retrieve a challenge', async () => {
    const data = makeChallengeData();
    await setChallenge('ch-1', data);

    const result = await getChallenge('ch-1');
    expect(result).not.toBeNull();
    expect(result!.challenge).toBe('test-challenge-string');
    expect(result!.used).toBe(false);
  });

  test('should return null for non-existent challenge', async () => {
    const result = await getChallenge('does-not-exist');
    expect(result).toBeNull();
  });

  test('should delete a challenge', async () => {
    await setChallenge('ch-2', makeChallengeData());
    await deleteChallenge('ch-2');

    const result = await getChallenge('ch-2');
    expect(result).toBeNull();
  });

  test('should list all challenge IDs', async () => {
    await setChallenge('a', makeChallengeData());
    await setChallenge('b', makeChallengeData());
    await setChallenge('c', makeChallengeData());

    const keys = await getAllChallengeIds();
    expect(keys).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    expect(keys.length).toBe(3);
  });

  test('should overwrite existing challenge with same ID', async () => {
    await setChallenge('ch-3', makeChallengeData({ used: false }));
    await setChallenge('ch-3', makeChallengeData({ used: true }));

    const result = await getChallenge('ch-3');
    expect(result!.used).toBe(true);
  });

  test('should store challenge with full metadata', async () => {
    const fullChallenge = makeChallengeData({
      userAddress: '0x1234567890abcdef1234567890abcdef12345678',
      did: 'did:ethr:0x1234567890abcdef1234567890abcdef12345678',
      employeeId: 'EMP001',
      badge: 'admin',
      permissions: ['dashboard:view', 'users:manage'],
    });
    await setChallenge('ch-full', fullChallenge);

    const result = await getChallenge('ch-full');
    expect(result!.userAddress).toBe('0x1234567890abcdef1234567890abcdef12345678');
    expect(result!.employeeId).toBe('EMP001');
    expect(result!.badge).toBe('admin');
    expect(result!.permissions).toEqual(['dashboard:view', 'users:manage']);
  });

  test('getChallengeStorage should return a ready storage', () => {
    const storage = getChallengeStorage();
    expect(storage.isReady()).toBe(true);
  });

  test('should handle TTL-based auto-expiration', async () => {
    await setChallenge('ch-ttl', makeChallengeData(), 1); // 1 second TTL

    const immediate = await getChallenge('ch-ttl');
    expect(immediate).not.toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const expired = await getChallenge('ch-ttl');
    expect(expired).toBeNull();
  }, 5000);
});
