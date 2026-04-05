export type EnrollmentRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type EnrollmentDecision = 'approved' | 'rejected';
export interface PublicProfileLink {
    label: string;
    url: string;
}
export interface UserPublicProfile {
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
export interface UserPrivateProfilePointer {
    encryptedProfileUri?: string;
    cipherHash?: string;
    encryptionScheme?: string;
}
export interface UserIdentityRecord {
    did: string;
    walletAddress: string;
    publicProfile: UserPublicProfile;
    privateProfilePointer?: UserPrivateProfilePointer;
    createdAt: string;
    updatedAt: string;
}
export interface RegisterIdentityInput {
    did: string;
    walletAddress: string;
    publicProfile: {
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
    };
    privateProfilePointer?: UserPrivateProfilePointer;
}
export interface EnrollmentEmployeeData {
    id: string;
    name: string;
    department: string;
    email: string;
    badge: string;
}
export interface CreateEnrollmentRequestInput {
    did: string;
    requesterOrganizationId: string;
    requesterOrganizationName: string;
    verifierId?: string;
    purpose: string;
    requestedClaims?: string[];
    requestedProfileFields?: string[];
    expiresInHours?: number;
    employeeData?: EnrollmentEmployeeData;
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
    employeeData?: EnrollmentEmployeeData;
}
export interface DecideEnrollmentRequestInput {
    requestId: string;
    did: string;
    decision: EnrollmentDecision;
    approvedClaims?: string[];
    approvedProfileFields?: string[];
    reason?: string;
}
export declare function registerOrUpdateIdentity(input: RegisterIdentityInput): UserIdentityRecord;
export declare function getIdentityRecordByDid(did: string): UserIdentityRecord | undefined;
export declare function getPublicProfileByDid(did: string): {
    did: string;
    walletAddress: string;
    publicProfile: UserPublicProfile;
    updatedAt: string;
} | undefined;
export declare function createEnrollmentRequest(input: CreateEnrollmentRequestInput): EnrollmentRequest;
export declare function expireEnrollmentRequests(): void;
export declare function getEnrollmentRequestById(requestId: string): EnrollmentRequest | undefined;
export declare function listEnrollmentRequestsByDid(input: {
    did: string;
    status?: EnrollmentRequestStatus;
}): EnrollmentRequest[];
export declare function listEnrollmentRequests(input?: {
    did?: string;
    requesterOrganizationId?: string;
    status?: EnrollmentRequestStatus;
}): EnrollmentRequest[];
export declare function decideEnrollmentRequest(input: DecideEnrollmentRequestInput): EnrollmentRequest;
//# sourceMappingURL=identityProfile.service.d.ts.map