import { BadgeType } from './employeeDirectory';

export type VerifierRequestType = 'portal_access' | 'general_auth';
export type VerifierClaimKey = 'subjectDid' | 'employeeId' | 'name' | 'role' | 'department' | 'email';

export type VerifierClaimRequirementsByRequestType = Record<VerifierRequestType, VerifierClaimKey[]>;

export interface VerifierProfile {
  verifierId: string;
  organizationId: string;
  organizationName: string;
  active: boolean;
  policyVersion: number;
  requireCredential: boolean;
  allowedBadges: BadgeType[];
  allowedRequestTypes: VerifierRequestType[];
  requiredClaimsByRequestType: VerifierClaimRequirementsByRequestType;
}

export interface VerifierPolicyEvaluation {
  allowed: boolean;
  reason?: string;
  policy: {
    requireCredential: boolean;
    allowedBadges: BadgeType[];
    allowedRequestTypes: VerifierRequestType[];
    requiredClaims: VerifierClaimKey[];
  };
}

export interface VerifierProfileUpsertInput {
  verifierId: string;
  organizationId: string;
  organizationName: string;
  active?: boolean;
  policyVersion?: number;
  requireCredential?: boolean;
  allowedBadges?: BadgeType[];
  allowedRequestTypes?: VerifierRequestType[];
  requiredClaimsByRequestType?: Partial<Record<VerifierRequestType, VerifierClaimKey[]>>;
}

export interface VerifierProfileUpdateInput {
  organizationId?: string;
  organizationName?: string;
  active?: boolean;
  policyVersion?: number;
  requireCredential?: boolean;
  allowedBadges?: BadgeType[];
  allowedRequestTypes?: VerifierRequestType[];
  requiredClaimsByRequestType?: Partial<Record<VerifierRequestType, VerifierClaimKey[]>>;
}

const REQUEST_TYPES: VerifierRequestType[] = ['portal_access', 'general_auth'];

export const SUPPORTED_VERIFIER_CLAIM_KEYS: VerifierClaimKey[] = [
  'subjectDid',
  'employeeId',
  'name',
  'role',
  'department',
  'email',
];

const DEFAULT_VERIFIER_ID = 'dtp_portal_primary';
const runtimeProfileOverrides = new Map<string, VerifierProfile>();

const DEFAULT_PROFILES: VerifierProfile[] = [
  {
    verifierId: DEFAULT_VERIFIER_ID,
    organizationId: 'dtp_enterprise_001',
    organizationName: 'DTP Enterprise Portal',
    active: true,
    policyVersion: 1,
    requireCredential: false,
    allowedBadges: ['employee', 'manager', 'admin', 'auditor'],
    allowedRequestTypes: ['portal_access', 'general_auth'],
    requiredClaimsByRequestType: {
      portal_access: ['employeeId', 'role'],
      general_auth: ['employeeId'],
    },
  },
  {
    verifierId: 'partner_portal_finance',
    organizationId: 'partner_finance_001',
    organizationName: 'Partner Finance Workspace',
    active: true,
    policyVersion: 1,
    requireCredential: true,
    allowedBadges: ['manager', 'admin', 'auditor'],
    allowedRequestTypes: ['portal_access'],
    requiredClaimsByRequestType: {
      portal_access: ['employeeId', 'department', 'role'],
      general_auth: ['employeeId'],
    },
  },
  {
    verifierId: 'partner_portal_audit',
    organizationId: 'partner_audit_001',
    organizationName: 'Partner Audit Workspace',
    active: true,
    policyVersion: 1,
    requireCredential: true,
    allowedBadges: ['auditor', 'admin'],
    allowedRequestTypes: ['portal_access'],
    requiredClaimsByRequestType: {
      portal_access: ['employeeId', 'department', 'role'],
      general_auth: ['employeeId'],
    },
  },
];

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function isBadgeType(value: unknown): value is BadgeType {
  return value === 'employee' || value === 'manager' || value === 'admin' || value === 'auditor';
}

function isRequestType(value: unknown): value is VerifierRequestType {
  return value === 'portal_access' || value === 'general_auth';
}

function isClaimKey(value: unknown): value is VerifierClaimKey {
  return typeof value === 'string' && SUPPORTED_VERIFIER_CLAIM_KEYS.includes(value as VerifierClaimKey);
}

function cloneClaimRequirements(value: VerifierClaimRequirementsByRequestType): VerifierClaimRequirementsByRequestType {
  return {
    portal_access: [...value.portal_access],
    general_auth: [...value.general_auth],
  };
}

function normalizeClaimRequirements(
  value: unknown,
  fallback: VerifierClaimRequirementsByRequestType
): VerifierClaimRequirementsByRequestType {
  if (value === undefined || value === null) {
    return cloneClaimRequirements(fallback);
  }

  if (typeof value !== 'object') {
    throw new Error('requiredClaimsByRequestType must be an object when provided');
  }

  const raw = value as Record<string, unknown>;
  const normalized: VerifierClaimRequirementsByRequestType = cloneClaimRequirements(fallback);

  for (const key of Object.keys(raw)) {
    if (!REQUEST_TYPES.includes(key as VerifierRequestType)) {
      throw new Error(`Unsupported request type in requiredClaimsByRequestType: ${key}`);
    }
  }

  for (const requestType of REQUEST_TYPES) {
    if (!(requestType in raw)) {
      continue;
    }

    const claimKeys = raw[requestType];
    if (!Array.isArray(claimKeys)) {
      throw new Error(`requiredClaimsByRequestType.${requestType} must be an array`);
    }

    const deduped = Array.from(new Set(claimKeys.filter(isClaimKey)));
    if (deduped.length === 0) {
      throw new Error(
        `requiredClaimsByRequestType.${requestType} must include at least one supported claim key (${SUPPORTED_VERIFIER_CLAIM_KEYS.join(', ')})`
      );
    }

    normalized[requestType] = deduped;
  }

  return normalized;
}

function parseAllowedBadges(value: unknown, fallback: BadgeType[]): BadgeType[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const parsed = Array.from(new Set(value.filter(isBadgeType)));
  if (parsed.length === 0) {
    throw new Error('allowedBadges must include at least one valid badge');
  }

  return parsed;
}

function parseAllowedRequestTypes(value: unknown, fallback: VerifierRequestType[]): VerifierRequestType[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const parsed = Array.from(new Set(value.filter(isRequestType)));
  if (parsed.length === 0) {
    throw new Error('allowedRequestTypes must include at least one valid request type');
  }

  return parsed;
}

function normalizePolicyVersion(value: unknown, fallback: number): number {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return fallback;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error('policyVersion must be a positive number');
  }

  return numeric;
}

function parseRequestType(value: string | undefined): VerifierRequestType {
  return value === 'general_auth' ? 'general_auth' : 'portal_access';
}

function parseProfilesFromEnv(): VerifierProfile[] {
  const serialized = process.env.VERIFIER_PROFILES_JSON;
  if (!serialized) {
    return [];
  }

  try {
    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((profile) => profile && typeof profile === 'object')
      .map((profile: any): VerifierProfile | null => {
        const verifierId = typeof profile.verifierId === 'string' ? profile.verifierId.trim() : '';
        const organizationId = typeof profile.organizationId === 'string' ? profile.organizationId.trim() : '';
        const organizationName = typeof profile.organizationName === 'string'
          ? profile.organizationName.trim()
          : organizationId;

        if (!verifierId || !organizationId || !organizationName) {
          return null;
        }

        const allowedBadges = Array.isArray(profile.allowedBadges)
          ? profile.allowedBadges.filter((badge: unknown): badge is BadgeType => isBadgeType(badge))
          : DEFAULT_PROFILES[0].allowedBadges;

        const allowedRequestTypes = Array.isArray(profile.allowedRequestTypes)
          ? profile.allowedRequestTypes.filter((requestType: unknown): requestType is VerifierRequestType => isRequestType(requestType))
          : DEFAULT_PROFILES[0].allowedRequestTypes;

        const requiredClaimsByRequestType = normalizeClaimRequirements(
          profile.requiredClaimsByRequestType,
          DEFAULT_PROFILES[0].requiredClaimsByRequestType
        );

        return {
          verifierId,
          organizationId,
          organizationName,
          active: typeof profile.active === 'boolean' ? profile.active : true,
          policyVersion: Number.isFinite(Number(profile.policyVersion))
            ? Number(profile.policyVersion)
            : 1,
          requireCredential: Boolean(profile.requireCredential),
          allowedBadges: allowedBadges.length > 0 ? allowedBadges : DEFAULT_PROFILES[0].allowedBadges,
          allowedRequestTypes: allowedRequestTypes.length > 0
            ? allowedRequestTypes
            : DEFAULT_PROFILES[0].allowedRequestTypes,
          requiredClaimsByRequestType,
        };
      })
      .filter((profile): profile is VerifierProfile => Boolean(profile));
  } catch {
    return [];
  }
}

function getProfilesInternal(): VerifierProfile[] {
  const merged = [...DEFAULT_PROFILES, ...parseProfilesFromEnv(), ...Array.from(runtimeProfileOverrides.values())];
  const byVerifierId = new Map<string, VerifierProfile>();

  for (const profile of merged) {
    byVerifierId.set(normalizeText(profile.verifierId), profile);
  }

  return Array.from(byVerifierId.values());
}

export function getDefaultVerifierProfile(): VerifierProfile {
  const profiles = getProfilesInternal();
  const configuredDefault = process.env.DEFAULT_VERIFIER_ID
    ? normalizeText(process.env.DEFAULT_VERIFIER_ID)
    : normalizeText(DEFAULT_VERIFIER_ID);

  const profile = profiles.find((entry) => normalizeText(entry.verifierId) === configuredDefault && entry.active);
  if (profile) {
    return profile;
  }

  return profiles.find((entry) => entry.active) || DEFAULT_PROFILES[0];
}

export function upsertVerifierProfile(input: VerifierProfileUpsertInput): VerifierProfile {
  const verifierId = input.verifierId?.trim();
  if (!verifierId) {
    throw new Error('verifierId is required');
  }

  const organizationId = input.organizationId?.trim();
  if (!organizationId) {
    throw new Error('organizationId is required');
  }

  const organizationName = input.organizationName?.trim();
  if (!organizationName) {
    throw new Error('organizationName is required');
  }

  const existing = getVerifierProfile(verifierId);
  const fallbackBadges = existing?.allowedBadges || DEFAULT_PROFILES[0].allowedBadges;
  const fallbackRequestTypes = existing?.allowedRequestTypes || DEFAULT_PROFILES[0].allowedRequestTypes;
  const fallbackClaimRequirements = existing?.requiredClaimsByRequestType || DEFAULT_PROFILES[0].requiredClaimsByRequestType;

  const next: VerifierProfile = {
    verifierId,
    organizationId,
    organizationName,
    active: typeof input.active === 'boolean' ? input.active : (existing?.active ?? true),
    policyVersion: normalizePolicyVersion(input.policyVersion, existing?.policyVersion || 1),
    requireCredential: typeof input.requireCredential === 'boolean'
      ? input.requireCredential
      : (existing?.requireCredential ?? false),
    allowedBadges: parseAllowedBadges(input.allowedBadges, fallbackBadges),
    allowedRequestTypes: parseAllowedRequestTypes(input.allowedRequestTypes, fallbackRequestTypes),
    requiredClaimsByRequestType: normalizeClaimRequirements(input.requiredClaimsByRequestType, fallbackClaimRequirements),
  };

  runtimeProfileOverrides.set(normalizeText(verifierId), next);
  return next;
}

export function updateVerifierProfile(verifierId: string, updates: VerifierProfileUpdateInput): VerifierProfile {
  const existing = getVerifierProfile(verifierId);
  if (!existing) {
    throw new Error(`Unknown verifier profile: ${verifierId}`);
  }

  if (updates.organizationId !== undefined && !updates.organizationId.trim()) {
    throw new Error('organizationId cannot be empty');
  }

  if (updates.organizationName !== undefined && !updates.organizationName.trim()) {
    throw new Error('organizationName cannot be empty');
  }

  const next: VerifierProfile = {
    verifierId: existing.verifierId,
    organizationId: updates.organizationId?.trim() || existing.organizationId,
    organizationName: updates.organizationName?.trim() || existing.organizationName,
    active: typeof updates.active === 'boolean' ? updates.active : existing.active,
    policyVersion: normalizePolicyVersion(updates.policyVersion, existing.policyVersion),
    requireCredential: typeof updates.requireCredential === 'boolean'
      ? updates.requireCredential
      : existing.requireCredential,
    allowedBadges: parseAllowedBadges(updates.allowedBadges, existing.allowedBadges),
    allowedRequestTypes: parseAllowedRequestTypes(updates.allowedRequestTypes, existing.allowedRequestTypes),
    requiredClaimsByRequestType: normalizeClaimRequirements(
      updates.requiredClaimsByRequestType,
      existing.requiredClaimsByRequestType
    ),
  };

  runtimeProfileOverrides.set(normalizeText(existing.verifierId), next);
  return next;
}

export function setVerifierProfileActive(verifierId: string, active: boolean): VerifierProfile {
  return updateVerifierProfile(verifierId, { active });
}

export function resetVerifierProfile(verifierId: string): boolean {
  return runtimeProfileOverrides.delete(normalizeText(verifierId));
}

export function listVerifierProfiles(options?: { includeInactive?: boolean }): VerifierProfile[] {
  const profiles = getProfilesInternal();
  if (options?.includeInactive) {
    return profiles;
  }
  return profiles.filter((profile) => profile.active);
}

export function getVerifierProfile(verifierId: string): VerifierProfile | undefined {
  const normalized = normalizeText(verifierId);
  return getProfilesInternal().find((profile) => normalizeText(profile.verifierId) === normalized);
}

export function findVerifierProfileByOrganization(organizationId: string): VerifierProfile | undefined {
  const normalized = normalizeText(organizationId);
  return getProfilesInternal().find((profile) => normalizeText(profile.organizationId) === normalized);
}

export function resolveVerifierProfile(input?: {
  verifierId?: string;
  organizationId?: string;
}): VerifierProfile {
  if (input?.verifierId) {
    const byVerifierId = getVerifierProfile(input.verifierId);
    if (!byVerifierId) {
      throw new Error(`Unknown verifier profile: ${input.verifierId}`);
    }
    if (!byVerifierId.active) {
      throw new Error(`Verifier profile is inactive: ${input.verifierId}`);
    }
    return byVerifierId;
  }

  if (input?.organizationId) {
    const byOrganization = findVerifierProfileByOrganization(input.organizationId);
    if (!byOrganization) {
      throw new Error(`No verifier profile mapped for organization: ${input.organizationId}`);
    }
    if (!byOrganization.active) {
      throw new Error(`Verifier profile is inactive for organization: ${input.organizationId}`);
    }
    return byOrganization;
  }

  return getDefaultVerifierProfile();
}

export function evaluateVerifierPolicy(
  profile: VerifierProfile,
  input: {
    badge: BadgeType;
    requestType?: string;
    credentialProvided: boolean;
    credentialVerified: boolean;
  }
): VerifierPolicyEvaluation {
  const requestType = parseRequestType(input.requestType);
  const requiredClaims = [...(profile.requiredClaimsByRequestType[requestType] || [])];

  if (!profile.allowedRequestTypes.includes(requestType)) {
    return {
      allowed: false,
      reason: `Verifier ${profile.verifierId} does not allow request type ${requestType}`,
      policy: {
        requireCredential: profile.requireCredential,
        allowedBadges: profile.allowedBadges,
        allowedRequestTypes: profile.allowedRequestTypes,
        requiredClaims,
      },
    };
  }

  if (!profile.allowedBadges.includes(input.badge)) {
    return {
      allowed: false,
      reason: `Badge ${input.badge} is not allowed for verifier ${profile.verifierId}`,
      policy: {
        requireCredential: profile.requireCredential,
        allowedBadges: profile.allowedBadges,
        allowedRequestTypes: profile.allowedRequestTypes,
        requiredClaims,
      },
    };
  }

  if (profile.requireCredential && !input.credentialProvided) {
    return {
      allowed: false,
      reason: `Verifier ${profile.verifierId} requires a credential for authentication`,
      policy: {
        requireCredential: profile.requireCredential,
        allowedBadges: profile.allowedBadges,
        allowedRequestTypes: profile.allowedRequestTypes,
        requiredClaims,
      },
    };
  }

  if (profile.requireCredential && !input.credentialVerified) {
    return {
      allowed: false,
      reason: `Verifier ${profile.verifierId} requires a verified credential`,
      policy: {
        requireCredential: profile.requireCredential,
        allowedBadges: profile.allowedBadges,
        allowedRequestTypes: profile.allowedRequestTypes,
        requiredClaims,
      },
    };
  }

  return {
    allowed: true,
    policy: {
      requireCredential: profile.requireCredential,
      allowedBadges: profile.allowedBadges,
      allowedRequestTypes: profile.allowedRequestTypes,
      requiredClaims,
    },
  };
}

export function resolveRequestedClaims(profile: VerifierProfile, requestType?: string): VerifierClaimKey[] {
  const parsedRequestType = parseRequestType(requestType);
  return [...(profile.requiredClaimsByRequestType[parsedRequestType] || [])];
}
