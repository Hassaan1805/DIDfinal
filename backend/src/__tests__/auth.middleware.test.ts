import jwt from 'jsonwebtoken';
import {
  hasAdminClaims,
  getAdminAuthConfig,
  generateAdminToken,
  upgradeSessionToPremium,
  AdminJwtPayload,
} from '../middleware/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET!;

describe('Auth Middleware', () => {
  describe('hasAdminClaims', () => {
    test('should return true for explicit admin flag', () => {
      expect(hasAdminClaims({ admin: true })).toBe(true);
    });

    test('should return false when admin is false', () => {
      expect(hasAdminClaims({ admin: false })).toBe(false);
    });

    test('should return true for admin role', () => {
      expect(hasAdminClaims({ role: 'admin' })).toBe(true);
      expect(hasAdminClaims({ role: 'Admin' })).toBe(true);
    });

    test('should return true for admin badge', () => {
      expect(hasAdminClaims({ badge: 'admin' })).toBe(true);
    });

    test('should return false for non-admin role', () => {
      expect(hasAdminClaims({ role: 'employee' })).toBe(false);
    });

    test('should return true for users:manage permission', () => {
      expect(hasAdminClaims({ permissions: ['users:manage'] })).toBe(true);
    });

    test('should return true for badges:issue permission', () => {
      expect(hasAdminClaims({ permissions: ['badges:issue'] })).toBe(true);
    });

    test('should return true for admin:* permission', () => {
      expect(hasAdminClaims({ permissions: ['admin:*'] })).toBe(true);
    });

    test('should return true for admin:full permission', () => {
      expect(hasAdminClaims({ permissions: ['admin:full'] })).toBe(true);
    });

    test('should return false for non-admin permissions', () => {
      expect(hasAdminClaims({ permissions: ['dashboard:view', 'tasks:view'] })).toBe(false);
    });

    test('should return true for admin scope (string)', () => {
      expect(hasAdminClaims({ scope: 'admin' })).toBe(true);
    });

    test('should return true for admin scope (array)', () => {
      expect(hasAdminClaims({ scope: ['read', 'admin'] })).toBe(true);
    });

    test('should return false for empty payload', () => {
      expect(hasAdminClaims({})).toBe(false);
    });
  });

  describe('getAdminAuthConfig', () => {
    test('should return config with JWT secret', () => {
      const config = getAdminAuthConfig();
      expect(config.jwtSecret).toBeDefined();
      expect(config.jwtSecret.length).toBeGreaterThanOrEqual(32);
    });

    test('should include configured static tokens', () => {
      const config = getAdminAuthConfig();
      expect(config.staticTokens).toBeInstanceOf(Set);
      // The ADMIN_TOKEN from setup.ts is 42 chars, which is >= 32
      expect(config.staticTokens.size).toBeGreaterThanOrEqual(1);
    });

    test('should respect ADMIN_ALLOW_STATIC_TOKENS setting', () => {
      const config = getAdminAuthConfig();
      expect(typeof config.allowStaticTokens).toBe('boolean');
    });
  });

  describe('generateAdminToken', () => {
    test('should generate a valid JWT with admin claims', () => {
      const token = generateAdminToken();
      const decoded = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;

      expect(decoded.admin).toBe(true);
      expect(decoded.role).toBe('admin');
      expect(decoded.permissions).toContain('admin:*');
      expect(decoded.iss).toBe('decentralized-trust-platform');
      expect(decoded.sub).toBe('admin-session');
    });

    test('should allow custom payload overrides', () => {
      const token = generateAdminToken({
        employeeId: 'EMP001',
        address: '0x1234',
      });

      const decoded = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
      expect(decoded.employeeId).toBe('EMP001');
      expect(decoded.address).toBe('0x1234');
      expect(decoded.admin).toBe(true); // Should still have admin
    });

    test('generated token should pass hasAdminClaims', () => {
      const token = generateAdminToken();
      const decoded = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
      expect(hasAdminClaims(decoded)).toBe(true);
    });

    test('token should have 24h expiration', () => {
      const token = generateAdminToken();
      const decoded = jwt.decode(token) as any;

      const expectedExpiry = decoded.iat + 24 * 60 * 60;
      expect(decoded.exp).toBe(expectedExpiry);
    });
  });

  describe('upgradeSessionToPremium', () => {
    test('should return a valid premium JWT', () => {
      const token = upgradeSessionToPremium('0xTestAddress', 'challenge-123');
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      expect(decoded.address).toBe('0xTestAddress');
      expect(decoded.challengeId).toBe('challenge-123');
      expect(decoded.accessLevel).toBe('premium');
      expect(decoded.premiumGrantedAt).toBeDefined();
      expect(decoded.authenticated).toBe(true);
    });

    test('premium token should have correct issuer', () => {
      const token = upgradeSessionToPremium('0xAddr', 'ch-1');
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      expect(decoded.iss).toBe('decentralized-trust-platform');
      expect(decoded.sub).toBe('premium-session');
    });
  });
});
