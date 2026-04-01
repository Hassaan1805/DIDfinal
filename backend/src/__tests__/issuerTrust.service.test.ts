import { getIssuerTrustPolicy, evaluateIssuerTrust } from '../services/issuerTrust.service';

describe('IssuerTrust Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getIssuerTrustPolicy', () => {
    test('should return default policy when no env vars set', () => {
      delete process.env.COMPANY_DID;
      delete process.env.TRUSTED_ISSUER_DIDS;
      delete process.env.VC_STRICT_ISSUER_TRUST;

      const policy = getIssuerTrustPolicy();
      expect(policy.companyDid).toBeDefined();
      expect(policy.trustedIssuers).toContain(policy.companyDid);
      expect(policy.strictIssuerTrust).toBe(true); // default
    });

    test('should use COMPANY_DID from env', () => {
      process.env.COMPANY_DID = 'did:ethr:0xCustomCompanyDid1234567890abcdef12345678';

      const policy = getIssuerTrustPolicy();
      expect(policy.companyDid).toBe('did:ethr:0xCustomCompanyDid1234567890abcdef12345678');
    });

    test('should include additional trusted issuers from env', () => {
      process.env.TRUSTED_ISSUER_DIDS = 'did:ethr:0xExtra1,did:ethr:0xExtra2';

      const policy = getIssuerTrustPolicy();
      expect(policy.trustedIssuers).toContain('did:ethr:0xExtra1');
      expect(policy.trustedIssuers).toContain('did:ethr:0xExtra2');
    });

    test('should deduplicate trusted issuers', () => {
      const companyDid = 'did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      process.env.COMPANY_DID = companyDid;
      process.env.TRUSTED_ISSUER_DIDS = companyDid;

      const policy = getIssuerTrustPolicy();
      const count = policy.trustedIssuers.filter((i) => i === companyDid).length;
      expect(count).toBe(1);
    });

    test('should toggle strict mode via env var', () => {
      process.env.VC_STRICT_ISSUER_TRUST = 'false';
      expect(getIssuerTrustPolicy().strictIssuerTrust).toBe(false);

      process.env.VC_STRICT_ISSUER_TRUST = 'true';
      expect(getIssuerTrustPolicy().strictIssuerTrust).toBe(true);

      process.env.VC_STRICT_ISSUER_TRUST = '0';
      expect(getIssuerTrustPolicy().strictIssuerTrust).toBe(false);

      process.env.VC_STRICT_ISSUER_TRUST = '1';
      expect(getIssuerTrustPolicy().strictIssuerTrust).toBe(true);
    });
  });

  describe('evaluateIssuerTrust', () => {
    test('should trust the company DID', () => {
      const policy = getIssuerTrustPolicy();
      const evaluation = evaluateIssuerTrust(policy.companyDid);

      expect(evaluation.issuerTrusted).toBe(true);
      expect(evaluation.issuer).toBe(policy.companyDid);
    });

    test('should not trust an unknown issuer', () => {
      const evaluation = evaluateIssuerTrust('did:ethr:0xUnknownIssuer1234567890abcdef12345678');

      expect(evaluation.issuerTrusted).toBe(false);
    });

    test('should normalize DID comparison (case-insensitive)', () => {
      const policy = getIssuerTrustPolicy();
      const upperDid = policy.companyDid.toUpperCase();

      const evaluation = evaluateIssuerTrust(upperDid);
      expect(evaluation.issuerTrusted).toBe(true);
    });

    test('should include policy metadata in evaluation', () => {
      const evaluation = evaluateIssuerTrust('did:ethr:0xAny');
      expect(evaluation.issuerNormalized).toBeDefined();
      expect(evaluation.trustedIssuers).toBeDefined();
      expect(typeof evaluation.strictIssuerTrust).toBe('boolean');
    });
  });
});
