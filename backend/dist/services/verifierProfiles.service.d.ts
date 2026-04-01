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
export declare const SUPPORTED_VERIFIER_CLAIM_KEYS: VerifierClaimKey[];
export declare function getDefaultVerifierProfile(): VerifierProfile;
export declare function upsertVerifierProfile(input: VerifierProfileUpsertInput): VerifierProfile;
export declare function updateVerifierProfile(verifierId: string, updates: VerifierProfileUpdateInput): VerifierProfile;
export declare function setVerifierProfileActive(verifierId: string, active: boolean): VerifierProfile;
export declare function resetVerifierProfile(verifierId: string): boolean;
export declare function listVerifierProfiles(options?: {
    includeInactive?: boolean;
}): VerifierProfile[];
export declare function getVerifierProfile(verifierId: string): VerifierProfile | undefined;
export declare function findVerifierProfileByOrganization(organizationId: string): VerifierProfile | undefined;
export declare function resolveVerifierProfile(input?: {
    verifierId?: string;
    organizationId?: string;
}): VerifierProfile;
export declare function evaluateVerifierPolicy(profile: VerifierProfile, input: {
    badge: BadgeType;
    requestType?: string;
    credentialProvided: boolean;
    credentialVerified: boolean;
}): VerifierPolicyEvaluation;
export declare function resolveRequestedClaims(profile: VerifierProfile, requestType?: string): VerifierClaimKey[];
//# sourceMappingURL=verifierProfiles.service.d.ts.map