import {
  getDefaultVerifierProfile,
  getVerifierProfile,
  listVerifierProfiles,
  upsertVerifierProfile,
  updateVerifierProfile,
  resetVerifierProfile,
  resolveVerifierProfile,
  evaluateVerifierPolicy,
  resolveRequestedClaims,
  findVerifierProfileByOrganization,
  setVerifierProfileActive,
  SUPPORTED_VERIFIER_CLAIM_KEYS,
} from '../services/verifierProfiles.service';

describe('VerifierProfiles Service', () => {
  describe('Default profiles', () => {
    test('should have a default verifier profile', () => {
      const profile = getDefaultVerifierProfile();
      expect(profile).toBeDefined();
      expect(profile.verifierId).toBeDefined();
      expect(profile.active).toBe(true);
    });

    test('listVerifierProfiles should return active profiles', () => {
      const profiles = listVerifierProfiles();
      expect(profiles).toBeInstanceOf(Array);
      expect(profiles.length).toBeGreaterThanOrEqual(1);

      profiles.forEach((p) => expect(p.active).toBe(true));
    });

    test('listVerifierProfiles with includeInactive should return all', () => {
      const all = listVerifierProfiles({ includeInactive: true });
      const active = listVerifierProfiles();
      expect(all.length).toBeGreaterThanOrEqual(active.length);
    });
  });

  describe('getVerifierProfile', () => {
    test('should find default profile by ID', () => {
      const profile = getVerifierProfile('dtp_portal_primary');
      expect(profile).toBeDefined();
      expect(profile!.verifierId).toBe('dtp_portal_primary');
    });

    test('should be case-insensitive', () => {
      const profile = getVerifierProfile('DTP_PORTAL_PRIMARY');
      expect(profile).toBeDefined();
    });

    test('should return undefined for unknown profile', () => {
      expect(getVerifierProfile('nonexistent')).toBeUndefined();
    });
  });

  describe('findVerifierProfileByOrganization', () => {
    test('should find profile by org ID', () => {
      const profile = findVerifierProfileByOrganization('dtp_enterprise_001');
      expect(profile).toBeDefined();
      expect(profile!.organizationId).toBe('dtp_enterprise_001');
    });
  });

  describe('upsertVerifierProfile', () => {
    test('should create a new profile', () => {
      const profile = upsertVerifierProfile({
        verifierId: 'test-verifier-001',
        organizationId: 'test-org-001',
        organizationName: 'Test Organization',
      });

      expect(profile.verifierId).toBe('test-verifier-001');
      expect(profile.organizationName).toBe('Test Organization');
      expect(profile.active).toBe(true);
    });

    test('should update existing profile on re-upsert', () => {
      const updated = upsertVerifierProfile({
        verifierId: 'test-verifier-001',
        organizationId: 'test-org-001',
        organizationName: 'Updated Org Name',
        policyVersion: 2,
      });

      expect(updated.organizationName).toBe('Updated Org Name');
      expect(updated.policyVersion).toBe(2);
    });

    test('should reject empty verifierId', () => {
      expect(() =>
        upsertVerifierProfile({
          verifierId: '',
          organizationId: 'org',
          organizationName: 'name',
        })
      ).toThrow('verifierId is required');
    });

    test('should reject empty organizationId', () => {
      expect(() =>
        upsertVerifierProfile({
          verifierId: 'v',
          organizationId: '',
          organizationName: 'name',
        })
      ).toThrow('organizationId is required');
    });
  });

  describe('updateVerifierProfile', () => {
    test('should update specific fields', () => {
      const updated = updateVerifierProfile('test-verifier-001', {
        organizationName: 'Final Org Name',
        requireCredential: true,
      });

      expect(updated.organizationName).toBe('Final Org Name');
      expect(updated.requireCredential).toBe(true);
    });

    test('should throw for unknown profile', () => {
      expect(() =>
        updateVerifierProfile('nonexistent', { organizationName: 'X' })
      ).toThrow('Unknown verifier profile');
    });

    test('should reject empty organizationName', () => {
      expect(() =>
        updateVerifierProfile('test-verifier-001', { organizationName: '' })
      ).toThrow('organizationName cannot be empty');
    });
  });

  describe('setVerifierProfileActive', () => {
    test('should deactivate a profile', () => {
      const result = setVerifierProfileActive('test-verifier-001', false);
      expect(result.active).toBe(false);
    });

    test('should reactivate a profile', () => {
      const result = setVerifierProfileActive('test-verifier-001', true);
      expect(result.active).toBe(true);
    });
  });

  describe('resetVerifierProfile', () => {
    test('should remove runtime override', () => {
      upsertVerifierProfile({
        verifierId: 'reset-test',
        organizationId: 'reset-org',
        organizationName: 'Reset Org',
      });

      const removed = resetVerifierProfile('reset-test');
      expect(removed).toBe(true);
    });

    test('should return false for non-overridden profile', () => {
      expect(resetVerifierProfile('never-created')).toBe(false);
    });
  });

  describe('resolveVerifierProfile', () => {
    test('should return default when no input', () => {
      const profile = resolveVerifierProfile();
      expect(profile).toBeDefined();
      expect(profile.active).toBe(true);
    });

    test('should resolve by verifierId', () => {
      const profile = resolveVerifierProfile({ verifierId: 'dtp_portal_primary' });
      expect(profile.verifierId).toBe('dtp_portal_primary');
    });

    test('should resolve by organizationId', () => {
      const profile = resolveVerifierProfile({ organizationId: 'dtp_enterprise_001' });
      expect(profile.organizationId).toBe('dtp_enterprise_001');
    });

    test('should throw for unknown verifierId', () => {
      expect(() => resolveVerifierProfile({ verifierId: 'unknown' })).toThrow(
        'Unknown verifier profile'
      );
    });
  });

  describe('evaluateVerifierPolicy', () => {
    test('should allow valid request', () => {
      const profile = getDefaultVerifierProfile();
      const result = evaluateVerifierPolicy(profile, {
        badge: 'employee',
        requestType: 'portal_access',
        credentialProvided: false,
        credentialVerified: false,
      });

      expect(result.allowed).toBe(true);
      expect(result.policy).toBeDefined();
    });

    test('should deny disallowed badge', () => {
      // Partner audit only allows auditor and admin
      const profile = getVerifierProfile('partner_portal_audit')!;
      const result = evaluateVerifierPolicy(profile, {
        badge: 'employee',
        requestType: 'portal_access',
        credentialProvided: true,
        credentialVerified: true,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not allowed');
    });

    test('should deny missing credential when required', () => {
      const profile = getVerifierProfile('partner_portal_finance')!;
      const result = evaluateVerifierPolicy(profile, {
        badge: 'manager',
        requestType: 'portal_access',
        credentialProvided: false,
        credentialVerified: false,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('requires a credential');
    });

    test('should deny unverified credential when required', () => {
      const profile = getVerifierProfile('partner_portal_finance')!;
      const result = evaluateVerifierPolicy(profile, {
        badge: 'manager',
        requestType: 'portal_access',
        credentialProvided: true,
        credentialVerified: false,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('verified credential');
    });

    test('should deny unsupported request type', () => {
      const profile = getVerifierProfile('partner_portal_audit')!;
      const result = evaluateVerifierPolicy(profile, {
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
      const profile = getDefaultVerifierProfile();
      const claims = resolveRequestedClaims(profile, 'portal_access');

      expect(claims).toBeInstanceOf(Array);
      expect(claims.length).toBeGreaterThan(0);
    });

    test('should return claims for general_auth', () => {
      const profile = getDefaultVerifierProfile();
      const claims = resolveRequestedClaims(profile, 'general_auth');

      expect(claims).toBeInstanceOf(Array);
      expect(claims.length).toBeGreaterThan(0);
    });

    test('should default to portal_access for undefined type', () => {
      const profile = getDefaultVerifierProfile();
      const claims = resolveRequestedClaims(profile);
      const portalClaims = resolveRequestedClaims(profile, 'portal_access');

      expect(claims).toEqual(portalClaims);
    });
  });

  describe('SUPPORTED_VERIFIER_CLAIM_KEYS', () => {
    test('should include all expected keys', () => {
      expect(SUPPORTED_VERIFIER_CLAIM_KEYS).toContain('subjectDid');
      expect(SUPPORTED_VERIFIER_CLAIM_KEYS).toContain('employeeId');
      expect(SUPPORTED_VERIFIER_CLAIM_KEYS).toContain('name');
      expect(SUPPORTED_VERIFIER_CLAIM_KEYS).toContain('role');
      expect(SUPPORTED_VERIFIER_CLAIM_KEYS).toContain('department');
      expect(SUPPORTED_VERIFIER_CLAIM_KEYS).toContain('email');
    });
  });
});
