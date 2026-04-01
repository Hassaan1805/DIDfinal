"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const JWT_SECRET = process.env.JWT_SECRET;
describe('Auth Middleware', () => {
    describe('hasAdminClaims', () => {
        test('should return true for explicit admin flag', () => {
            expect((0, auth_middleware_1.hasAdminClaims)({ admin: true })).toBe(true);
        });
        test('should return false when admin is false', () => {
            expect((0, auth_middleware_1.hasAdminClaims)({ admin: false })).toBe(false);
        });
        test('should return true for admin role', () => {
            expect((0, auth_middleware_1.hasAdminClaims)({ role: 'admin' })).toBe(true);
            expect((0, auth_middleware_1.hasAdminClaims)({ role: 'Admin' })).toBe(true);
        });
        test('should return true for admin badge', () => {
            expect((0, auth_middleware_1.hasAdminClaims)({ badge: 'admin' })).toBe(true);
        });
        test('should return false for non-admin role', () => {
            expect((0, auth_middleware_1.hasAdminClaims)({ role: 'employee' })).toBe(false);
        });
        test('should return true for users:manage permission', () => {
            expect((0, auth_middleware_1.hasAdminClaims)({ permissions: ['users:manage'] })).toBe(true);
        });
        test('should return true for badges:issue permission', () => {
            expect((0, auth_middleware_1.hasAdminClaims)({ permissions: ['badges:issue'] })).toBe(true);
        });
        test('should return true for admin:* permission', () => {
            expect((0, auth_middleware_1.hasAdminClaims)({ permissions: ['admin:*'] })).toBe(true);
        });
        test('should return true for admin:full permission', () => {
            expect((0, auth_middleware_1.hasAdminClaims)({ permissions: ['admin:full'] })).toBe(true);
        });
        test('should return false for non-admin permissions', () => {
            expect((0, auth_middleware_1.hasAdminClaims)({ permissions: ['dashboard:view', 'tasks:view'] })).toBe(false);
        });
        test('should return true for admin scope (string)', () => {
            expect((0, auth_middleware_1.hasAdminClaims)({ scope: 'admin' })).toBe(true);
        });
        test('should return true for admin scope (array)', () => {
            expect((0, auth_middleware_1.hasAdminClaims)({ scope: ['read', 'admin'] })).toBe(true);
        });
        test('should return false for empty payload', () => {
            expect((0, auth_middleware_1.hasAdminClaims)({})).toBe(false);
        });
    });
    describe('getAdminAuthConfig', () => {
        test('should return config with JWT secret', () => {
            const config = (0, auth_middleware_1.getAdminAuthConfig)();
            expect(config.jwtSecret).toBeDefined();
            expect(config.jwtSecret.length).toBeGreaterThanOrEqual(32);
        });
        test('should include configured static tokens', () => {
            const config = (0, auth_middleware_1.getAdminAuthConfig)();
            expect(config.staticTokens).toBeInstanceOf(Set);
            expect(config.staticTokens.size).toBeGreaterThanOrEqual(1);
        });
        test('should respect ADMIN_ALLOW_STATIC_TOKENS setting', () => {
            const config = (0, auth_middleware_1.getAdminAuthConfig)();
            expect(typeof config.allowStaticTokens).toBe('boolean');
        });
    });
    describe('generateAdminToken', () => {
        test('should generate a valid JWT with admin claims', () => {
            const token = (0, auth_middleware_1.generateAdminToken)();
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            expect(decoded.admin).toBe(true);
            expect(decoded.role).toBe('admin');
            expect(decoded.permissions).toContain('admin:*');
            expect(decoded.iss).toBe('decentralized-trust-platform');
            expect(decoded.sub).toBe('admin-session');
        });
        test('should allow custom payload overrides', () => {
            const token = (0, auth_middleware_1.generateAdminToken)({
                employeeId: 'EMP001',
                address: '0x1234',
            });
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            expect(decoded.employeeId).toBe('EMP001');
            expect(decoded.address).toBe('0x1234');
            expect(decoded.admin).toBe(true);
        });
        test('generated token should pass hasAdminClaims', () => {
            const token = (0, auth_middleware_1.generateAdminToken)();
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            expect((0, auth_middleware_1.hasAdminClaims)(decoded)).toBe(true);
        });
        test('token should have 24h expiration', () => {
            const token = (0, auth_middleware_1.generateAdminToken)();
            const decoded = jsonwebtoken_1.default.decode(token);
            const expectedExpiry = decoded.iat + 24 * 60 * 60;
            expect(decoded.exp).toBe(expectedExpiry);
        });
    });
    describe('upgradeSessionToPremium', () => {
        test('should return a valid premium JWT', () => {
            const token = (0, auth_middleware_1.upgradeSessionToPremium)('0xTestAddress', 'challenge-123');
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            expect(decoded.address).toBe('0xTestAddress');
            expect(decoded.challengeId).toBe('challenge-123');
            expect(decoded.accessLevel).toBe('premium');
            expect(decoded.premiumGrantedAt).toBeDefined();
            expect(decoded.authenticated).toBe(true);
        });
        test('premium token should have correct issuer', () => {
            const token = (0, auth_middleware_1.upgradeSessionToPremium)('0xAddr', 'ch-1');
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            expect(decoded.iss).toBe('decentralized-trust-platform');
            expect(decoded.sub).toBe('premium-session');
        });
    });
});
//# sourceMappingURL=auth.middleware.test.js.map