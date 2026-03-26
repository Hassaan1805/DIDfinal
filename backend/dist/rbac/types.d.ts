export type Permission = 'read' | 'write' | 'delete' | 'approve' | 'manage_users' | 'issue_credentials';
export type RoleName = 'guest' | 'employee' | 'manager' | 'admin' | 'super_admin';
export interface RoleDefinition {
    name: RoleName;
    rank: number;
    permissions: Permission[];
    description: string;
}
export interface UserRecord {
    walletAddress: string;
    did: string;
    createdAt: string;
    lastLoginAt: string;
    status: 'active' | 'disabled';
}
export interface NonceRecord {
    nonce: string;
    walletAddress: string;
    message: string;
    expiresAt: number;
    used: boolean;
}
export interface VCSubject {
    id: string;
    walletAddress: string;
    role: RoleName;
    permissions: Permission[];
}
export interface VerifiableCredentialDocument {
    '@context': string[];
    id: string;
    type: string[];
    issuer: string;
    issuanceDate: string;
    expirationDate?: string;
    credentialSubject: VCSubject;
    proof: {
        type: 'EcdsaSecp256k1Signature2019';
        created: string;
        proofPurpose: 'assertionMethod';
        verificationMethod: string;
        signature: string;
    };
}
export interface StoredCredential {
    id: string;
    vc: VerifiableCredentialDocument;
    issuedByWallet: string;
    issuedToWallet: string;
    active: boolean;
    revokedAt?: string;
    revokedBy?: string;
    createdAt: string;
}
export interface ActivityLog {
    id: string;
    actorWallet: string;
    action: string;
    targetWallet?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface AuthJwtPayload {
    sub: string;
    did: string;
    sessionId: string;
    nonce: string;
    tokenType: 'access' | 'refresh';
}
export interface RbacContext {
    walletAddress: string;
    did: string;
    roles: RoleName[];
    highestRole: RoleName;
    permissions: Permission[];
    credentials: StoredCredential[];
}
//# sourceMappingURL=types.d.ts.map