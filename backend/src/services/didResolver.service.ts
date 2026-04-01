import { sepoliaService } from './SepoliaService';

const DID_ETHR_REGEX = /^did:ethr:(0x[a-fA-F0-9]{40})$/;

export interface ResolvedDidDocument {
  '@context': string[];
  id: string;
  verificationMethod: Array<{
    id: string;
    type: string;
    controller: string;
    blockchainAccountId: string;
    publicKeyJwk?: Record<string, unknown>;
  }>;
  authentication: string[];
  assertionMethod: string[];
  service?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;
  metadata: {
    registrationDate?: string;
    isActive: boolean;
    authCount: number;
  };
}

function parseDidEthr(did: string): string {
  const trimmed = did.trim();
  const match = trimmed.match(DID_ETHR_REGEX);
  if (!match) {
    throw new Error('Invalid DID format. Expected did:ethr:0x...');
  }
  return match[1];
}

function parseOptionalPublicKeyJwk(raw: string): Record<string, unknown> | undefined {
  if (!raw || !raw.trim()) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

export async function resolveDidDocument(did: string): Promise<ResolvedDidDocument> {
  const address = parseDidEthr(did);
  const didInfo = await sepoliaService.getEmployeeDIDInfo(address);
  if (!didInfo.success || !didInfo.didInfo) {
    throw new Error(didInfo.error || 'DID not found on-chain');
  }

  const canonicalDid = didInfo.didInfo.did || `did:ethr:${address.toLowerCase()}`;
  const methodId = `${canonicalDid}#controller`;
  const publicKeyJwk = parseOptionalPublicKeyJwk(didInfo.didInfo.publicKeyJwk);

  return {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/secp256k1recovery-2020/v2',
    ],
    id: canonicalDid,
    verificationMethod: [
      {
        id: methodId,
        type: 'EcdsaSecp256k1RecoveryMethod2020',
        controller: canonicalDid,
        blockchainAccountId: `eip155:11155111:${address.toLowerCase()}`,
        ...(publicKeyJwk ? { publicKeyJwk } : {}),
      },
    ],
    authentication: [methodId],
    assertionMethod: [methodId],
    metadata: {
      registrationDate: didInfo.didInfo.registrationDate,
      isActive: didInfo.didInfo.isActive,
      authCount: didInfo.didInfo.authCount,
    },
  };
}
