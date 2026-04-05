export type CredentialLifecycleStatus = 'active' | 'revoked' | 'expired' | 'unknown';
interface IssuedCredentialDelivery {
    jwt: string;
    credentialId: string;
    employeeId: string;
    issuedAt: string;
    expiresAt: string;
}
export declare function storeIssuedCredentialJwt(input: {
    subjectDid: string;
    jwt: string;
    credentialId: string;
    employeeId: string;
    issuedAt: string;
    expiresAt: string;
}): void;
export declare function getLatestCredentialJwtForDid(did: string): IssuedCredentialDelivery | undefined;
export declare function clearDeliveryForDid(did: string): void;
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
export {};
//# sourceMappingURL=credentialStatus.service.d.ts.map