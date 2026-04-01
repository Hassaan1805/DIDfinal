import { networkService } from './network';

export type EnrollmentRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type EnrollmentDecision = 'approved' | 'rejected';

export interface PublicProfileLink {
  label: string;
  url: string;
}

export interface PublicProfileInput {
  displayName: string;
  headline?: string;
  summary?: string;
  location?: string;
  skills?: string[];
  links?: PublicProfileLink[];
  resumePublicUrl?: string;
  profileUri?: string;
  profileHash?: string;
  profileVersion?: number;
}

export interface PrivateProfilePointerInput {
  encryptedProfileUri?: string;
  cipherHash?: string;
  encryptionScheme?: string;
}

export interface PublicProfile {
  displayName: string;
  headline?: string;
  summary?: string;
  location?: string;
  skills: string[];
  links: PublicProfileLink[];
  resumePublicUrl?: string;
  profileUri?: string;
  profileHash?: string;
  profileVersion: number;
  updatedAt: string;
}

export interface UserIdentityRecord {
  did: string;
  walletAddress: string;
  publicProfile: PublicProfile;
  privateProfilePointer?: PrivateProfilePointerInput;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentRequest {
  requestId: string;
  did: string;
  requesterOrganizationId: string;
  requesterOrganizationName: string;
  verifierId?: string;
  purpose: string;
  requestedClaims: string[];
  requestedProfileFields: string[];
  status: EnrollmentRequestStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  decidedAt?: string;
  approvedClaims?: string[];
  approvedProfileFields?: string[];
  decisionReason?: string;
}

export interface IdentityProofSigner {
  did: string;
  walletAddress: string;
  signMessage: (message: string) => Promise<string>;
}

type IdentityProofAction = 'register_profile' | 'list_enrollments' | 'enrollment_decision';

interface IdentityChallengePayload {
  challengeId: string;
  challenge: string;
  did: string;
  action: IdentityProofAction;
  requestId?: string;
  expiresAt: string;
  expiresInSeconds: number;
}

interface IdentityProofPayload {
  token: string;
  did: string;
  address: string;
  action: IdentityProofAction;
  requestId?: string;
  expiresInSeconds: number;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

function parseErrorMessage(responsePayload: unknown, fallback: string): string {
  if (!responsePayload || typeof responsePayload !== 'object') {
    return fallback;
  }

  const typed = responsePayload as ApiResponse<unknown>;
  return typed.error || typed.message || fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = networkService.getApiUrl();
  const url = `${baseUrl}/api/identity${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    if (!response.ok) {
      throw new Error(`Identity request failed: ${response.status} ${response.statusText}`);
    }
  }

  if (!response.ok || !payload || !payload.success || payload.data === undefined) {
    const fallback = `Identity request failed: ${response.status} ${response.statusText}`;
    throw new Error(parseErrorMessage(payload, fallback));
  }

  return payload.data;
}

function cleanList(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

function normalizeAddress(value: string): string {
  const trimmed = value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    throw new Error('Invalid wallet address format. Expected 0x followed by 40 hex characters.');
  }

  return trimmed.toLowerCase();
}

function normalizeDid(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^did:ethr:(0x[a-fA-F0-9]{40})$/);
  if (!match) {
    throw new Error('Invalid DID format. Expected did:ethr:0x...');
  }

  return `did:ethr:${match[1].toLowerCase()}`;
}

function resolveDidAddress(did: string): string {
  const normalizedDid = normalizeDid(did);
  const [, address] = normalizedDid.split('did:ethr:');
  return address;
}

async function getIdentityProofToken(input: {
  did: string;
  action: IdentityProofAction;
  signer: IdentityProofSigner;
  requestId?: string;
}): Promise<string> {
  const normalizedDid = normalizeDid(input.did);
  const normalizedSignerDid = normalizeDid(input.signer.did);
  const normalizedSignerAddress = normalizeAddress(input.signer.walletAddress);
  const didAddress = resolveDidAddress(normalizedDid);

  if (normalizedDid !== normalizedSignerDid) {
    throw new Error('Identity proof signer DID does not match requested DID.');
  }

  if (normalizedSignerAddress !== didAddress) {
    throw new Error('Identity proof signer walletAddress does not match DID owner address.');
  }

  const challenge = await request<IdentityChallengePayload>('/auth/challenge', {
    method: 'POST',
    body: JSON.stringify({
      did: normalizedDid,
      action: input.action,
      requestId: input.requestId,
    }),
  });

  const signature = await input.signer.signMessage(challenge.challenge);

  const verified = await request<IdentityProofPayload>('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({
      challengeId: challenge.challengeId,
      did: normalizedDid,
      message: challenge.challenge,
      signature,
      address: normalizedSignerAddress,
      requestId: input.requestId,
    }),
  });

  return verified.token;
}

export const identityService = {
  async registerIdentityProfile(input: {
    did: string;
    walletAddress: string;
    publicProfile: PublicProfileInput;
    privateProfilePointer?: PrivateProfilePointerInput;
  }, signer: IdentityProofSigner): Promise<UserIdentityRecord> {
    const token = await getIdentityProofToken({
      did: input.did,
      action: 'register_profile',
      signer,
    });

    return request<UserIdentityRecord>('/register', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });
  },

  async getPublicProfile(did: string): Promise<{
    did: string;
    walletAddress: string;
    publicProfile: PublicProfile;
    updatedAt: string;
  }> {
    const encodedDid = encodeURIComponent(did);
    return request(`/${encodedDid}/public-profile`, {
      method: 'GET',
    });
  },

  async listEnrollmentRequests(
    did: string,
    status?: EnrollmentRequestStatus,
    signer?: IdentityProofSigner
  ): Promise<EnrollmentRequest[]> {
    if (!signer) {
      throw new Error('Identity proof signer is required to list enrollment requests.');
    }

    const token = await getIdentityProofToken({
      did,
      action: 'list_enrollments',
      signer,
    });

    const encodedDid = encodeURIComponent(did);
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<EnrollmentRequest[]>(`/${encodedDid}/enrollment-requests${query}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async getEnrollmentRequest(requestId: string): Promise<EnrollmentRequest> {
    return request<EnrollmentRequest>(`/enrollment-requests/${encodeURIComponent(requestId)}`, {
      method: 'GET',
    });
  },

  async decideEnrollmentRequest(input: {
    requestId: string;
    did: string;
    decision: EnrollmentDecision;
    approvedClaims?: string[];
    approvedProfileFields?: string[];
    reason?: string;
  }, signer?: IdentityProofSigner): Promise<EnrollmentRequest> {
    if (!signer) {
      throw new Error('Identity proof signer is required to decide enrollment requests.');
    }

    const token = await getIdentityProofToken({
      did: input.did,
      action: 'enrollment_decision',
      requestId: input.requestId,
      signer,
    });

    const body: Record<string, unknown> = {
      did: input.did,
      decision: input.decision,
    };

    if (input.reason && input.reason.trim()) {
      body.reason = input.reason.trim();
    }

    if (input.decision === 'approved') {
      body.approvedClaims = cleanList(input.approvedClaims || []);
      body.approvedProfileFields = cleanList(input.approvedProfileFields || []);
    }

    return request<EnrollmentRequest>(`/enrollment-requests/${encodeURIComponent(input.requestId)}/decision`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  },
};
