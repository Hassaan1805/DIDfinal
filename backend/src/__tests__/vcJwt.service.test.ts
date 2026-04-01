import { issueEmploymentVcJwt } from '../services/vcJwt.service';
import jwt from 'jsonwebtoken';

describe('VC-JWT Service', () => {
  const validInput = {
    issuerDid: 'did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    subjectDid: 'did:ethr:0x1234567890abcdef1234567890abcdef12345678',
    employeeId: 'EMP001',
    name: 'Test Employee',
    badge: 'admin',
    permissions: ['dashboard:view', 'users:manage'],
    hashId: 'abc123hash',
    didRegistrationTxHash: '0xdeadbeef',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  };

  test('should issue a valid VC-JWT', () => {
    const result = issueEmploymentVcJwt(validInput);

    expect(result.credentialId).toMatch(/^urn:uuid:/);
    expect(result.issuanceDate).toBeDefined();
    expect(result.expirationDate).toBe(validInput.expiresAt);
    expect(result.jwt).toBeDefined();
    expect(typeof result.jwt).toBe('string');
  });

  test('should produce a decodable JWT with correct claims', () => {
    const result = issueEmploymentVcJwt(validInput);
    const decoded = jwt.decode(result.jwt) as any;

    expect(decoded).not.toBeNull();
    expect(decoded.iss).toBe(validInput.issuerDid);
    expect(decoded.sub).toBe(validInput.subjectDid);
    expect(decoded.jti).toBe(result.credentialId);
    expect(decoded.vc).toBeDefined();
    expect(decoded.vc.type).toContain('VerifiableCredential');
    expect(decoded.vc.type).toContain('EmploymentCredential');
  });

  test('should include credential subject data', () => {
    const result = issueEmploymentVcJwt(validInput);
    const decoded = jwt.decode(result.jwt) as any;

    const subject = decoded.vc.credentialSubject;
    expect(subject.id).toBe(validInput.subjectDid);
    expect(subject.employeeId).toBe('EMP001');
    expect(subject.name).toBe('Test Employee');
    expect(subject.badge).toBe('admin');
    expect(subject.permissions).toEqual(['dashboard:view', 'users:manage']);
    expect(subject.hashId).toBe('abc123hash');
  });

  test('should include W3C VC context', () => {
    const result = issueEmploymentVcJwt(validInput);
    const decoded = jwt.decode(result.jwt) as any;

    expect(decoded.vc['@context']).toContain('https://www.w3.org/2018/credentials/v1');
  });

  test('should set correct expiration', () => {
    const result = issueEmploymentVcJwt(validInput);
    const decoded = jwt.decode(result.jwt) as any;

    const expectedExp = Math.floor(new Date(validInput.expiresAt).getTime() / 1000);
    expect(decoded.exp).toBe(expectedExp);
  });

  test('should generate unique credential IDs', () => {
    const r1 = issueEmploymentVcJwt(validInput);
    const r2 = issueEmploymentVcJwt(validInput);

    expect(r1.credentialId).not.toBe(r2.credentialId);
    expect(r1.jwt).not.toBe(r2.jwt);
  });

  test('JWT should be verifiable with the correct secret', () => {
    const result = issueEmploymentVcJwt(validInput);
    const secret = process.env.JWT_SECRET!;

    const verified = jwt.verify(result.jwt, secret) as any;
    expect(verified.iss).toBe(validInput.issuerDid);
    expect(verified.vc).toBeDefined();
  });
});
