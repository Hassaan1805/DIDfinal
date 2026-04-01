import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;
const VC_CONTEXT = ['https://www.w3.org/2018/credentials/v1'];
const VC_TYPES = ['VerifiableCredential', 'EmploymentCredential'];

export interface EmploymentVcInput {
  issuerDid: string;
  subjectDid: string;
  employeeId: string;
  name: string;
  badge: string;
  permissions: string[];
  hashId: string;
  didRegistrationTxHash: string;
  expiresAt: string;
}

export interface EmploymentVcJwtResult {
  credentialId: string;
  issuanceDate: string;
  expirationDate: string;
  jwt: string;
}

export function issueEmploymentVcJwt(input: EmploymentVcInput): EmploymentVcJwtResult {
  const issuanceDate = new Date().toISOString();
  const credentialId = `urn:uuid:${randomUUID()}`;
  const expirationEpoch = Math.floor(new Date(input.expiresAt).getTime() / 1000);

  const payload = {
    iss: input.issuerDid,
    sub: input.subjectDid,
    jti: credentialId,
    nbf: Math.floor(Date.now() / 1000),
    exp: expirationEpoch,
    vc: {
      '@context': VC_CONTEXT,
      type: VC_TYPES,
      id: credentialId,
      issuer: input.issuerDid,
      issuanceDate,
      expirationDate: input.expiresAt,
      credentialSubject: {
        id: input.subjectDid,
        employeeId: input.employeeId,
        name: input.name,
        badge: input.badge,
        permissions: input.permissions,
        hashId: input.hashId,
        didRegistrationTxHash: input.didRegistrationTxHash,
      },
    },
  };

  const credentialJwt = jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
  });

  return {
    credentialId,
    issuanceDate,
    expirationDate: input.expiresAt,
    jwt: credentialJwt,
  };
}
