"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const verifierProfiles_service_1 = require("../services/verifierProfiles.service");
describe('VerifierProfiles Service', () => {
    describe('Default profiles', () => {
        test('should have a default verifier profile', () => {
            const profile = (0, verifierProfiles_service_1.getDefaultVerifierProfile)();
            expect(profile).toBeDefined();
            expect(profile.verifierId).toBeDefined();
            expect(profile.active).toBe(true);
        });
        test('listVerifierProfiles should return active profiles', () => {
            const profiles = (0, verifierProfiles_service_1.listVerifierProfiles)();
            expect(profiles).toBeInstanceOf(Array);
            expect(profiles.length).toBeGreaterThanOrEqual(1);
            profiles.forEach((p) => expect(p.active).toBe(true));
        });
        test('listVerifierProfiles with includeInactive should return all', () => {
            const all = (0, verifierProfiles_service_1.listVerifierProfiles)({ includeInactive: true });
            const active = (0, verifierProfiles_service_1.listVerifierProfiles)();
            expect(all.length).toBeGreaterThanOrEqual(active.length);
        });
    });
    describe('getVerifierProfile', () => {
        test('should find default profile by ID', () => {
            const profile = (0, verifierProfiles_service_1.getVerifierProfile)('dtp_portal_primary');
            expect(profile).toBeDefined();
            expect(profile.verifierId).toBe('dtp_portal_primary');
        });
        test('should be case-insensitive', () => {
            const profile = (0, verifierProfiles_service_1.getVerifierProfile)('DTP_PORTAL_PRIMARY');
            expect(profile).toBeDefined();
        });
        test('should return undefined for unknown profile', () => {
            expect((0, verifierProfiles_service_1.getVerifierProfile)('nonexistent')).toBeUndefined();
        });
    });
    describe('findVerifierProfileByOrganization', () => {
        test('should find profile by org ID', () => {
            const profile = (0, verifierProfiles_service_1.findVerifierProfileByOrganization)('dtp_enterprise_001');
            expect(profile).toBeDefined();
            expect(profile.organizationId).toBe('dtp_enterprise_001');
        });
    });
    describe('upsertVerifierProfile', () => {
        test('should create a new profile', () => {
            const profile = (0, verifierProfiles_service_1.upsertVerifierProfile)({
                verifierId: 'test-verifier-001',
                organizationId: 'test-org-001',
                organizationName: 'Test Organization',
            });
            expect(profile.verifierId).toBe('test-verifier-001');
            expect(profile.organizationName).toBe('Test Organization');
            expect(profile.active).toBe(true);
        });
        test('should update existing profile on re-upsert', () => {
            const updated = (0, verifierProfiles_service_1.upsertVerifierProfile)({
                verifierId: 'test-verifier-001',
                organizationId: 'test-org-001',
                organizationName: 'Updated Org Name',
                policyVersion: 2,
            });
            expect(updated.organizationName).toBe('Updated Org Name');
            expect(updated.policyVersion).toBe(2);
        });
        test('should reject empty verifierId', () => {
            expect(() => (0, verifierProfiles_service_1.upsertVerifierProfile)({
                verifierId: '',
                organizationId: 'org',
                organizationName: 'name',
            })).toThrow('verifierId is required');
        });
        test('should reject empty organizationId', () => {
            expect(() => (0, verifierProfiles_service_1.upsertVerifierProfile)({
                verifierId: 'v',
                organizationId: '',
                organizationName: 'name',
            })).toThrow('organizationId is required');
        });
    });
    describe('updateVerifierProfile', () => {
        test('should update specific fields', () => {
            const updated = (0, verifierProfiles_service_1.updateVerifierProfile)('test-verifier-001', {
                organizationName: 'Final Org Name',
                requireCredential: true,
            });
            expect(updated.organizationName).toBe('Final Org Name');
            expect(updated.requireCredential).toBe(true);
        });
        test('should throw for unknown profile', () => {
            expect(() => (0, verifierProfiles_service_1.updateVerifierProfile)('nonexistent', { organizationName: 'X' })).toThrow('Unknown verifier profile');
        });
        test('should reject empty organizationName', () => {
            expect(() => (0, verifierProfiles_service_1.updateVerifierProfile)('test-verifier-001', { organizationName: '' })).toThrow('organizationName cannot be empty');
        });
    });
    describe('setVerifierProfileActive', () => {
        test('should deactivate a profile', () => {
            const result = (0, verifierProfiles_service_1.setVerifierProfileActive)('test-verifier-001', false);
            expect(result.active).toBe(false);
        });
        test('should reactivate a profile', () => {
            const result = (0, verifierProfiles_service_1.setVerifierProfileActive)('test-verifier-001', true);
            expect(result.active).toBe(true);
        });
    });
    describe('resetVerifierProfile', () => {
        test('should remove runtime override', () => {
            (0, verifierProfiles_service_1.upsertVerifierProfile)({
                verifierId: 'reset-test',
                organizationId: 'reset-org',
                organizationName: 'Reset Org',
            });
            const removed = (0, verifierProfiles_service_1.resetVerifierProfile)('reset-test');
            expect(removed).toBe(true);
        });
        test('should return false for non-overridden profile', () => {
            expect((0, verifierProfiles_service_1.resetVerifierProfile)('never-created')).toBe(false);
        });
    });
    describe('resolveVerifierProfile', () => {
        test('should return default when no input', () => {
            const profile = (0, verifierProfiles_service_1.resolveVerifierProfile)();
            expect(profile).toBeDefined();
            expect(profile.active).toBe(true);
        });
        test('should resolve by verifierId', () => {
            const profile = (0, verifierProfiles_service_1.resolveVerifierProfile)({ verifierId: 'dtp_portal_primary' });
            expect(profile.verifierId).toBe('dtp_portal_primary');
        });
        test('should resolve by organizationId', () => {
            const profile = (0, verifierProfiles_service_1.resolveVerifierProfile)({ organizationId: 'dtp_enterprise_001' });
            expect(profile.organizationId).toBe('dtp_enterprise_001');
        });
        test('should throw for unknown verifierId', () => {
            expect(() => (0, verifierProfiles_service_1.resolveVerifierProfile)({ verifierId: 'unknown' })).toThrow('Unknown verifier profile');
        });
    });
    describe('evaluateVerifierPolicy', () => {
        test('should allow valid request', () => {
            const profile = (0, verifierProfiles_service_1.getDefaultVerifierProfile)();
            const result = (0, verifierProfiles_service_1.evaluateVerifierPolicy)(profile, {
                badge: 'employee',
                requestType: 'portal_access',
                credentialProvided: false,
                credentialVerified: false,
            });
            expect(result.allowed).toBe(true);
            expect(result.policy).toBeDefined();
        });
        test('should deny disallowed badge', () => {
            const profile = (0, verifierProfiles_service_1.getVerifierProfile)('partner_portal_audit');
            const result = (0, verifierProfiles_service_1.evaluateVerifierPolicy)(profile, {
                badge: 'employee',
                requestType: 'portal_access',
                credentialProvided: true,
                credentialVerified: true,
            });
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('not allowed');
        });
        test('should deny missing credential when required', () => {
            const profile = (0, verifierProfiles_service_1.getVerifierProfile)('partner_portal_finance');
            const result = (0, verifierProfiles_service_1.evaluateVerifierPolicy)(profile, {
                badge: 'manager',
                requestType: 'portal_access',
                credentialProvided: false,
                credentialVerified: false,
            });
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('requires a credential');
        });
        test('should deny unverified credential when required', () => {
            const profile = (0, verifierProfiles_service_1.getVerifierProfile)('partner_portal_finance');
            const result = (0, verifierProfiles_service_1.evaluateVerifierPolicy)(profile, {
                badge: 'manager',
                requestType: 'portal_access',
                credentialProvided: true,
                credentialVerified: false,
            });
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('verified credential');
        });
        test('should deny unsupported request type', () => {
            const profile = (0, verifierProfiles_service_1.getVerifierProfile)('partner_portal_audit');
            const result = (0, verifierProfiles_service_1.evaluateVerifierPolicy)(profile, {
                badge: 'auditor',
                requestType: 'general_auth',
                credentialProvided: true,
                credentialVerified: true,
            });
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('does not allow request type');
        });
    });
    describe('resolveRequestedClaims', () => {
        test('should return claims for portal_access', () => {
            const profile = (0, verifierProfiles_service_1.getDefaultVerifierProfile)();
            const claims = (0, verifierProfiles_service_1.resolveRequestedClaims)(profile, 'portal_access');
            expect(claims).toBeInstanceOf(Array);
            expect(claims.length).toBeGreaterThan(0);
        });
        test('should return claims for general_auth', () => {
            const profile = (0, verifierProfiles_service_1.getDefaultVerifierProfile)();
            const claims = (0, verifierProfiles_service_1.resolveRequestedClaims)(profile, 'general_auth');
            expect(claims).toBeInstanceOf(Array);
            expect(claims.length).toBeGreaterThan(0);
        });
        test('should default to portal_access for undefined type', () => {
            const profile = (0, verifierProfiles_service_1.getDefaultVerifierProfile)();
            const claims = (0, verifierProfiles_service_1.resolveRequestedClaims)(profile);
            const portalClaims = (0, verifierProfiles_service_1.resolveRequestedClaims)(profile, 'portal_access');
            expect(claims).toEqual(portalClaims);
        });
    });
    describe('SUPPORTED_VERIFIER_CLAIM_KEYS', () => {
        test('should include all expected keys', () => {
            expect(verifierProfiles_service_1.SUPPORTED_VERIFIER_CLAIM_KEYS).toContain('subjectDid');
            expect(verifierProfiles_service_1.SUPPORTED_VERIFIER_CLAIM_KEYS).toContain('employeeId');
            expect(verifierProfiles_service_1.SUPPORTED_VERIFIER_CLAIM_KEYS).toContain('name');
            expect(verifierProfiles_service_1.SUPPORTED_VERIFIER_CLAIM_KEYS).toContain('role');
            expect(verifierProfiles_service_1.SUPPORTED_VERIFIER_CLAIM_KEYS).toContain('department');
            expect(verifierProfiles_service_1.SUPPORTED_VERIFIER_CLAIM_KEYS).toContain('email');
        });
    });
});
//# sourceMappingURL=verifierProfiles.service.test.js.map