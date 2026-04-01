export type CredentialLifecycleStatus = 'active' | 'revoked' | 'expired' | 'unknown';
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
export declare function getCredentialStatusPolicy(): CredentialStatusPolicy;
export declare function registerIssuedCredential(input: {
    credentialId: string;
    issuer?: string;
    subjectDid?: string;
    issuedAt?: string;
    expiresAt?: string;
}): CredentialRegistryRecord;
export declare function revokeCredential(input: {
    credentialId: string;
    reason?: string;
    revokedBy?: string;
}): CredentialRegistryRecord;
export declare function getCredentialStatus(credentialId?: string | null): CredentialStatusEvaluation;
//# sourceMappingURL=credentialStatus.service.d.ts.map