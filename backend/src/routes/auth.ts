import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { verifyJWT } from 'did-jwt';
import { EthrDID } from 'ethr-did';
import { BlockchainService } from '../services/blockchainService';
import { sepoliaService } from '../services/SepoliaService';
import { verifyAuthToken, AuthenticatedRequest } from '../middleware/auth.middleware';
import { authRateLimiter, challengeRateLimiter } from '../middleware/rateLimiter.middleware';
import { authSchemas, validateBody } from '../middleware/validation.middleware';
import {
  generateRefreshToken,
  storeRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
} from '../services/refreshToken.service';
import {
  BadgeType,
  getBadgeDefinition,
  getEmployeeById,
  getEmployeeByDID,
  getEmployeeByAddress,
  setEmployeeZkData,
} from '../services/employeeDirectory';
import ZKProofService from '../services/zkproof.service';
import {
  ensureEmployeeRegisteredOnChain,
  enrichEmployeeWithOnChainProfile,
  recordEmployeeAuthenticationOnChain,
} from '../services/employeeOnChainRegistry';
import {
  evaluateIssuerTrust,
  getIssuerTrustPolicy,
} from '../services/issuerTrust.service';
import {
  getCredentialStatus,
  getCredentialStatusPolicy,
} from '../services/credentialStatus.service';
import {
  SUPPORTED_VERIFIER_CLAIM_KEYS,
  VerifierClaimKey,
  VerifierProfile,
  evaluateVerifierPolicy,
  getVerifierProfile,
  listVerifierProfiles,
  resolveRequestedClaims,
  resolveVerifierProfile,
} from '../services/verifierProfiles.service';
import {
  addAuthTimelineEvent,
  AuthTimelineEventStatus,
  AuthTimelineEventType,
  listAuthTimelineEvents,
  summarizeAuthTimeline,
} from '../services/authTimeline.service';
import {
  AuthChallenge,
  deleteChallenge,
  getAllChallengeIds,
  getChallenge,
  setChallenge,
} from '../services/challengeStorage.service';

const router = Router();

// Initialize blockchain service for DID verification
const blockchainService = new BlockchainService({
  rpcUrl: process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
  contractAddress: process.env.DID_REGISTRY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  gasStationPrivateKey: process.env.GAS_STATION_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
});

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;
const SHOULD_SKIP_ONCHAIN_VERIFY = process.env.ONCHAIN_VERIFY_MODE === 'off';
const CHALLENGE_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes
const CHALLENGE_EXPIRY_SECONDS = Math.floor(CHALLENGE_EXPIRY_TIME / 1000);
const DISCLOSURE_BINDING_VERSION = 'sd-bind-v1';
const DISCLOSURE_BINDING_PREFIX = 'Selective disclosure binding:';
const AUTH_TIMELINE_EVENT_TYPES: AuthTimelineEventType[] = [
  'challenge_created',
  'challenge_expired',
  'verification_attempted',
  'verification_succeeded',
  'verification_failed',
  'token_verified',
  'token_verification_failed',
  'session_status_checked',
];
const AUTH_TIMELINE_EVENT_STATUS: AuthTimelineEventStatus[] = ['success', 'failure', 'info'];

interface DisclosedClaimsProofPayload {
  bindingVersion: string;
  challengeId: string;
  challengeDigest: string;
  claimDigest: string;
  credentialDigest?: string;
  bindingDigest: string;
  signedBinding: string;
  createdAt?: string;
}

function getSingleQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : undefined;
  }

  return typeof value === 'string' ? value : undefined;
}

function normalizeOptionalString(value: unknown): string | undefined {
  const raw = getSingleQueryValue(value);
  if (!raw) {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  const raw = normalizeOptionalString(value);
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function isChallengeExpired(challengeData: AuthChallenge, now = Date.now()): boolean {
  return now - challengeData.timestamp > CHALLENGE_EXPIRY_TIME;
}

function getRemainingChallengeTtlSeconds(challengeData: AuthChallenge, now = Date.now()): number {
  const expiresAt = challengeData.timestamp + CHALLENGE_EXPIRY_TIME;
  const remainingMs = expiresAt - now;
  return Math.max(1, Math.ceil(remainingMs / 1000));
}

async function persistChallengeState(challengeId: string, challengeData: AuthChallenge): Promise<void> {
  const now = Date.now();
  if (isChallengeExpired(challengeData, now)) {
    await deleteChallenge(challengeId);
    return;
  }

  await setChallenge(challengeId, challengeData, getRemainingChallengeTtlSeconds(challengeData, now));
}

async function getChallengeEntryBySessionId(
  sessionId: string
): Promise<{ challengeId: string; challengeData: AuthChallenge } | null> {
  const challengeIds = await getAllChallengeIds();

  for (const challengeId of challengeIds) {
    const challengeData = await getChallenge(challengeId);
    if (!challengeData) {
      continue;
    }

    if (challengeId.includes(sessionId) || challengeData.challenge.includes(sessionId)) {
      return {
        challengeId,
        challengeData,
      };
    }
  }

  return null;
}

async function listChallengeIds(): Promise<string[]> {
  return await getAllChallengeIds();
}

function isAuthTimelineEventType(value: string): value is AuthTimelineEventType {
  return AUTH_TIMELINE_EVENT_TYPES.includes(value as AuthTimelineEventType);
}

function isAuthTimelineEventStatus(value: string): value is AuthTimelineEventStatus {
  return AUTH_TIMELINE_EVENT_STATUS.includes(value as AuthTimelineEventStatus);
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function isPrivateIpv4(value: string): boolean {
  return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)\d{1,3}\.\d{1,3}$/.test(value);
}

function resolveApiBaseUrl(req?: Request): string {
  const configuredBaseUrl = process.env.PUBLIC_API_BASE_URL;
  if (configuredBaseUrl) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  const preferredHostIp = process.env.PRIMARY_HOST_IP || process.env.LOCAL_IP;
  if (preferredHostIp && isPrivateIpv4(preferredHostIp)) {
    return `http://${preferredHostIp}:${process.env.PORT || '3001'}`;
  }

  if (req) {
    const forwardedProtoHeader = req.headers['x-forwarded-proto'];
    const forwardedHostHeader = req.headers['x-forwarded-host'];
    const forwardedProto = Array.isArray(forwardedProtoHeader)
      ? forwardedProtoHeader[0]
      : forwardedProtoHeader;
    const forwardedHost = Array.isArray(forwardedHostHeader)
      ? forwardedHostHeader[0]
      : forwardedHostHeader;
    const host = forwardedHost || req.get('host');
    const protocol = forwardedProto || req.protocol || 'http';

    if (host) {
      return normalizeBaseUrl(`${protocol}://${host}`);
    }
  }

  return `http://localhost:${process.env.PORT || '3001'}`;
}

function normalizeClaimValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
}

function hashUtf8(value: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(value));
}

function canonicalizeClaims(claims: Partial<Record<VerifierClaimKey, string>>): string {
  return Object.entries(claims)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value.trim()}`)
    .join('|');
}

function computeClaimDigest(claims: Partial<Record<VerifierClaimKey, string>>): string {
  const canonical = canonicalizeClaims(claims);
  return hashUtf8(canonical || 'no-claims');
}

function computeBindingDigest(input: {
  challengeId: string;
  challengeDigest: string;
  claimDigest: string;
  credentialDigest?: string;
  bindingVersion: string;
}): string {
  const material = [
    input.challengeId,
    input.challengeDigest,
    input.claimDigest,
    input.credentialDigest || 'no-credential',
    input.bindingVersion,
  ].join('|');
  return hashUtf8(material);
}

function parseDisclosedClaimsProof(input: unknown): DisclosedClaimsProofPayload | undefined {
  if (input === undefined || input === null) {
    return undefined;
  }

  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('disclosedClaimsProof must be an object when provided');
  }

  const raw = input as Record<string, unknown>;
  const requiredStringFields = [
    'bindingVersion',
    'challengeId',
    'challengeDigest',
    'claimDigest',
    'bindingDigest',
    'signedBinding',
  ] as const;

  for (const field of requiredStringFields) {
    if (typeof raw[field] !== 'string' || !raw[field].trim()) {
      throw new Error(`disclosedClaimsProof.${field} must be a non-empty string`);
    }
  }

  if (raw.credentialDigest !== undefined && (typeof raw.credentialDigest !== 'string' || !raw.credentialDigest.trim())) {
    throw new Error('disclosedClaimsProof.credentialDigest must be a non-empty string when provided');
  }

  if (raw.createdAt !== undefined && (typeof raw.createdAt !== 'string' || !raw.createdAt.trim())) {
    throw new Error('disclosedClaimsProof.createdAt must be a non-empty string when provided');
  }

  return {
    bindingVersion: String(raw.bindingVersion).trim(),
    challengeId: String(raw.challengeId).trim(),
    challengeDigest: String(raw.challengeDigest).trim(),
    claimDigest: String(raw.claimDigest).trim(),
    credentialDigest: typeof raw.credentialDigest === 'string' ? raw.credentialDigest.trim() : undefined,
    bindingDigest: String(raw.bindingDigest).trim(),
    signedBinding: String(raw.signedBinding).trim(),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt.trim() : undefined,
  };
}

function verifyDisclosedClaimsProof(input: {
  challengeId: string;
  challengeText: string;
  disclosedClaims: Partial<Record<VerifierClaimKey, string>>;
  credential?: string;
  walletAddress: string;
  proof: DisclosedClaimsProofPayload;
}): {
  verified: boolean;
  reason?: string;
  bindingDigest?: string;
} {
  if (input.proof.bindingVersion !== DISCLOSURE_BINDING_VERSION) {
    return {
      verified: false,
      reason: `Unsupported bindingVersion: ${input.proof.bindingVersion}`,
    };
  }

  if (input.proof.challengeId !== input.challengeId) {
    return {
      verified: false,
      reason: 'challengeId mismatch in disclosedClaimsProof',
    };
  }

  const expectedChallengeDigest = hashUtf8(input.challengeText);
  if (input.proof.challengeDigest !== expectedChallengeDigest) {
    return {
      verified: false,
      reason: 'challengeDigest mismatch in disclosedClaimsProof',
    };
  }

  const expectedClaimDigest = computeClaimDigest(input.disclosedClaims);
  if (input.proof.claimDigest !== expectedClaimDigest) {
    return {
      verified: false,
      reason: 'claimDigest mismatch in disclosedClaimsProof',
    };
  }

  const expectedCredentialDigest = input.credential ? hashUtf8(input.credential) : undefined;
  if (expectedCredentialDigest && input.proof.credentialDigest !== expectedCredentialDigest) {
    return {
      verified: false,
      reason: 'credentialDigest mismatch in disclosedClaimsProof',
    };
  }

  const recomputedBindingDigest = computeBindingDigest({
    challengeId: input.challengeId,
    challengeDigest: expectedChallengeDigest,
    claimDigest: expectedClaimDigest,
    credentialDigest: expectedCredentialDigest,
    bindingVersion: input.proof.bindingVersion,
  });

  if (input.proof.bindingDigest !== recomputedBindingDigest) {
    return {
      verified: false,
      reason: 'bindingDigest mismatch in disclosedClaimsProof',
    };
  }

  try {
    const recoveredAddress = ethers.verifyMessage(
      `${DISCLOSURE_BINDING_PREFIX} ${input.proof.bindingDigest}`,
      input.proof.signedBinding,
    );

    if (recoveredAddress.toLowerCase() !== input.walletAddress.toLowerCase()) {
      return {
        verified: false,
        reason: 'signedBinding signature does not match wallet address',
      };
    }
  } catch (error: any) {
    return {
      verified: false,
      reason: error?.message || 'Unable to verify signedBinding signature',
    };
  }

  return {
    verified: true,
    bindingDigest: recomputedBindingDigest,
  };
}

function parseDisclosedClaims(input: unknown): Partial<Record<VerifierClaimKey, string>> {
  if (input === undefined || input === null) {
    return {};
  }

  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('disclosedClaims must be an object when provided');
  }

  const raw = input as Record<string, unknown>;
  const parsed: Partial<Record<VerifierClaimKey, string>> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (!SUPPORTED_VERIFIER_CLAIM_KEYS.includes(key as VerifierClaimKey)) {
      throw new Error(`Unsupported disclosed claim key: ${key}`);
    }

    const normalized = normalizeClaimValue(value);
    if (!normalized) {
      throw new Error(`disclosedClaims.${key} must be a non-empty string-compatible value`);
    }

    parsed[key as VerifierClaimKey] = normalized;
  }

  return parsed;
}

function buildExpectedClaimValues(input: {
  resolvedDid: string;
  resolvedEmployee?: {
    id?: string;
    name?: string;
    badge?: string;
    department?: string;
    email?: string;
  };
  credentialClaims?: Partial<Record<VerifierClaimKey, string>>;
}): Partial<Record<VerifierClaimKey, string>> {
  return {
    subjectDid: input.resolvedDid,
    employeeId: input.resolvedEmployee?.id || input.credentialClaims?.employeeId,
    name: input.resolvedEmployee?.name || input.credentialClaims?.name,
    role: input.credentialClaims?.role || input.resolvedEmployee?.badge,
    department: input.resolvedEmployee?.department || input.credentialClaims?.department,
    email: input.resolvedEmployee?.email || input.credentialClaims?.email,
  };
}

function verifyDisclosedClaims(input: {
  requiredClaims: VerifierClaimKey[];
  disclosedClaims: Partial<Record<VerifierClaimKey, string>>;
  expectedClaims: Partial<Record<VerifierClaimKey, string>>;
}): {
  verified: boolean;
  missingClaims: VerifierClaimKey[];
  mismatchedClaims: VerifierClaimKey[];
} {
  const missingClaims: VerifierClaimKey[] = [];
  const mismatchedClaims: VerifierClaimKey[] = [];

  for (const claimKey of input.requiredClaims) {
    const disclosedValue = input.disclosedClaims[claimKey];
    if (!disclosedValue) {
      missingClaims.push(claimKey);
      continue;
    }

    const expectedValue = input.expectedClaims[claimKey];
    if (!expectedValue || disclosedValue !== expectedValue) {
      mismatchedClaims.push(claimKey);
    }
  }

  return {
    verified: missingClaims.length === 0 && mismatchedClaims.length === 0,
    missingClaims,
    mismatchedClaims,
  };
}

async function verifyCredentialAgainstDid(
  credential: string,
  expectedDid: string
): Promise<{
  credentialId: string | null;
  credentialStatus: string;
  credentialFoundInRegistry: boolean;
  issuer: string;
  issuerTrusted: boolean;
  strictIssuerTrust: boolean;
  subjectDid?: string;
  employeeId?: string;
  name?: string;
  role?: string;
  department?: string;
  email?: string;
}> {
  const verificationResult = await verifyJWT(credential, {
    resolver: undefined,
    audience: undefined,
  });

  const vcPayload: any = verificationResult.payload;
  if (!vcPayload?.vc || !vcPayload.vc?.credentialSubject) {
    throw new Error('Invalid credential structure');
  }

  const credentialId =
    (typeof vcPayload.vc?.id === 'string' && vcPayload.vc.id.trim()) ||
    (typeof vcPayload.jti === 'string' && vcPayload.jti.trim()) ||
    null;

  const credentialPolicy = getCredentialStatusPolicy();
  if (credentialPolicy.requireCredentialId && !credentialId) {
    throw new Error('Credential ID is required by policy');
  }

  const credentialStatus = getCredentialStatus(credentialId);
  if (credentialStatus.status === 'revoked') {
    throw new Error(credentialStatus.reason || 'Credential has been revoked');
  }

  if (credentialStatus.status === 'expired') {
    throw new Error(credentialStatus.reason || 'Credential has expired');
  }

  if (credentialPolicy.strictStatusCheck && credentialStatus.status === 'unknown') {
    throw new Error('Credential status is unknown in registry');
  }

  const credentialSubject = vcPayload.vc.credentialSubject;
  if (credentialSubject.id !== expectedDid) {
    throw new Error('Credential not issued to authenticated user');
  }

  const issuer =
    typeof vcPayload.vc.issuer === 'string'
      ? vcPayload.vc.issuer
      : vcPayload.vc.issuer?.id;

  if (!issuer) {
    throw new Error('Credential issuer is missing');
  }

  const issuerTrust = evaluateIssuerTrust(issuer);
  if (!issuerTrust.issuerTrusted && issuerTrust.strictIssuerTrust) {
    throw new Error('Credential not issued by a trusted issuer');
  }

  if (!issuerTrust.issuerTrusted) {
    console.warn('⚠️ Credential issuer is not in trusted list, but strict mode is disabled:', {
      issuer,
      trustedIssuers: issuerTrust.trustedIssuers,
    });
  }

  if (vcPayload.exp && vcPayload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Credential has expired');
  }

  return {
    credentialId,
    credentialStatus: credentialStatus.status,
    credentialFoundInRegistry: credentialStatus.foundInRegistry,
    issuer,
    issuerTrusted: issuerTrust.issuerTrusted,
    strictIssuerTrust: issuerTrust.strictIssuerTrust,
    subjectDid: credentialSubject.id,
    employeeId: credentialSubject.employeeId,
    name: credentialSubject.name,
    role: credentialSubject.role,
    department: credentialSubject.department,
    email: credentialSubject.email,
  };
}

/**
 * GET /api/auth/trusted-issuers
 *
 * Returns active issuer trust policy used during VC verification.
 */
router.get('/trusted-issuers', (req: Request, res: Response) => {
  const policy = getIssuerTrustPolicy();

  res.json({
    success: true,
    data: policy,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/auth/credential-status/:credentialId
 *
 * Returns current status of a credential in the local registry.
 */
router.get('/credential-status/:credentialId', (req: Request, res: Response) => {
  const { credentialId } = req.params;
  const policy = getCredentialStatusPolicy();
  const status = getCredentialStatus(credentialId);

  res.json({
    success: true,
    data: {
      policy,
      status,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/auth/verifier-profiles
 *
 * Returns available verifier profiles used for cross-organization policy checks.
 */
router.get('/verifier-profiles', (req: Request, res: Response) => {
  const includeInactive = req.query.includeInactive === 'true';
  const profiles = listVerifierProfiles({ includeInactive });

  res.json({
    success: true,
    data: profiles,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/auth/verifier-profiles/:verifierId
 *
 * Returns a single verifier profile by ID.
 */
router.get('/verifier-profiles/:verifierId', (req: Request, res: Response) => {
  const { verifierId } = req.params;
  const profile = getVerifierProfile(verifierId);

  if (!profile) {
    res.status(404).json({
      success: false,
      error: 'Verifier profile not found',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.json({
    success: true,
    data: profile,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/auth/timeline
 *
 * Returns authentication timeline events filtered by identity or organization scope.
 */
router.get('/timeline', (req: Request, res: Response) => {
  const did = normalizeOptionalString(req.query.did);
  const userAddress = normalizeOptionalString(req.query.userAddress);
  const employeeId = normalizeOptionalString(req.query.employeeId);
  const companyId = normalizeOptionalString(req.query.companyId);
  const verifierId = normalizeOptionalString(req.query.verifierId);
  const eventTypeValue = normalizeOptionalString(req.query.eventType);
  const statusValue = normalizeOptionalString(req.query.status);
  const from = normalizeOptionalString(req.query.from);
  const to = normalizeOptionalString(req.query.to);
  const limit = parsePositiveInteger(req.query.limit, 50);
  const cursor = parsePositiveInteger(req.query.cursor, 0);

  if (!did && !userAddress && !employeeId && !companyId && !verifierId) {
    res.status(400).json({
      success: false,
      error: 'At least one scope filter is required: did, userAddress, employeeId, companyId, or verifierId',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (eventTypeValue && !isAuthTimelineEventType(eventTypeValue)) {
    res.status(400).json({
      success: false,
      error: `Invalid eventType. Allowed values: ${AUTH_TIMELINE_EVENT_TYPES.join(', ')}`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (statusValue && !isAuthTimelineEventStatus(statusValue)) {
    res.status(400).json({
      success: false,
      error: `Invalid status. Allowed values: ${AUTH_TIMELINE_EVENT_STATUS.join(', ')}`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const filters = {
    did,
    userAddress,
    employeeId,
    companyId,
    verifierId,
    eventType: eventTypeValue as AuthTimelineEventType | undefined,
    status: statusValue as AuthTimelineEventStatus | undefined,
    from,
    to,
  };

  const listing = listAuthTimelineEvents({
    filters,
    limit,
    cursor,
  });
  const summary = summarizeAuthTimeline({ filters });

  res.json({
    success: true,
    data: {
      filters,
      events: listing.events,
      pagination: {
        limit,
        cursor,
        returned: listing.returned,
        total: listing.total,
        hasMore: listing.hasMore,
        nextCursor: listing.nextCursor,
      },
      summary,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/auth/timeline/me
 *
 * Returns authentication timeline events for the currently authenticated user.
 */
router.get('/timeline/me', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const eventTypeValue = normalizeOptionalString(req.query.eventType);
  const statusValue = normalizeOptionalString(req.query.status);
  const from = normalizeOptionalString(req.query.from);
  const to = normalizeOptionalString(req.query.to);
  const limit = parsePositiveInteger(req.query.limit, 50);
  const cursor = parsePositiveInteger(req.query.cursor, 0);

  if (!req.user?.address && !req.user?.did) {
    res.status(401).json({
      success: false,
      error: 'Authenticated identity is missing in token',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (eventTypeValue && !isAuthTimelineEventType(eventTypeValue)) {
    res.status(400).json({
      success: false,
      error: `Invalid eventType. Allowed values: ${AUTH_TIMELINE_EVENT_TYPES.join(', ')}`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (statusValue && !isAuthTimelineEventStatus(statusValue)) {
    res.status(400).json({
      success: false,
      error: `Invalid status. Allowed values: ${AUTH_TIMELINE_EVENT_STATUS.join(', ')}`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const filters = {
    did: req.user.did,
    userAddress: req.user.address,
    eventType: eventTypeValue as AuthTimelineEventType | undefined,
    status: statusValue as AuthTimelineEventStatus | undefined,
    from,
    to,
  };

  const listing = listAuthTimelineEvents({
    filters,
    limit,
    cursor,
  });
  const summary = summarizeAuthTimeline({ filters });

  res.json({
    success: true,
    data: {
      filters,
      events: listing.events,
      pagination: {
        limit,
        cursor,
        returned: listing.returned,
        total: listing.total,
        hasMore: listing.hasMore,
        nextCursor: listing.nextCursor,
      },
      summary,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/auth/challenge
 * Generates a cryptographically secure random challenge for QR code authentication
 * Legacy endpoint for backward compatibility
 */
router.get('/challenge', challengeRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const challenge = await generateChallenge({
      apiBaseUrl: resolveApiBaseUrl(req),
    });
    res.json({
      success: true,
      data: challenge,
      message: 'Authentication challenge generated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error generating challenge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authentication challenge',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/challenge
 * Generates a challenge for employee portal access with context
 */
router.post('/challenge', challengeRateLimiter, validateBody(authSchemas.challenge), async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId, companyId, requestType, verifierId } = req.body;
    
    // Validate employee if provided
    if (employeeId) {
      const employee = getEmployeeById(employeeId.toUpperCase());
      if (!employee) {
        res.status(404).json({
          success: false,
          error: 'Employee not found',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      if (!employee.active) {
        res.status(403).json({
          success: false,
          error: 'Employee account is inactive',
          timestamp: new Date().toISOString()
        });
        return;
      }
    }
    
    let verifierProfile: VerifierProfile;
    try {
      verifierProfile = resolveVerifierProfile({
        verifierId,
        organizationId: companyId,
      });
    } catch (profileError: any) {
      res.status(400).json({
        success: false,
        error: 'Invalid verifier profile input',
        details: profileError?.message || 'Unable to resolve verifier profile',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (companyId && verifierProfile.organizationId !== companyId) {
      res.status(400).json({
        success: false,
        error: 'companyId does not match verifier profile organization',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const challenge = await generateChallenge({
      employeeId: employeeId?.toUpperCase(),
      companyId: verifierProfile.organizationId,
      requestType: requestType || 'portal_access',
      verifierProfile,
      apiBaseUrl: resolveApiBaseUrl(req),
    });
    
    res.json({
      success: true,
      data: challenge,
      message: 'Employee authentication challenge generated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error generating employee challenge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate employee authentication challenge',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Helper function to generate authentication challenges
 */
async function generateChallenge(context?: {
  employeeId?: string;
  companyId?: string;
  requestType?: string;
  verifierProfile?: VerifierProfile;
  apiBaseUrl?: string;
}) {
  const selectedEmployee = context?.employeeId ? getEmployeeById(context.employeeId) : undefined;
  const employee = selectedEmployee
    ? await enrichEmployeeWithOnChainProfile(selectedEmployee)
    : undefined;

  if (employee) {
    await ensureEmployeeRegisteredOnChain(employee);
  }

  const badge = (employee?.badge || 'employee') as BadgeType;
  const badgeDefinition = getBadgeDefinition(badge);
  const timestamp = Date.now();
  const apiBaseUrl = context?.apiBaseUrl || resolveApiBaseUrl();
  const requestType = (context?.requestType || 'portal_access') as 'portal_access' | 'general_auth';
  const verifierProfile = context?.verifierProfile
    || resolveVerifierProfile({ organizationId: context?.companyId });

  if (!verifierProfile.allowedRequestTypes.includes(requestType)) {
    throw new Error(`Verifier ${verifierProfile.verifierId} does not allow request type ${requestType}`);
  }

  if (!verifierProfile.allowedBadges.includes(badge)) {
    throw new Error(`Badge ${badge} is not allowed for verifier ${verifierProfile.verifierId}`);
  }

  const requestedClaims = {
    requestType,
    requiredClaims: resolveRequestedClaims(verifierProfile, requestType),
    policyVersion: verifierProfile.policyVersion,
    proofRequired: true,
    bindingVersion: DISCLOSURE_BINDING_VERSION,
  };

  // Generate a cryptographically secure random challenge
  const randomPart = crypto.randomBytes(32).toString('hex');
  const challengeId = crypto.randomUUID();
  const challenge = [
    `challenge:${randomPart}`,
    `scope:${badgeDefinition.challengeScope}`,
    `badge:${badge}`,
    `employee:${employee?.id || 'unknown'}`,
    `issued:${new Date(timestamp).toISOString()}`,
  ].join('|');
  
  // Store the challenge with expiry and context
  await setChallenge(challengeId, {
    challenge,
    timestamp,
    used: false,
    employeeId: context?.employeeId,
    employeeName: employee?.name,
    badge,
    permissions: employee?.permissions || [...badgeDefinition.permissions],
    hashId: employee?.hashId,
    didRegistrationTxHash: employee?.didRegistrationTxHash,
    adminGasPayerAddress: sepoliaService.getGasPayerAddress(),
    adminGasPayerEtherscanUrl: sepoliaService.getGasPayerEtherscanUrl(),
    companyId: verifierProfile.organizationId,
    verifierId: verifierProfile.verifierId,
    verifierOrganizationId: verifierProfile.organizationId,
    verifierOrganizationName: verifierProfile.organizationName,
    verifierPolicyVersion: verifierProfile.policyVersion,
    verifierCredentialRequired: verifierProfile.requireCredential,
    requestType,
    requestedClaims,
  }, CHALLENGE_EXPIRY_SECONDS);

  addAuthTimelineEvent({
    eventType: 'challenge_created',
    status: 'info',
    reason: 'challenge_issued',
    challengeId,
    did: employee?.did,
    userAddress: employee?.address,
    employeeId: employee?.id,
    companyId: verifierProfile.organizationId,
    verifierId: verifierProfile.verifierId,
    verifierOrganizationId: verifierProfile.organizationId,
    verifierOrganizationName: verifierProfile.organizationName,
    requestType,
    metadata: {
      requiredClaims: requestedClaims.requiredClaims,
      proofRequired: requestedClaims.proofRequired,
      expiresAt: new Date(timestamp + CHALLENGE_EXPIRY_TIME).toISOString(),
    },
  });

  // Clean up expired challenges
  await cleanupExpiredChallenges();

  // Create QR code data — keep payload minimal so the QR remains scannable
  const qrCodeData = JSON.stringify({
    type: 'did-auth-request',
    challengeId,
    challenge,
    verifierId: verifierProfile.verifierId,
    requestedClaims: {
      requestType: requestedClaims.requestType,
      requiredClaims: requestedClaims.requiredClaims,
      policyVersion: requestedClaims.policyVersion,
    },
    badge: { type: badge, permissions: employee?.permissions || badgeDefinition.permissions },
    expiresAt: timestamp + CHALLENGE_EXPIRY_TIME,
    ...(context?.employeeId && {
      employee: {
        id: employee?.id,
        name: employee?.name,
        did: employee?.did,
        hashId: employee?.hashId,
        badge: employee?.badge,
      },
      expectedDID: employee?.did,
      employeeHashId: employee?.hashId,
    }),
  });

  return {
    challengeId,
    challenge,
    expiresIn: Math.floor(CHALLENGE_EXPIRY_TIME / 1000), // seconds
    qrCodeData,
    verifier: {
      verifierId: verifierProfile.verifierId,
      organizationId: verifierProfile.organizationId,
      organizationName: verifierProfile.organizationName,
      policyVersion: verifierProfile.policyVersion,
      requireCredential: verifierProfile.requireCredential,
      allowedBadges: verifierProfile.allowedBadges,
      requiredClaimsByRequestType: verifierProfile.requiredClaimsByRequestType,
    },
    requestedClaims,
    ...(context?.employeeId && { 
      employee,
    })
  };
}

// ── Badge hierarchy for role proof verification ────────────────────────────
const BADGE_RANK: Record<string, number> = { admin: 4, auditor: 3, manager: 2, employee: 1 };
function badgeMeetsRequirement(userBadge: string, required: string): boolean {
  return (BADGE_RANK[userBadge] ?? 1) >= (BADGE_RANK[required] ?? 1);
}

/**
 * POST /api/auth/role-challenge
 * Creates a ZKP role-proof challenge — no employeeId required.
 * The wallet holder proves they hold a badge >= requiredBadge
 * by selectively disclosing only their 'role' claim.
 */
router.post('/role-challenge', async (req: Request, res: Response): Promise<void> => {
  try {
    const { requiredBadge, scope } = req.body as {
      requiredBadge?: string;
      scope?: string;
    };

    if (!requiredBadge || !BADGE_RANK[requiredBadge]) {
      res.status(400).json({
        success: false,
        error: 'requiredBadge is required (employee | manager | auditor | admin)',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!scope || typeof scope !== 'string') {
      res.status(400).json({
        success: false,
        error: 'scope is required (e.g. "security:view")',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const challengeId = crypto.randomUUID();
    const randomPart = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    const challenge = [
      `challenge:${randomPart}`,
      `scope:role_proof`,
      `requiredBadge:${requiredBadge}`,
      `access:${scope}`,
      `issued:${new Date(timestamp).toISOString()}`,
    ].join('|');

    const requestedClaims = {
      requestType: 'general_auth' as const,
      requiredClaims: ['role' as const],
      policyVersion: 1,
      proofRequired: true,
      bindingVersion: DISCLOSURE_BINDING_VERSION,
    };

    await setChallenge(challengeId, {
      challenge,
      timestamp,
      used: false,
      challengeType: 'role_proof',
      requiredBadge: requiredBadge as BadgeType,
      scope,
      badge: 'employee', // allow any badge level to attempt
      permissions: [],
      requestType: 'general_auth',
      requestedClaims,
    }, CHALLENGE_EXPIRY_SECONDS);

    const qrCodeData = JSON.stringify({
      type: 'did-auth-request',
      challengeId,
      challenge,
      platform: 'Enterprise Portal — Role Proof',
      requestedClaims: {
        requestType: requestedClaims.requestType,
        requiredClaims: requestedClaims.requiredClaims,
        policyVersion: requestedClaims.policyVersion,
      },
      badge: { type: 'employee', permissions: [] },
      expiresAt: timestamp + CHALLENGE_EXPIRY_TIME,
    });

    addAuthTimelineEvent({
      eventType: 'challenge_created',
      status: 'info',
      reason: 'role_proof_challenge_created',
      challengeId,
      metadata: { requiredBadge, scope },
    });

    res.json({
      success: true,
      data: {
        challengeId,
        challenge,
        expiresIn: CHALLENGE_EXPIRY_SECONDS,
        qrCodeData,
        requiredBadge,
        scope,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Role challenge creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create role challenge',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/auth/status/:challengeId
 * Checks the status of an authentication challenge (for polling by web portal)
 */
router.get('/status/:challengeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { challengeId } = req.params;

    const challengeData = await getChallenge(challengeId);
    
    if (!challengeData) {
      res.status(404).json({
        success: false,
        error: 'Challenge not found or expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge is expired
    if (isChallengeExpired(challengeData)) {
      await deleteChallenge(challengeId);
      addAuthTimelineEvent({
        eventType: 'challenge_expired',
        status: 'info',
        reason: 'expired_on_status_check',
        challengeId,
        did: challengeData.did,
        userAddress: challengeData.userAddress,
        employeeId: challengeData.employeeId,
        companyId: challengeData.companyId,
        verifierId: challengeData.verifierId,
        verifierOrganizationId: challengeData.verifierOrganizationId,
        verifierOrganizationName: challengeData.verifierOrganizationName,
        requestType: challengeData.requestType,
      });
      res.status(400).json({
        success: false,
        error: 'Challenge has expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      data: {
        challengeId,
        status: challengeData.used ? 'completed' : 'pending',
        challengeType: challengeData.challengeType || 'standard',
        scope: challengeData.scope,
        requiredBadge: challengeData.requiredBadge,
        expiresAt: challengeData.timestamp + CHALLENGE_EXPIRY_TIME,
        verifierId: challengeData.verifierId,
        verifierOrganizationId: challengeData.verifierOrganizationId,
        verifierOrganizationName: challengeData.verifierOrganizationName,
        verifierPolicyVersion: challengeData.verifierPolicyVersion,
        verifierCredentialRequired: challengeData.verifierCredentialRequired,
        requestedClaims: challengeData.requestedClaims,
        ...(challengeData.used && challengeData.token && {
          token: challengeData.token,
          refreshToken: challengeData.refreshToken,
          did: challengeData.did,
          userAddress: challengeData.userAddress,
          employeeId: challengeData.employeeId,
          employeeName: challengeData.employeeName,
          badge: challengeData.badge,
          permissions: challengeData.permissions,
          hashId: challengeData.hashId,
          didRegistrationTxHash: challengeData.didRegistrationTxHash,
          authRecordTxHash: challengeData.authRecordTxHash,
          authVerifyTxHash: challengeData.authVerifyTxHash,
          adminGasPayerAddress: challengeData.adminGasPayerAddress,
          adminGasPayerEtherscanUrl: challengeData.adminGasPayerEtherscanUrl,
          disclosedClaims: challengeData.disclosedClaims,
          disclosedClaimsVerified: challengeData.disclosedClaimsVerified,
          disclosedClaimsProofVerified: challengeData.disclosedClaimsProofVerified,
          disclosedClaimsBindingDigest: challengeData.disclosedClaimsBindingDigest,
        })
      },
      timestamp: new Date().toISOString()
    });

    // Clean up completed challenge after token is retrieved (with delay to allow multiple polls)
    if (challengeData.used && challengeData.token) {
      setTimeout(() => {
        void deleteChallenge(challengeId).catch((deleteError) => {
          console.warn('⚠️ Failed to delete completed challenge:', deleteError);
        });
      }, 30000); // 30 seconds delay
    }

  } catch (error: any) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check challenge status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/auth/status/session/:sessionId
 * Checks the authentication status by session ID (for passwordless authentication polling)
 */
router.get('/status/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    // Find challenge by sessionId (stored in challenge string or as metadata)
    const challengeEntry = await getChallengeEntryBySessionId(sessionId);
    const matchingChallenge = challengeEntry?.challengeData || null;
    const challengeId = challengeEntry?.challengeId || null;

    if (!matchingChallenge) {
      res.status(404).json({
        success: false,
        error: 'Session not found or expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge is expired
    if (isChallengeExpired(matchingChallenge)) {
      await deleteChallenge(challengeId!);
      addAuthTimelineEvent({
        eventType: 'challenge_expired',
        status: 'info',
        reason: 'expired_on_session_status_check',
        challengeId: challengeId || undefined,
        did: matchingChallenge.did,
        userAddress: matchingChallenge.userAddress,
        employeeId: matchingChallenge.employeeId,
        companyId: matchingChallenge.companyId,
        verifierId: matchingChallenge.verifierId,
        verifierOrganizationId: matchingChallenge.verifierOrganizationId,
        verifierOrganizationName: matchingChallenge.verifierOrganizationName,
        requestType: matchingChallenge.requestType,
      });
      res.status(400).json({
        success: false,
        error: 'Session has expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check authentication status
    if (matchingChallenge.used && matchingChallenge.token) {
      // Authentication successful
      res.json({
        success: true,
        data: {
          authenticated: true,
          sessionId,
          user: {
            did: matchingChallenge.did,
            address: matchingChallenge.userAddress,
            employeeId: matchingChallenge.employeeId,
            name: matchingChallenge.employeeName || 'Unknown User',
            badge: matchingChallenge.badge,
            permissions: matchingChallenge.permissions,
            hashId: matchingChallenge.hashId,
            didRegistrationTxHash: matchingChallenge.didRegistrationTxHash,
            authRecordTxHash: matchingChallenge.authRecordTxHash,
            authVerifyTxHash: matchingChallenge.authVerifyTxHash,
            adminGasPayerAddress: matchingChallenge.adminGasPayerAddress,
            adminGasPayerEtherscanUrl: matchingChallenge.adminGasPayerEtherscanUrl,
          },
          token: matchingChallenge.token,
          authenticatedAt: new Date(matchingChallenge.timestamp).toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // Still pending
      res.json({
        success: true,
        data: {
          authenticated: false,
          pending: true,
          sessionId,
          expiresAt: matchingChallenge.timestamp + CHALLENGE_EXPIRY_TIME
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error: any) {
    console.error('Session status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check session status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/verify-token
 * Verifies a JWT token and returns user information
 */
router.post('/verify-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Token is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      addAuthTimelineEvent({
        eventType: 'token_verified',
        status: 'success',
        reason: 'token_valid',
        challengeId: typeof decoded.challengeId === 'string' ? decoded.challengeId : undefined,
        did: typeof decoded.did === 'string' ? decoded.did : undefined,
        userAddress: typeof decoded.address === 'string' ? decoded.address : undefined,
        employeeId: typeof decoded.employeeId === 'string' ? decoded.employeeId : undefined,
        verifierId: typeof decoded.verifierId === 'string' ? decoded.verifierId : undefined,
        verifierOrganizationId: typeof decoded.verifierOrganizationId === 'string' ? decoded.verifierOrganizationId : undefined,
        verifierOrganizationName: typeof decoded.verifierOrganizationName === 'string' ? decoded.verifierOrganizationName : undefined,
      });
      
      res.json({
        success: true,
        data: {
          did: decoded.did,
          userAddress: decoded.userAddress || decoded.address,
          challengeId: decoded.challengeId,
          verifierId: decoded.verifierId,
          verifierOrganizationId: decoded.verifierOrganizationId,
          verifierPolicyVersion: decoded.verifierPolicyVersion,
          requestedClaims: decoded.requestedClaims,
          disclosedClaims: decoded.disclosedClaims,
          disclosedClaimsVerified: decoded.disclosedClaimsVerified,
          disclosedClaimsProofVerified: decoded.disclosedClaimsProofVerified,
          disclosedClaimsBindingDigest: decoded.disclosedClaimsBindingDigest,
          issuedAt: decoded.iat,
          expiresAt: decoded.exp
        },
        message: 'Token is valid',
        timestamp: new Date().toISOString()
      });

    } catch (jwtError: any) {
      addAuthTimelineEvent({
        eventType: 'token_verification_failed',
        status: 'failure',
        reason: 'token_invalid_or_expired',
        metadata: {
          error: jwtError?.message,
        },
      });
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        details: jwtError.message,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error: any) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/verify
 * Verifies the signed challenge from the wallet app
 */
router.post('/verify', authRateLimiter, validateBody(authSchemas.verify), async (req: Request, res: Response): Promise<void> => {
  const requestedChallengeId = typeof req.body?.challengeId === 'string' ? req.body.challengeId : undefined;
  const requestedVerifierId = typeof req.body?.verifierId === 'string' ? req.body.verifierId : undefined;
  const requestedAddress = typeof req.body?.address === 'string' ? req.body.address : undefined;
  const requestedEmployeeId = typeof req.body?.employeeId === 'string' ? req.body.employeeId : undefined;
  const requestedDid = typeof req.body?.did === 'string' ? req.body.did : undefined;

  let auditStatus: AuthTimelineEventStatus = 'failure';
  let auditReason = 'verification_failed';
  let auditHttpStatus = 500;
  let auditChallengeData: AuthChallenge | undefined;
  let auditVerifierProfile: VerifierProfile | undefined;
  let auditResolvedDid: string | undefined;
  let auditResolvedAddress: string | undefined;
  let auditResolvedEmployeeId: string | undefined;

  try {
    const {
      challengeId,
      signature,
      address,
      message,
      employeeId,
      did,
      credential,
      verifierId,
      disclosedClaims,
      disclosedClaimsProof,
    } = req.body;

    // Validate required fields
    if (!challengeId || !signature || !address || !message) {
      auditReason = 'missing_required_fields';
      auditHttpStatus = 400;
      res.status(400).json({
        success: false,
        error: 'Missing required fields: challengeId, signature, address, message',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge exists and is valid
    const challengeData = await getChallenge(challengeId);
    auditChallengeData = challengeData || undefined;
    if (!challengeData) {
      auditReason = 'invalid_or_expired_challenge';
      auditHttpStatus = 400;
      res.status(400).json({
        success: false,
        error: 'Invalid or expired challenge',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge has already been used
    if (challengeData.used) {
      auditReason = 'challenge_already_used';
      auditHttpStatus = 400;
      res.status(400).json({
        success: false,
        error: 'Challenge has already been used',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge has expired
    const now = Date.now();
    if (isChallengeExpired(challengeData, now)) {
      await deleteChallenge(challengeId);
      auditReason = 'challenge_expired';
      auditHttpStatus = 400;
      addAuthTimelineEvent({
        eventType: 'challenge_expired',
        status: 'info',
        reason: 'expired_during_verification',
        challengeId,
        did: challengeData.did,
        userAddress: challengeData.userAddress,
        employeeId: challengeData.employeeId,
        companyId: challengeData.companyId,
        verifierId: challengeData.verifierId,
        verifierOrganizationId: challengeData.verifierOrganizationId,
        verifierOrganizationName: challengeData.verifierOrganizationName,
        requestType: challengeData.requestType,
      });
      res.status(400).json({
        success: false,
        error: 'Challenge has expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (verifierId && challengeData.verifierId && verifierId !== challengeData.verifierId) {
      auditReason = 'verifier_mismatch';
      auditHttpStatus = 401;
      res.status(401).json({
        success: false,
        error: 'Verifier mismatch for authentication challenge',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let verifierProfile: VerifierProfile;
    try {
      verifierProfile = resolveVerifierProfile({
        verifierId: challengeData.verifierId || verifierId,
        organizationId: challengeData.companyId,
      });
      auditVerifierProfile = verifierProfile;
    } catch (profileError: any) {
      auditReason = 'verifier_policy_resolution_failed';
      auditHttpStatus = 403;
      res.status(403).json({
        success: false,
        error: 'Verifier policy resolution failed',
        details: profileError?.message || 'Unable to resolve verifier profile',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      // SECURITY: Always verify signatures - no dev mode bypass
      console.log('🔐 Verifying Ethereum signature');
      
      let signatureValid = false;
      let recoveredAddress = '';

      try {
        recoveredAddress = ethers.verifyMessage(message, signature);
        signatureValid = recoveredAddress.toLowerCase() === address.toLowerCase();
        console.log('🔐 Signature verification result:', {
          signatureValid,
          expectedAddress: address,
          recoveredAddress
        });
      } catch (error) {
        console.error('Signature verification failed:', error);
        signatureValid = false;
      }
      
      // Verify that the signature is valid
      if (!signatureValid || recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        auditReason = 'signature_verification_failed';
        auditHttpStatus = 401;
        res.status(401).json({
          success: false,
          error: 'Signature verification failed - address mismatch',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify that the message contains the correct challenge
      if (!message.includes(challengeData.challenge)) {
        auditReason = 'challenge_message_mismatch';
        auditHttpStatus = 401;
        res.status(401).json({
          success: false,
          error: 'Invalid challenge in signed message',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log('✅ Signature verification successful for address:', address);

      // ── Role-proof challenge: short-circuit with scoped token ───────────────
      if (challengeData.challengeType === 'role_proof') {
        const resolvedDid = did || `did:ethr:${address}`;
        const employee = getEmployeeByDID(resolvedDid);

        // Parse disclosed claims
        const parsedDisclosedClaims: Partial<Record<VerifierClaimKey, string>> =
          typeof disclosedClaims === 'object' && disclosedClaims ? (disclosedClaims as Partial<Record<VerifierClaimKey, string>>) : {};

        const disclosedRole = parsedDisclosedClaims.role;
        const employeeBadge = employee?.badge || 'employee';

        // The disclosed role must match the employee's actual badge
        if (!disclosedRole || disclosedRole !== employeeBadge) {
          res.status(401).json({
            success: false,
            error: 'Disclosed role does not match registered badge',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Employee must exist and be active
        if (!employee || !employee.active) {
          res.status(401).json({
            success: false,
            error: 'No active employee found for this DID',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Badge must meet the required level
        if (!badgeMeetsRequirement(employeeBadge, challengeData.requiredBadge || 'employee')) {
          res.status(403).json({
            success: false,
            error: `Role proof failed: ${employeeBadge} does not meet required ${challengeData.requiredBadge}`,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Verify the selective disclosure proof cryptographically
        let proofVerified = false;
        let bindingDigest: string | undefined;
        if (disclosedClaimsProof && typeof disclosedClaimsProof === 'object') {
          const proofResult = verifyDisclosedClaimsProof({
            challengeId,
            challengeText: challengeData.challenge,
            disclosedClaims: parsedDisclosedClaims,
            credential: credential || undefined,
            walletAddress: address,
            proof: disclosedClaimsProof as any,
          });
          proofVerified = proofResult.verified;
          bindingDigest = proofResult.bindingDigest;

          if (!proofVerified) {
            res.status(401).json({
              success: false,
              error: 'Selective disclosure proof verification failed',
              details: proofResult.reason,
              timestamp: new Date().toISOString(),
            });
            return;
          }
        }

        // Issue a scoped 15-minute token
        const scopedTokenPayload = {
          address,
          did: resolvedDid,
          badge: employeeBadge,
          scope: challengeData.scope,
          roleProofVerified: true,
          disclosedClaimsProofVerified: proofVerified,
          challengeId,
          authenticated: true,
          timestamp: new Date().toISOString(),
        };

        const scopedToken = jwt.sign(scopedTokenPayload, JWT_SECRET, {
          expiresIn: '15m',
          issuer: 'decentralized-trust-platform',
        });

        // Mark challenge as used
        challengeData.used = true;
        challengeData.userAddress = address;
        challengeData.did = resolvedDid;
        challengeData.badge = employeeBadge as BadgeType;
        challengeData.token = scopedToken;
        challengeData.disclosedClaims = parsedDisclosedClaims;
        challengeData.disclosedClaimsVerified = true;
        challengeData.disclosedClaimsProofVerified = proofVerified;
        challengeData.disclosedClaimsBindingDigest = bindingDigest;
        await persistChallengeState(challengeId, challengeData);

        addAuthTimelineEvent({
          eventType: 'verification_succeeded',
          status: 'success',
          reason: 'role_proof_verified',
          challengeId,
          did: resolvedDid,
          userAddress: address,
          employeeId: employee.id,
          metadata: {
            requiredBadge: challengeData.requiredBadge,
            provenBadge: employeeBadge,
            scope: challengeData.scope,
            proofVerified,
          },
        });

        console.log(`✅ Role proof verified: ${employee.id} proved badge=${employeeBadge} for scope=${challengeData.scope}`);

        res.json({
          success: true,
          data: {
            token: scopedToken,
            scope: challengeData.scope,
            badge: employeeBadge,
            roleProofVerified: true,
            disclosedClaimsProofVerified: proofVerified,
            expiresIn: '15m',
            challengeId,
          },
          message: 'Role proof successful',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      // ── End role-proof branch ──────────────────────────────────────────────

      const challengeEmployee = challengeData.employeeId ? getEmployeeById(challengeData.employeeId) : undefined;
      const resolvedEmployee = employeeId ? getEmployeeById(employeeId) : challengeEmployee;
      const resolvedAddress = address; // Always use verified address
      const resolvedDid = resolvedEmployee?.did || `did:ethr:${resolvedAddress}`;
      auditResolvedAddress = resolvedAddress;
      auditResolvedDid = resolvedDid;
      auditResolvedEmployeeId = resolvedEmployee?.id || challengeData.employeeId;

      addAuthTimelineEvent({
        eventType: 'verification_attempted',
        status: 'info',
        reason: 'verification_attempt_started',
        challengeId,
        did: resolvedDid,
        userAddress: resolvedAddress,
        employeeId: auditResolvedEmployeeId,
        companyId: challengeData.companyId,
        verifierId: verifierProfile.verifierId,
        verifierOrganizationId: verifierProfile.organizationId,
        verifierOrganizationName: verifierProfile.organizationName,
        requestType: challengeData.requestType,
      });

      if (did && did.toLowerCase() !== resolvedDid.toLowerCase()) {
        auditReason = 'did_mismatch';
        auditHttpStatus = 401;
        res.status(401).json({
          success: false,
          error: 'Provided DID does not match authenticated identity',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      let credentialVerified = false;
      let credentialIssuer: string | null = null;
      let credentialIssuerTrusted: boolean | null = null;
      let credentialId: string | null = null;
      let credentialStatus: string | null = null;
      let credentialFoundInRegistry: boolean | null = null;
      let credentialClaims: Partial<Record<VerifierClaimKey, string>> = {};
      if (credential) {
        try {
          const verifiedCredential = await verifyCredentialAgainstDid(credential, resolvedDid);
          credentialVerified = true;
          credentialIssuer = verifiedCredential.issuer;
          credentialIssuerTrusted = verifiedCredential.issuerTrusted;
          credentialId = verifiedCredential.credentialId;
          credentialStatus = verifiedCredential.credentialStatus;
          credentialFoundInRegistry = verifiedCredential.credentialFoundInRegistry;
          credentialClaims = {
            subjectDid: verifiedCredential.subjectDid,
            employeeId: verifiedCredential.employeeId,
            name: verifiedCredential.name,
            role: verifiedCredential.role,
            department: verifiedCredential.department,
            email: verifiedCredential.email,
          };
          console.log('✅ Optional credential verification successful for DID:', resolvedDid);
        } catch (credentialError: any) {
          console.error('❌ Optional credential verification failed:', credentialError.message);
          auditReason = 'credential_verification_failed';
          auditHttpStatus = 401;
          res.status(401).json({
            success: false,
            error: 'Credential verification failed',
            details: credentialError.message,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      let parsedDisclosedClaims: Partial<Record<VerifierClaimKey, string>>;
      try {
        parsedDisclosedClaims = parseDisclosedClaims(disclosedClaims);
      } catch (claimsParseError: any) {
        auditReason = 'invalid_disclosed_claims_payload';
        auditHttpStatus = 400;
        res.status(400).json({
          success: false,
          error: 'Invalid disclosedClaims payload',
          details: claimsParseError?.message || 'Unable to parse disclosedClaims',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const requiredClaims = challengeData.requestedClaims?.requiredClaims
        || resolveRequestedClaims(verifierProfile, challengeData.requestType);

      let parsedDisclosedClaimsProof: DisclosedClaimsProofPayload | undefined;
      try {
        parsedDisclosedClaimsProof = parseDisclosedClaimsProof(disclosedClaimsProof);
      } catch (proofParseError: any) {
        auditReason = 'invalid_disclosed_claims_proof_payload';
        auditHttpStatus = 400;
        res.status(400).json({
          success: false,
          error: 'Invalid disclosedClaimsProof payload',
          details: proofParseError?.message || 'Unable to parse disclosedClaimsProof',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const expectedClaims = buildExpectedClaimValues({
        resolvedDid,
        resolvedEmployee,
        credentialClaims,
      });
      const disclosedClaimsEvaluation = verifyDisclosedClaims({
        requiredClaims,
        disclosedClaims: parsedDisclosedClaims,
        expectedClaims,
      });

      if (!disclosedClaimsEvaluation.verified) {
        auditReason = 'selective_disclosure_verification_failed';
        auditHttpStatus = 403;
        res.status(403).json({
          success: false,
          error: 'Selective disclosure verification failed',
          details: {
            missingClaims: disclosedClaimsEvaluation.missingClaims,
            mismatchedClaims: disclosedClaimsEvaluation.mismatchedClaims,
            requiredClaims,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      let disclosedClaimsProofVerified = false;
      let disclosedClaimsBindingDigest: string | null = null;

      if (requiredClaims.length > 0) {
        if (!parsedDisclosedClaimsProof) {
          auditReason = 'selective_disclosure_proof_required';
          auditHttpStatus = 403;
          res.status(403).json({
            success: false,
            error: 'Selective disclosure proof is required',
            details: {
              requiredClaims,
              bindingVersion: DISCLOSURE_BINDING_VERSION,
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        const proofEvaluation = verifyDisclosedClaimsProof({
          challengeId,
          challengeText: challengeData.challenge,
          disclosedClaims: parsedDisclosedClaims,
          credential,
          walletAddress: resolvedAddress,
          proof: parsedDisclosedClaimsProof,
        });

        if (!proofEvaluation.verified) {
          auditReason = 'selective_disclosure_binding_failed';
          auditHttpStatus = 403;
          res.status(403).json({
            success: false,
            error: 'Selective disclosure cryptographic binding failed',
            details: {
              reason: proofEvaluation.reason,
              requiredClaims,
              bindingVersion: DISCLOSURE_BINDING_VERSION,
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        disclosedClaimsProofVerified = true;
        disclosedClaimsBindingDigest = proofEvaluation.bindingDigest || null;
      }

      const resolvedBadgeForPolicy = (resolvedEmployee?.badge || challengeData.badge || 'employee') as BadgeType;
      const policyEvaluation = evaluateVerifierPolicy(verifierProfile, {
        badge: resolvedBadgeForPolicy,
        requestType: challengeData.requestType,
        credentialProvided: Boolean(credential) || requiredClaims.length > 0,
        credentialVerified: credentialVerified || disclosedClaimsEvaluation.verified,
      });

      if (!policyEvaluation.allowed) {
        auditReason = 'verifier_policy_denied';
        auditHttpStatus = 403;
        res.status(403).json({
          success: false,
          error: 'Verifier policy denied authentication',
          details: policyEvaluation.reason,
          policy: policyEvaluation.policy,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Mark challenge as used immediately — signature is already verified above.
      // Blockchain recording is audit metadata; run it in the background so the
      // wallet gets a fast response instead of timing out after 30 s.
      challengeData.used = true;
      challengeData.userAddress = resolvedAddress;
      challengeData.did = resolvedDid;
      challengeData.employeeId = resolvedEmployee?.id || challengeData.employeeId;
      challengeData.employeeName = resolvedEmployee?.name || challengeData.employeeName;
      challengeData.badge = (resolvedEmployee?.badge || challengeData.badge || 'employee') as BadgeType;
      challengeData.permissions = resolvedEmployee?.permissions || challengeData.permissions || [];
      challengeData.hashId = resolvedEmployee?.hashId || challengeData.hashId;

      // Fire blockchain enrichment + recording in background
      if (resolvedEmployee) {
        enrichEmployeeWithOnChainProfile(resolvedEmployee)
          .then((employeeWithChain) => {
            challengeData.hashId = employeeWithChain?.hashId || challengeData.hashId;
            challengeData.didRegistrationTxHash = employeeWithChain?.didRegistrationTxHash || challengeData.didRegistrationTxHash;
            return recordEmployeeAuthenticationOnChain(
              employeeWithChain,
              challengeId,
              message,
              signature,
              { skipOnChainVerification: SHOULD_SKIP_ONCHAIN_VERIFY }
            );
          })
          .then((onChainAuth) => {
            challengeData.authRecordTxHash = onChainAuth?.authRecordTxHash;
            challengeData.authVerifyTxHash = onChainAuth?.authVerifyTxHash;
            console.log('✅ Background blockchain recording complete for challenge', challengeId);
          })
          .catch((err) => {
            console.warn('⚠️ Background blockchain recording failed:', err?.message);
          });
      }
      challengeData.adminGasPayerAddress = sepoliaService.getGasPayerAddress();
      challengeData.adminGasPayerEtherscanUrl = sepoliaService.getGasPayerEtherscanUrl();
      challengeData.verifierId = verifierProfile.verifierId;
      challengeData.verifierOrganizationId = verifierProfile.organizationId;
      challengeData.verifierOrganizationName = verifierProfile.organizationName;
      challengeData.verifierPolicyVersion = verifierProfile.policyVersion;
      challengeData.verifierCredentialRequired = verifierProfile.requireCredential;
      challengeData.disclosedClaims = parsedDisclosedClaims;
      challengeData.disclosedClaimsVerified = disclosedClaimsEvaluation.verified;
      challengeData.disclosedClaimsProofVerified = disclosedClaimsProofVerified;
      challengeData.disclosedClaimsBindingDigest = disclosedClaimsBindingDigest || undefined;

      // Generate JWT token
      const tokenPayload = {
        address: resolvedAddress,
        did: resolvedDid,
        employeeId: challengeData.employeeId,
        employeeName: challengeData.employeeName,
        badge: challengeData.badge,
        permissions: challengeData.permissions,
        hashId: challengeData.hashId,
        didRegistrationTxHash: challengeData.didRegistrationTxHash,
        authRecordTxHash: challengeData.authRecordTxHash,
        authVerifyTxHash: challengeData.authVerifyTxHash,
        adminGasPayerAddress: challengeData.adminGasPayerAddress,
        adminGasPayerEtherscanUrl: challengeData.adminGasPayerEtherscanUrl,
        challengeId: challengeId,
        authenticated: true,
        credentialProvided: Boolean(credential),
        credentialVerified,
        credentialIssuer,
        credentialIssuerTrusted,
        credentialId,
        credentialStatus,
        credentialFoundInRegistry,
        verifierId: verifierProfile.verifierId,
        verifierOrganizationId: verifierProfile.organizationId,
        verifierOrganizationName: verifierProfile.organizationName,
        verifierPolicyVersion: verifierProfile.policyVersion,
        verifierCredentialRequired: verifierProfile.requireCredential,
        requestedClaims: challengeData.requestedClaims,
        disclosedClaims: parsedDisclosedClaims,
        disclosedClaimsVerified: disclosedClaimsEvaluation.verified,
        disclosedClaimsProofVerified,
        disclosedClaimsBindingDigest,
        verifierPolicySatisfied: true,
        timestamp: new Date().toISOString()
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { 
        expiresIn: '24h',
        issuer: 'decentralized-trust-platform'
      });

      // Generate refresh token
      const refreshToken = generateRefreshToken();
      storeRefreshToken(
        refreshToken,
        resolvedAddress,
        resolvedDid,
        7, // 7 days
        undefined, // deviceInfo
        challengeData.badge as string,
        challengeData.permissions as string[],
        credentialVerified,
      );

      // Store token in challenge data for future reference
      challengeData.token = token;
      challengeData.refreshToken = refreshToken;

      await persistChallengeState(challengeId, challengeData);

      // Clean up expired challenges
      await cleanupExpiredChallenges();

      auditStatus = 'success';
      auditReason = 'verification_succeeded';
      auditHttpStatus = 200;
      auditResolvedAddress = resolvedAddress;
      auditResolvedDid = resolvedDid;
      auditResolvedEmployeeId = challengeData.employeeId;

      res.status(200).json({
        success: true,
        data: {
          token: token,
          refreshToken: refreshToken,
          address: resolvedAddress,
          did: resolvedDid,
          employee: resolvedEmployee || null,
          badge: challengeData.badge,
          permissions: challengeData.permissions,
          hashId: challengeData.hashId,
          didRegistrationTxHash: challengeData.didRegistrationTxHash,
          authRecordTxHash: challengeData.authRecordTxHash,
          authVerifyTxHash: challengeData.authVerifyTxHash,
          adminGasPayerAddress: challengeData.adminGasPayerAddress,
          adminGasPayerEtherscanUrl: challengeData.adminGasPayerEtherscanUrl,
          credentialProvided: Boolean(credential),
          credentialVerified,
          credentialIssuer,
          credentialIssuerTrusted,
          credentialId,
          credentialStatus,
          credentialFoundInRegistry,
          verifierId: verifierProfile.verifierId,
          verifierOrganizationId: verifierProfile.organizationId,
          verifierOrganizationName: verifierProfile.organizationName,
          verifierPolicyVersion: verifierProfile.policyVersion,
          verifierCredentialRequired: verifierProfile.requireCredential,
          requestedClaims: challengeData.requestedClaims,
          disclosedClaims: parsedDisclosedClaims,
          disclosedClaimsVerified: disclosedClaimsEvaluation.verified,
          disclosedClaimsProofVerified,
          disclosedClaimsBindingDigest,
          verifierPolicySatisfied: true,
          challengeId: challengeId,
          expiresIn: '24h'
        },
        message: 'Authentication successful',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Signature verification error:', error);
      auditReason = 'verification_runtime_exception';
      auditHttpStatus = 401;
      res.status(401).json({
        success: false,
        error: 'Signature verification failed',
        timestamp: new Date().toISOString()
      });
      return;
    }

  } catch (error: any) {
    console.error('Verify endpoint error:', error);
    auditReason = 'verify_endpoint_exception';
    auditHttpStatus = 500;
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  } finally {
    try {
      addAuthTimelineEvent({
        eventType: auditStatus === 'success' ? 'verification_succeeded' : 'verification_failed',
        status: auditStatus,
        reason: auditReason,
        challengeId: requestedChallengeId,
        did: auditResolvedDid || requestedDid,
        userAddress: auditResolvedAddress || requestedAddress,
        employeeId: auditResolvedEmployeeId || auditChallengeData?.employeeId || requestedEmployeeId,
        companyId: auditChallengeData?.companyId,
        verifierId: auditVerifierProfile?.verifierId || auditChallengeData?.verifierId || requestedVerifierId,
        verifierOrganizationId: auditVerifierProfile?.organizationId || auditChallengeData?.verifierOrganizationId,
        verifierOrganizationName: auditVerifierProfile?.organizationName || auditChallengeData?.verifierOrganizationName,
        requestType: auditChallengeData?.requestType,
        metadata: {
          httpStatus: auditHttpStatus,
          credentialProvided: Boolean(req.body?.credential),
          disclosedClaimsProvided: Boolean(req.body?.disclosedClaims),
        },
      });
    } catch (auditError) {
      console.warn('⚠️ Failed to record auth timeline event:', auditError);
    }
  }
});

/**
 * POST /api/auth/login
 * Enhanced credential-aware authentication endpoint
 * Expects: { did, signature, credential }
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { did, signature, credential, challengeId, message } = req.body;

    // Validate required fields
    if (!did || !signature || !credential || !challengeId || !message) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: did, signature, credential, challengeId, message',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('🔐 Starting credential-aware authentication for DID:', did);

    // Step 1: Verify the signature (existing authentication logic)
    const challengeData = await getChallenge(challengeId);
    if (!challengeData) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired challenge',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (challengeData.used) {
      res.status(400).json({
        success: false,
        error: 'Challenge has already been used',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge has expired
    const now = Date.now();
    if (isChallengeExpired(challengeData, now)) {
      await deleteChallenge(challengeId);
      res.status(400).json({
        success: false,
        error: 'Challenge has expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Extract address from DID
    const addressMatch = did.match(/did:ethr:0x([a-fA-F0-9]{40})/);
    if (!addressMatch) {
      res.status(400).json({
        success: false,
        error: 'Invalid DID format',
        timestamp: new Date().toISOString()
      });
      return;
    }
    const userAddress = `0x${addressMatch[1]}`;

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
      res.status(401).json({
        success: false,
        error: 'Signature verification failed - address mismatch',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!message.includes(challengeData.challenge)) {
      res.status(401).json({
        success: false,
        error: 'Invalid challenge in signed message',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('✅ Step 1: Signature verification successful');

    // Step 2: Verify the Verifiable Credential
    try {
      const verifiedCredential = await verifyCredentialAgainstDid(credential, did);

      console.log('✅ Step 2: Credential verification successful');
      
      // Step 3: Extract role and employee information
      const employeeRole = verifiedCredential.role;
      const employeeId = verifiedCredential.employeeId;
      const employeeName = verifiedCredential.name;
      const employeeDepartment = verifiedCredential.department;
      const employeeEmail = verifiedCredential.email;

      console.log('👤 Authenticated user:', {
        name: employeeName,
        role: employeeRole,
        department: employeeDepartment,
        employeeId
      });

      // Step 4: Generate enhanced JWT token with role claims
      const enhancedTokenPayload = {
        did: did,
        address: userAddress,
        employeeId: employeeId,
        name: employeeName,
        role: employeeRole,
        department: employeeDepartment,
        email: employeeEmail,
        badge: challengeData.badge || 'employee',
        permissions: challengeData.permissions || [],
        challengeId: challengeId,
        authenticated: true,
        credentialVerified: true,
        credentialId: verifiedCredential.credentialId,
        credentialStatus: verifiedCredential.credentialStatus,
        credentialFoundInRegistry: verifiedCredential.credentialFoundInRegistry,
        credentialIssuer: verifiedCredential.issuer,
        credentialIssuerTrusted: verifiedCredential.issuerTrusted,
        isAdmin: employeeRole === 'HR Director', // Admin check based on role
        timestamp: new Date().toISOString()
      };

      const enhancedToken = jwt.sign(enhancedTokenPayload, JWT_SECRET, { 
        expiresIn: '24h',
        issuer: 'decentralized-trust-platform'
      });

      const credentialRefreshToken = generateRefreshToken();
      storeRefreshToken(
        credentialRefreshToken,
        userAddress,
        did,
        7, // 7 days
        undefined, // deviceInfo
        (challengeData.badge || 'employee') as string,
        (challengeData.permissions || []) as string[],
        true, // credentialVerified
      );

      // Mark challenge as used and store enhanced token
      challengeData.used = true;
      challengeData.userAddress = userAddress;
      challengeData.did = did;
      challengeData.token = enhancedToken;
      challengeData.refreshToken = credentialRefreshToken;

      await persistChallengeState(challengeId, challengeData);

      // Clean up expired challenges
      await cleanupExpiredChallenges();

      res.status(200).json({
        success: true,
        data: {
          token: enhancedToken,
          refreshToken: credentialRefreshToken,
          user: {
            did: did,
            address: userAddress,
            employeeId: employeeId,
            name: employeeName,
            role: employeeRole,
            department: employeeDepartment,
            email: employeeEmail,
            credentialId: verifiedCredential.credentialId,
            credentialStatus: verifiedCredential.credentialStatus,
            credentialFoundInRegistry: verifiedCredential.credentialFoundInRegistry,
            credentialIssuer: verifiedCredential.issuer,
            credentialIssuerTrusted: verifiedCredential.issuerTrusted,
            isAdmin: employeeRole === 'HR Director'
          },
          challengeId: challengeId,
          expiresIn: '24h'
        },
        message: 'Credential-based authentication successful',
        timestamp: new Date().toISOString()
      });

    } catch (credentialError: any) {
      console.error('❌ Credential verification failed:', credentialError.message);
      res.status(401).json({
        success: false,
        error: 'Credential verification failed',
        details: credentialError.message,
        timestamp: new Date().toISOString()
      });
      return;
    }

  } catch (error: any) {
    console.error('❌ Login endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/auth/session-status
 * 
 * Returns the current session status including access level.
 * Used by web portal for polling to detect premium access upgrades.
 */
router.get('/session-status', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📊 Session status check for user:', req.user?.address?.substring(0, 10) + '...');

    const sessionInfo = {
      authenticated: true,
      address: req.user?.address,
      accessLevel: req.user?.accessLevel || 'standard',
      premiumGrantedAt: req.user?.premiumGrantedAt,
      sessionActive: true,
      tokenExpiresAt: req.user?.exp ? new Date(req.user.exp * 1000).toISOString() : null,
      lastChecked: new Date().toISOString()
    };

    console.log('✅ Session status:', {
      accessLevel: sessionInfo.accessLevel,
      premiumAccess: sessionInfo.accessLevel === 'premium',
      tokenValid: true
    });

    addAuthTimelineEvent({
      eventType: 'session_status_checked',
      status: 'info',
      reason: 'session_status_polled',
      challengeId: req.user?.challengeId,
      did: req.user?.did,
      userAddress: req.user?.address,
      employeeId: req.user?.employeeId,
      verifierId: req.user?.verifierId,
      verifierOrganizationId: req.user?.verifierOrganizationId,
      verifierOrganizationName: req.user?.verifierOrganizationName,
      metadata: {
        accessLevel: sessionInfo.accessLevel,
      },
    });

    res.status(200).json({
      success: true,
      data: sessionInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Session status check failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Session check failed',
      message: 'Unable to retrieve session status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Helper function to clean up expired challenges
 */
async function cleanupExpiredChallenges(): Promise<void> {
  const now = Date.now();
  const challengeIds = await getAllChallengeIds();

  for (const challengeId of challengeIds) {
    const challengeData = await getChallenge(challengeId);
    if (!challengeData) {
      continue;
    }

    if (isChallengeExpired(challengeData, now)) {
      addAuthTimelineEvent({
        eventType: 'challenge_expired',
        status: 'info',
        reason: 'expired_by_cleanup_job',
        challengeId,
        did: challengeData.did,
        userAddress: challengeData.userAddress,
        employeeId: challengeData.employeeId,
        companyId: challengeData.companyId,
        verifierId: challengeData.verifierId,
        verifierOrganizationId: challengeData.verifierOrganizationId,
        verifierOrganizationName: challengeData.verifierOrganizationName,
        requestType: challengeData.requestType,
      });
      await deleteChallenge(challengeId);
    }
  }
}

// Clean up expired challenges every 10 minutes
setInterval(() => {
  void cleanupExpiredChallenges().catch((error) => {
    console.warn('⚠️ Challenge cleanup job failed:', error);
  });
}, 10 * 60 * 1000);

/**
 * POST /api/auth/sepolia-verify
 * Enhanced authentication with Sepolia blockchain integration
 */
router.post('/sepolia-verify', authRateLimiter, validateBody(authSchemas.sepoliaVerify), async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      challengeId, 
      signature, 
      address, 
      message, 
      storeOnChain = true 
    } = req.body;

    console.log('🔗 Starting Sepolia blockchain authentication:', {
      challengeId,
      address,
      storeOnChain,
      serviceConfigured: sepoliaService.isConfigured(),
      serviceReady: sepoliaService.isReady()
    });

    // Validation
    if (!challengeId || !signature || !address || !message) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: challengeId, signature, address, message',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge exists and is valid
    console.log('🔍 Sepolia-verify: Looking for challengeId:', challengeId);
    const availableChallengeIds = await listChallengeIds();
    console.log('📋 Sepolia-verify: Available challenges:', availableChallengeIds);
    
    const challengeData = await getChallenge(challengeId);
    if (!challengeData) {
      console.log('❌ Sepolia-verify: Challenge not found in memory');
      res.status(400).json({
        success: false,
        error: 'Invalid or expired challenge',
        details: `Challenge ${challengeId} not found. Available: ${availableChallengeIds.join(', ')}`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge has already been used
    if (challengeData.used) {
      res.status(400).json({
        success: false,
        error: 'Challenge has already been used',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if challenge has expired
    const now = Date.now();
    if (isChallengeExpired(challengeData, now)) {
      await deleteChallenge(challengeId);
      res.status(400).json({
        success: false,
        error: 'Challenge has expired',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Step 1: Off-chain signature verification (fast)
    let isSignatureValid = false;
    try {
      // SECURITY: Always verify signatures - no dev mode bypass
      console.log('🔐 Sepolia-verify: Verifying Ethereum signature');
      
      let recoveredAddress = '';

      try {
        recoveredAddress = ethers.verifyMessage(message, signature);
        isSignatureValid = recoveredAddress.toLowerCase() === address.toLowerCase();
        console.log('🔐 Sepolia-verify signature result:', {
          isSignatureValid,
          expectedAddress: address,
          recoveredAddress
        });
      } catch (error) {
        console.error('Sepolia-verify Signature verification failed:', error);
        isSignatureValid = false;
      }
      
      if (!isSignatureValid || recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        console.log('❌ Sepolia-verify Signature verification failed:', {
          isSignatureValid,
          expectedAddress: address,
          recoveredAddress
        });
        res.status(401).json({
          success: false,
          error: 'Invalid signature',
          verification: {
            offChain: {
              signatureValid: false,
              reason: 'Signature does not match address'
            }
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify message contains challenge
      if (!message.includes(challengeData.challenge)) {
        console.log('❌ Sepolia-verify Challenge not found in message:', {
          message: message.substring(0, 100) + '...',
          expectedChallenge: challengeData.challenge.substring(0, 20) + '...'
        });
        res.status(401).json({
          success: false,
          error: 'Invalid challenge in signed message',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log('✅ Sepolia-verify Off-chain signature verification passed');

    } catch (error: any) {
      res.status(401).json({
        success: false,
        error: 'Signature verification failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Step 2: Blockchain operations (ASYNC - don't block response!)
    let blockchainResults = null;
    let blockchainPending = false;
    
    if (storeOnChain && sepoliaService.isConfigured()) {
      console.log('💾 Starting blockchain operations on Sepolia (ASYNC)...');
      blockchainPending = true;

      // Convert to checksummed address for blockchain operations
      const checksummedAddress = ethers.getAddress(address.toLowerCase());

      // ⚡ Process blockchain operations in background (don't await!)
      (async () => {
        try {
          console.log('🔄 Background: Starting blockchain operations...');
          
          // Check if employee DID is registered
          const didInfo = await sepoliaService.getEmployeeDIDInfo(checksummedAddress);
          let registrationResult = null;

          if (!didInfo.success || !didInfo.didInfo?.isActive) {
            console.log('📝 Background: Registering employee DID on Sepolia...');
            
            const did = `did:ethr:${checksummedAddress}`;
            const publicKeyJwk = JSON.stringify({
              kty: 'EC',
              crv: 'secp256k1',
              use: 'sig',
              x: checksummedAddress.substring(2, 34),
              y: checksummedAddress.substring(34, 66)
            });

            registrationResult = await sepoliaService.registerEmployeeDID(
              checksummedAddress,
              did,
              publicKeyJwk
            );
            
            if (registrationResult.success) {
              console.log('✅ Background: DID registration completed:', registrationResult.txHash);
            }
          }

          // Record authentication on blockchain
          console.log('📝 Background: Recording authentication...');
          const authRecordResult = await sepoliaService.recordAuthentication(
            challengeId,
            message,
            checksummedAddress
          );
          
          if (authRecordResult.success) {
            console.log('✅ Background: Authentication recorded:', authRecordResult.txHash);
          }

          // Verify authentication on blockchain
          console.log('🔍 Background: Verifying authentication...');
          const verificationResult = await sepoliaService.verifyAuthentication(
            challengeId,
            signature
          );
          
          if (verificationResult.success) {
            console.log('✅ Background: Blockchain verification completed:', verificationResult.txHash);
          }

          // Store results in challenge data for later retrieval
          if (challengeData) {
            challengeData.blockchainResults = {
              registration: registrationResult,
              authRecord: authRecordResult,
              verification: verificationResult,
              didInfo: didInfo.didInfo,
              completedAt: new Date().toISOString()
            };
            await persistChallengeState(challengeId, challengeData);
          }

          console.log('🎉 Background: All blockchain operations completed successfully!');
        } catch (error: any) {
          console.error('❌ Background: Blockchain operations failed:', error);
          if (challengeData) {
            challengeData.blockchainError = error?.message || 'Unknown blockchain error';
            await persistChallengeState(challengeId, challengeData);
          }
        }
      })(); // Execute immediately but don't wait for completion

      console.log('⚡ Response will be sent immediately (blockchain operations continue in background)');
      
    } else if (storeOnChain && !sepoliaService.isConfigured()) {
      console.warn('⚠️ Blockchain storage requested but Sepolia service not configured');
    }

    // Step 3: Mark challenge as used and generate token
    challengeData.used = true;
    challengeData.userAddress = ethers.getAddress(address.toLowerCase()); // Use checksummed address
    challengeData.did = `did:ethr:${ethers.getAddress(address.toLowerCase())}`;

    // Generate JWT token
    const checksummedAddressForToken = ethers.getAddress(address.toLowerCase());
    const tokenPayload = {
      address: checksummedAddressForToken,
      did: `did:ethr:${checksummedAddressForToken}`,
      badge: challengeData.badge || 'employee',
      permissions: challengeData.permissions || [],
      challengeId: challengeId,
      authenticated: true,
      blockchainPending: blockchainPending, // Indicate blockchain ops are in progress
      timestamp: new Date().toISOString()
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '24h',
      issuer: 'decentralized-trust-platform'
    });

    // Generate refresh token
    const refreshToken = generateRefreshToken();
    storeRefreshToken(
      refreshToken,
      checksummedAddressForToken,
      `did:ethr:${checksummedAddressForToken}`,
      7, // 7 days
      undefined, // deviceInfo
      (challengeData.badge || 'employee') as string,
      (challengeData.permissions || []) as string[],
    );

    challengeData.token = token;
    challengeData.refreshToken = refreshToken;

    await persistChallengeState(challengeId, challengeData);

    // Success response (sent immediately, blockchain operations continue in background)
    const response = {
      success: true,
      message: blockchainPending 
        ? 'Authentication successful - Blockchain operations processing in background'
        : 'Authentication successful',
      user: {
        address,
        did: `did:ethr:${address}`
      },
      verification: {
        offChain: {
          signatureValid: isSignatureValid,
          timestamp: new Date().toISOString()
        },
        blockchain: blockchainPending ? {
          status: 'pending',
          message: 'Blockchain operations are being processed. Check /sepolia-history/:address for results.'
        } : null
      },
      links: {
        faucet: 'https://sepoliafaucet.com/',
        explorer: 'https://sepolia.etherscan.io',
        statusCheck: `/api/auth/blockchain-status/${challengeId}`
      },
      token,
      refreshToken,
      expiresIn: '24h',
      timestamp: new Date().toISOString()
    };

    console.log('✅ Sepolia authentication response sent immediately:', {
      address,
      blockchainPending,
      responseTime: Date.now() - challengeData.timestamp + 'ms'
    });

    res.json(response);

  } catch (error: any) {
    console.error('❌ Sepolia blockchain authentication error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Blockchain authentication failed',
      details: error.message,
      service: {
        configured: sepoliaService.isConfigured(),
        config: sepoliaService.getConfig()
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/auth/blockchain-status/:challengeId
 * Check the status of blockchain operations for a specific challenge
 */
router.get('/blockchain-status/:challengeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { challengeId } = req.params;
    
    const challengeData = await getChallenge(challengeId);
    
    if (!challengeData) {
      res.status(404).json({
        success: false,
        error: 'Challenge not found or expired',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Check if blockchain operations have completed
    const blockchainResults = (challengeData as any).blockchainResults;
    const blockchainError = (challengeData as any).blockchainError;
    
    if (blockchainResults) {
      res.json({
        success: true,
        status: 'completed',
        challengeId,
        blockchain: {
          registration: blockchainResults.registration,
          authRecord: blockchainResults.authRecord,
          verification: blockchainResults.verification,
          didInfo: blockchainResults.didInfo,
          completedAt: blockchainResults.completedAt
        },
        links: {
          etherscan: blockchainResults.verification?.txHash
            ? `https://sepolia.etherscan.io/tx/${blockchainResults.verification.txHash}`
            : null
        },
        timestamp: new Date().toISOString()
      });
    } else if (blockchainError) {
      res.json({
        success: false,
        status: 'failed',
        challengeId,
        error: blockchainError,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: true,
        status: 'pending',
        challengeId,
        message: 'Blockchain operations are still in progress',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to check blockchain status',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/auth/sepolia-status
 * Get Sepolia network status and contract information
 */
router.get('/sepolia-status', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!sepoliaService.isConfigured()) {
      res.json({
        success: false,
        error: 'Sepolia service not configured',
        setup: {
          required: [
            'SEPOLIA_RPC_URL',
            'SEPOLIA_CONTRACT_ADDRESS', 
            'PLATFORM_PRIVATE_KEY'
          ],
          faucets: [
            'https://sepoliafaucet.com/',
            'https://www.infura.io/faucet/sepolia'
          ]
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const networkStatus = await sepoliaService.getNetworkStatus();
    const config = sepoliaService.getConfig();

    res.json({
      success: networkStatus.success,
      network: networkStatus.status,
      configuration: {
        rpcUrl: config.rpcUrl,
        contractAddress: config.contractAddress,
        chainId: config.chainId,
        walletAddress: config.walletAddress
      },
      links: {
        explorer: 'https://sepolia.etherscan.io',
        faucet: 'https://sepoliafaucet.com/',
        contract: config.contractAddress 
          ? `https://sepolia.etherscan.io/address/${config.contractAddress}`
          : null
      },
      error: networkStatus.error,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to get Sepolia network status',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/auth/sepolia-history/:address
 * Get employee's blockchain authentication history
 */
router.get('/sepolia-history/:address', async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!sepoliaService.isConfigured()) {
      res.status(503).json({
        success: false,
        error: 'Sepolia service not configured',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const didInfo = await sepoliaService.getEmployeeDIDInfo(address);

    res.json({
      success: didInfo.success,
      address,
      did: `did:ethr:${address}`,
      blockchain: didInfo.didInfo || null,
      links: {
        etherscan: `https://sepolia.etherscan.io/address/${address}`,
        profile: didInfo.didInfo?.did || null
      },
      error: didInfo.error,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to get authentication history',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh an expired or near-expired access token using a refresh token
 */
router.post('/refresh', authRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validate refresh token
    const tokenRecord = getRefreshToken(refreshToken);

    if (!tokenRecord) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Generate new access token with same payload (preserving badge/permissions)
    const newTokenPayload = {
      address: tokenRecord.userId,
      did: tokenRecord.did,
      badge: tokenRecord.badge || 'employee',
      permissions: tokenRecord.permissions || [],
      credentialVerified: tokenRecord.credentialVerified || false,
      authenticated: true,
      refreshed: true,
      originalIssueDate: tokenRecord.createdAt.toISOString(),
      timestamp: new Date().toISOString()
    };

    const newAccessToken = jwt.sign(newTokenPayload, JWT_SECRET, {
      expiresIn: '24h',
      issuer: 'decentralized-trust-platform'
    });

    // Optionally issue a new refresh token (rotation strategy)
    const newRefreshToken = generateRefreshToken();
    storeRefreshToken(
      newRefreshToken,
      tokenRecord.userId,
      tokenRecord.did,
      7, // 7 days
      tokenRecord.deviceInfo,
      tokenRecord.badge,
      tokenRecord.permissions,
      tokenRecord.credentialVerified,
    );

    // Revoke the old refresh token
    revokeRefreshToken(refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: '24h',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/auth/logout
 * Revoke refresh token and invalidate session
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const revoked = revokeRefreshToken(refreshToken);
      
      res.json({
        success: true,
        message: revoked ? 'Logged out successfully' : 'Already logged out',
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ─── ZK Role Auth (real Groth16) ─────────────────────────────────────────────

const zkProofService = new ZKProofService();

// Role-to-field-element mapping (matches ZKRoleGate frontend constants)
const ROLE_HASHES: Record<string, string> = {
  employee: '1000',
  manager:  '1001',
  auditor:  '1002',
  admin:    '1003',
};

/**
 * GET /api/auth/zk-identity
 * Returns whether the authenticated employee has a registered ZK identity.
 */
router.get('/zk-identity', verifyAuthToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const address = req.user?.address;
    if (!address) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    const employee = getEmployeeByAddress(address);
    if (!employee) { res.status(404).json({ success: false, error: 'Employee not found' }); return; }
    res.json({ success: true, data: { hasZkIdentity: !!employee.zkAddress } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/zk-identity
 * Stores the employee's ZK address and per-role merkle roots (one-time setup).
 * Body: { zkAddress: string, merkleRoots: { employee, manager, auditor, admin } }
 */
router.post('/zk-identity', verifyAuthToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const address = req.user?.address;
    if (!address) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    const employee = getEmployeeByAddress(address);
    if (!employee) { res.status(404).json({ success: false, error: 'Employee not found' }); return; }

    const { zkAddress, merkleRoots } = req.body as { zkAddress?: string; merkleRoots?: Record<string, string> };
    if (!zkAddress || !/^\d+$/.test(zkAddress)) {
      res.status(400).json({ success: false, error: 'zkAddress must be a decimal string' }); return;
    }
    if (!merkleRoots || typeof merkleRoots !== 'object') {
      res.status(400).json({ success: false, error: 'merkleRoots object is required' }); return;
    }

    setEmployeeZkData(employee.id, zkAddress, merkleRoots as Partial<Record<BadgeType, string>>);
    console.log(`✅ ZK identity registered for employee ${employee.id}`);
    res.json({ success: true, message: 'ZK identity registered' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/zk-role-challenge
 * Issues a challenge for a real Groth16 role proof.
 * Returns the merkleRoot the prover must target (from their registered identity).
 * Body: { requiredBadge: string, scope: string }
 */
router.post('/zk-role-challenge', verifyAuthToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const address = req.user?.address;
    if (!address) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    const { requiredBadge, scope } = req.body as { requiredBadge?: string; scope?: string };
    if (!requiredBadge || !ROLE_HASHES[requiredBadge]) {
      res.status(400).json({ success: false, error: 'requiredBadge is required (employee|manager|auditor|admin)' }); return;
    }
    if (!scope) { res.status(400).json({ success: false, error: 'scope is required' }); return; }

    const employee = getEmployeeByAddress(address);
    if (!employee || !employee.active) {
      res.status(401).json({ success: false, error: 'No active employee found' }); return;
    }
    if (!badgeMeetsRequirement(employee.badge, requiredBadge)) {
      res.status(403).json({ success: false, error: `Your badge (${employee.badge}) does not meet required (${requiredBadge})` }); return;
    }
    if (!employee.zkAddress || !employee.merkleRoots?.[requiredBadge as BadgeType]) {
      res.status(400).json({ success: false, error: 'ZK identity not registered. Visit the ZK setup first.' }); return;
    }

    const challengeId = crypto.randomUUID();
    const timestamp = Date.now();
    const roleHash = ROLE_HASHES[requiredBadge];
    const merkleRoot = employee.merkleRoots![requiredBadge as BadgeType]!;

    await setChallenge(challengeId, {
      challenge: `zk-role:${requiredBadge}:${scope}:${timestamp}`,
      timestamp,
      used: false,
      challengeType: 'zk_groth16_role',
      requiredBadge: requiredBadge as BadgeType,
      scope,
      badge: employee.badge,
      permissions: [],
      requestType: 'general_auth',
      requestedClaims: { requestType: 'general_auth', requiredClaims: ['role'], policyVersion: 1, proofRequired: true, bindingVersion: DISCLOSURE_BINDING_VERSION },
      userAddress: address,
      // Store expected values for verification
      zkRoleHash: roleHash,
      zkMerkleRoot: merkleRoot,
    } as any, CHALLENGE_EXPIRY_SECONDS);

    res.json({
      success: true,
      data: { challengeId, roleHash, merkleRoot, requiredBadge, scope, timestamp },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/zk-role-verify
 * Verifies a real Groth16 role proof and issues a 15-minute scoped token.
 * Body: { challengeId, proof, publicSignals }
 */
router.post('/zk-role-verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { challengeId, proof, publicSignals } = req.body as {
      challengeId?: string;
      proof?: any;
      publicSignals?: string[];
    };

    if (!challengeId || !proof || !publicSignals) {
      res.status(400).json({ success: false, error: 'challengeId, proof, and publicSignals are required' }); return;
    }

    const challengeData = await getChallenge(challengeId) as any;
    if (!challengeData || challengeData.used || isChallengeExpired(challengeData)) {
      res.status(401).json({ success: false, error: 'Challenge expired or already used' }); return;
    }
    if (challengeData.challengeType !== 'zk_groth16_role') {
      res.status(400).json({ success: false, error: 'Wrong challenge type' }); return;
    }

    const result = await zkProofService.verifyRoleProof(
      proof,
      publicSignals,
      challengeData.zkRoleHash,
      challengeData.zkMerkleRoot,
    );

    if (!result.valid) {
      res.status(401).json({ success: false, error: `ZK proof invalid: ${result.reason}` }); return;
    }

    // Mark challenge used
    challengeData.used = true;
    await persistChallengeState(challengeId, challengeData);

    // Find employee
    const employee = getEmployeeByAddress(challengeData.userAddress);
    if (!employee || !employee.active) {
      res.status(401).json({ success: false, error: 'Employee not found' }); return;
    }

    const scopedToken = jwt.sign(
      {
        address: challengeData.userAddress,
        did: employee.did,
        badge: employee.badge,
        scope: challengeData.scope,
        roleProofVerified: true,
        zkProofVerified: true,
        challengeId,
        authenticated: true,
      },
      process.env.JWT_SECRET || 'development-only-secret-not-for-production',
      { expiresIn: '15m', issuer: 'decentralized-trust-platform' },
    );

    challengeData.token = scopedToken;
    await persistChallengeState(challengeId, challengeData);

    console.log(`✅ Groth16 role proof verified for ${employee.id}, scope=${challengeData.scope}`);

    res.json({
      success: true,
      data: { token: scopedToken, scope: challengeData.scope, badge: employee.badge, expiresIn: '15m' },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/zk-wallet-challenge
 * Creates a ZK wallet-prove challenge for the portal QR display.
 * Requires the user to be logged in (verifyAuthToken).
 * Body: { requiredBadge, scope }
 */
router.post('/zk-wallet-challenge', verifyAuthToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const address = req.user?.address;
    if (!address) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    const { requiredBadge, scope } = req.body as { requiredBadge?: string; scope?: string };
    if (!requiredBadge || !ROLE_HASHES[requiredBadge]) {
      res.status(400).json({ success: false, error: 'requiredBadge required (employee|manager|auditor|admin)' }); return;
    }
    if (!scope) { res.status(400).json({ success: false, error: 'scope required' }); return; }

    const employee = getEmployeeByAddress(address);
    if (!employee || !employee.active) {
      res.status(401).json({ success: false, error: 'No active employee found' }); return;
    }
    if (!badgeMeetsRequirement(employee.badge, requiredBadge)) {
      res.status(403).json({ success: false, error: `Your badge (${employee.badge}) does not meet required (${requiredBadge})` }); return;
    }

    const challengeId = crypto.randomUUID();
    const timestamp = Date.now();

    await setChallenge(challengeId, {
      challenge: `zk-wallet-prove:${requiredBadge}:${scope}:${timestamp}`,
      timestamp,
      used: false,
      challengeType: 'zk_wallet_prove_request',
      requiredBadge: requiredBadge as BadgeType,
      scope,
      badge: employee.badge,
      permissions: [],
      requestType: 'general_auth',
      requestedClaims: { requestType: 'general_auth', requiredClaims: ['role'], policyVersion: 1, proofRequired: true, bindingVersion: DISCLOSURE_BINDING_VERSION },
      userAddress: address,
    } as any, CHALLENGE_EXPIRY_SECONDS);

    res.json({
      success: true,
      data: { challengeId, requiredBadge, scope, expiresAt: timestamp + CHALLENGE_EXPIRY_TIME },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/zk-wallet-prove
 * Called by the mobile wallet after scanning the ZK challenge QR.
 * Wallet sends its ZK private key; server generates + verifies the Groth16 proof,
 * then issues a scoped 15-minute token and marks the challenge as used.
 * Body: { challengeId, address, signature, message, zkPrivKey }
 */
router.post('/zk-wallet-prove', async (req: Request, res: Response): Promise<void> => {
  try {
    const { challengeId, address, signature, message, zkPrivKey, proof, publicSignals } = req.body as {
      challengeId?: string;
      address?: string;
      signature?: string;
      message?: string;
      zkPrivKey?: string;
      proof?: any;
      publicSignals?: string[];
    };

    // Detect mode: client-side proof (true ZKP) vs server-side generation (legacy)
    const isClientProof = proof && Array.isArray(publicSignals);

    if (!challengeId || !address || !signature || !message) {
      res.status(400).json({ success: false, error: 'challengeId, address, signature, message are required' }); return;
    }
    if (!isClientProof && !zkPrivKey) {
      res.status(400).json({ success: false, error: 'Either {proof, publicSignals} or zkPrivKey is required' }); return;
    }
    if (!isClientProof && !/^[0-9a-fA-F]{64}$/.test(zkPrivKey!)) {
      res.status(400).json({ success: false, error: 'zkPrivKey must be 64 hex characters' }); return;
    }

    // Verify ECDSA signature — proves wallet owns the address
    let recovered: string;
    try {
      recovered = ethers.verifyMessage(message, signature);
    } catch {
      res.status(401).json({ success: false, error: 'Invalid signature' }); return;
    }
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      res.status(401).json({ success: false, error: 'Signature address mismatch' }); return;
    }

    // Validate challenge
    const challengeData = await getChallenge(challengeId) as any;
    if (!challengeData || challengeData.used || isChallengeExpired(challengeData)) {
      res.status(401).json({ success: false, error: 'Challenge expired or already used' }); return;
    }
    if (challengeData.challengeType !== 'zk_wallet_prove_request') {
      res.status(400).json({ success: false, error: 'Wrong challenge type' }); return;
    }

    // Look up employee
    const employee = getEmployeeByAddress(address);
    if (!employee || !employee.active) {
      res.status(401).json({ success: false, error: 'No active employee found' }); return;
    }

    const requiredBadge = challengeData.requiredBadge as string;
    if (!badgeMeetsRequirement(employee.badge, requiredBadge)) {
      res.status(403).json({ success: false, error: `Badge ${employee.badge} does not meet required ${requiredBadge}` }); return;
    }

    console.log(`\n🔐 ── ZK-WALLET-PROVE REQUEST ──────────────────────────────────`);
    console.log(`   ChallengeId : ${challengeId}`);
    console.log(`   Employee    : ${employee.id} (${employee.badge})`);
    console.log(`   Address     : ${address}`);
    console.log(`   Required    : ${requiredBadge} badge`);
    console.log(`   Scope       : ${challengeData.scope}`);
    console.log(`   ECDSA sig   : verified ✓ (wallet owns address)`);
    console.log(`   Mode        : ${isClientProof ? '🛡️  CLIENT-SIDE PROOF (true ZKP — private key never left device)' : '⚠️  SERVER-SIDE GENERATION (legacy — private key sent to server)'}`);

    let result: { valid: boolean; merkleRoot?: string; reason?: string };

    if (isClientProof) {
      // ── TRUE ZKP: wallet generated the proof, we only verify ──
      const roleHash = ROLE_HASHES[requiredBadge];
      if (!roleHash) {
        res.status(400).json({ success: false, error: `Unknown badge: ${requiredBadge}` }); return;
      }
      const expectedMerkleRoot = employee.merkleRoots?.[requiredBadge as BadgeType];
      const proofMerkleRoot = publicSignals![2]; // signal[2] = merkleRoot

      // On first use, accept any valid proof and register the merkle root
      // On subsequent uses, the proof's merkle root must match the registered one
      const verifyAgainstRoot = expectedMerkleRoot || proofMerkleRoot;
      result = await zkProofService.verifyRoleProof(proof, publicSignals!, roleHash, verifyAgainstRoot);
      if (result.valid) {
        result.merkleRoot = proofMerkleRoot;
      }
    } else {
      // ── LEGACY: server generates + verifies proof (private key exposed) ──
      result = await zkProofService.generateAndVerifyRoleProof(
        zkPrivKey!,
        requiredBadge,
        employee.merkleRoots?.[requiredBadge as BadgeType],
      );
    }

    if (!result.valid) {
      console.log(`   ❌ ZK proof REJECTED: ${result.reason}`);
      res.status(401).json({ success: false, error: `ZK proof failed: ${result.reason}` }); return;
    }

    // Auto-register ZK identity if not already done
    if (!employee.zkAddress && result.merkleRoot) {
      if (isClientProof) {
        // In client-proof mode we can't compute zkAddress (no private key), use merkle root as identifier
        const { setEmployeeZkData } = await import('../services/employeeDirectory');
        const merkleRoots: Partial<Record<BadgeType, string>> = { [requiredBadge as BadgeType]: result.merkleRoot };
        setEmployeeZkData(employee.id, result.merkleRoot.slice(0, 40), merkleRoots);
        console.log(`   ✅ Auto-registered ZK identity from client proof`);
      } else {
        const zkAddress = await zkProofService.computeZkAddress(zkPrivKey!);
        const merkleRoots: Partial<Record<BadgeType, string>> = {};
        for (const [role] of Object.entries(ROLE_HASHES)) {
          try {
            merkleRoots[role as BadgeType] = await zkProofService.computeMerkleRoot(zkPrivKey!, ROLE_HASHES[role]);
          } catch { /* skip roles that fail */ }
        }
        const { setEmployeeZkData } = await import('../services/employeeDirectory');
        setEmployeeZkData(employee.id, zkAddress, merkleRoots);
        console.log(`   ✅ Auto-registered ZK identity: zkAddr=${zkAddress.slice(0, 16)}…`);
      }
    }

    // Issue scoped token
    const scopedToken = jwt.sign(
      {
        address,
        did: employee.did,
        badge: employee.badge,
        scope: challengeData.scope,
        roleProofVerified: true,
        zkProofVerified: true,
        walletQRProof: true,
        clientSideProof: isClientProof,
        challengeId,
        authenticated: true,
      },
      process.env.JWT_SECRET || 'development-only-secret-not-for-production',
      { expiresIn: '15m', issuer: 'decentralized-trust-platform' },
    );

    // Mark challenge used, store token (portal polls status/:challengeId to pick it up)
    challengeData.used = true;
    challengeData.token = scopedToken;
    challengeData.badge = employee.badge;
    challengeData.userAddress = address;
    await persistChallengeState(challengeId, challengeData);

    console.log(`   ✅ Scoped JWT issued (15m, scope=${challengeData.scope})`);
    console.log(`   ✅ Challenge marked completed — portal poll will pick up token`);
    console.log(`🔐 ── ZK-WALLET-PROVE COMPLETE ─────────────────────────────────\n`);
    res.json({ success: true, data: { message: 'ZK proof verified via wallet', badge: employee.badge } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export { router as authRoutes };
