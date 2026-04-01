export type CredentialLifecycleStatus = 'active' | 'revoked' | 'expired' | 'unknown';

// ── Credential delivery store ──────────────────────────────────────────────────
// Holds the latest issued credential JWT per subject DID so wallets can fetch it.
interface IssuedCredentialDelivery {
  jwt: string;
  credentialId: string;
  employeeId: string;
  issuedAt: string;
  expiresAt: string;
}

const deliveryStore = new Map<string, IssuedCredentialDelivery>();

export function storeIssuedCredentialJwt(input: {
  subjectDid: string;
  jwt: string;
  credentialId: string;
  employeeId: string;
  issuedAt: string;
  expiresAt: string;
}): void {
  deliveryStore.set(input.subjectDid.toLowerCase(), {
    jwt: input.jwt,
    credentialId: input.credentialId,
    employeeId: input.employeeId,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
  });
}

export function getLatestCredentialJwtForDid(did: string): IssuedCredentialDelivery | undefined {
  return deliveryStore.get(did.toLowerCase());
}
// ─────────────────────────────────────────────────────────────────────────────

export interface CredentialRegistryRecord {
  credentialId: string;
  issuer?: string;
  subjectDid?: string;
  issuedAt?: string;
  expiresAt?: string;
  revoked: boolean;
  revokedAt?: string;
  revokedReason?: string;
  revokedBy?: string;
}

export interface CredentialStatusEvaluation {
  credentialId: string | null;
  status: CredentialLifecycleStatus;
  foundInRegistry: boolean;
  revoked: boolean;
  reason?: string;
  record?: CredentialRegistryRecord;
}

export interface CredentialStatusPolicy {
  requireCredentialId: boolean;
  strictStatusCheck: boolean;
}

const registry = new Map<string, CredentialRegistryRecord>();

function normalizeCredentialId(credentialId: string): string {
  return credentialId.trim();
}

function parseBooleanFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

export function getCredentialStatusPolicy(): CredentialStatusPolicy {
  return {
    requireCredentialId: parseBooleanFlag(process.env.VC_REQUIRE_CREDENTIAL_ID, false),
    strictStatusCheck: parseBooleanFlag(process.env.VC_STRICT_STATUS_CHECK, false),
  };
}

export function registerIssuedCredential(input: {
  credentialId: string;
  issuer?: string;
  subjectDid?: string;
  issuedAt?: string;
  expiresAt?: string;
}): CredentialRegistryRecord {
  const credentialId = normalizeCredentialId(input.credentialId);
  const existing = registry.get(credentialId);

  const nextRecord: CredentialRegistryRecord = {
    credentialId,
    issuer: input.issuer,
    subjectDid: input.subjectDid,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    revoked: existing?.revoked || false,
    revokedAt: existing?.revokedAt,
    revokedReason: existing?.revokedReason,
    revokedBy: existing?.revokedBy,
  };

  registry.set(credentialId, nextRecord);
  return nextRecord;
}

export function revokeCredential(input: {
  credentialId: string;
  reason?: string;
  revokedBy?: string;
}): CredentialRegistryRecord {
  const credentialId = normalizeCredentialId(input.credentialId);
  const existing = registry.get(credentialId);

  const updated: CredentialRegistryRecord = {
    credentialId,
    issuer: existing?.issuer,
    subjectDid: existing?.subjectDid,
    issuedAt: existing?.issuedAt,
    expiresAt: existing?.expiresAt,
    revoked: true,
    revokedAt: new Date().toISOString(),
    revokedReason: input.reason,
    revokedBy: input.revokedBy,
  };

  registry.set(credentialId, updated);
  return updated;
}

export function getCredentialStatus(credentialId?: string | null): CredentialStatusEvaluation {
  if (!credentialId || !credentialId.trim()) {
    return {
      credentialId: null,
      status: 'unknown',
      foundInRegistry: false,
      revoked: false,
      reason: 'Credential ID missing',
    };
  }

  const normalizedCredentialId = normalizeCredentialId(credentialId);
  const record = registry.get(normalizedCredentialId);
  if (!record) {
    return {
      credentialId: normalizedCredentialId,
      status: 'unknown',
      foundInRegistry: false,
      revoked: false,
      reason: 'Credential not found in registry',
    };
  }

  if (record.revoked) {
    return {
      credentialId: normalizedCredentialId,
      status: 'revoked',
      foundInRegistry: true,
      revoked: true,
      reason: record.revokedReason || 'Credential has been revoked',
      record,
    };
  }

  if (record.expiresAt && Date.now() > Date.parse(record.expiresAt)) {
    return {
      credentialId: normalizedCredentialId,
      status: 'expired',
      foundInRegistry: true,
      revoked: false,
      reason: 'Credential expired in registry',
      record,
    };
  }

  return {
    credentialId: normalizedCredentialId,
    status: 'active',
    foundInRegistry: true,
    revoked: false,
    record,
  };
}
