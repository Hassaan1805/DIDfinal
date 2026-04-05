export const WALLET_CREDENTIAL_STORE_VERSION = 1 as const;

export type WalletCredentialSource = 'legacy-employee' | 'manual' | 'qr' | 'api';
export type WalletCredentialStatusHint = 'active' | 'expired' | 'unknown';

export interface WalletCredentialRecordV1 {
  schemaVersion: 1;
  recordId: string;
  credentialJwt: string;
  credentialId?: string;
  issuerDid?: string;
  subjectDid?: string;
  employeeId?: string;
  employeeName?: string;
  badge?: string;
  issuedAt?: string;
  expiresAt?: string;
  importedAt: string;
  updatedAt: string;
  source: WalletCredentialSource;
  statusHint: WalletCredentialStatusHint;
}

export interface WalletCredentialStoreV1 {
  version: 1;
  records: WalletCredentialRecordV1[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCredentialRecord(value: unknown): value is WalletCredentialRecordV1 {
  if (!isObject(value)) {
    return false;
  }

  return (
    value.schemaVersion === 1
    && typeof value.recordId === 'string'
    && typeof value.credentialJwt === 'string'
    && typeof value.importedAt === 'string'
    && typeof value.updatedAt === 'string'
    && typeof value.source === 'string'
    && typeof value.statusHint === 'string'
  );
}

export function sanitizeCredentialStore(value: unknown): WalletCredentialStoreV1 {
  if (!isObject(value) || value.version !== WALLET_CREDENTIAL_STORE_VERSION || !Array.isArray(value.records)) {
    return {
      version: WALLET_CREDENTIAL_STORE_VERSION,
      records: [],
    };
  }

  return {
    version: WALLET_CREDENTIAL_STORE_VERSION,
    records: value.records.filter(isCredentialRecord),
  };
}
