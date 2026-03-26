import { AuthTokens, Permission, RbacContext, RoleName, StoredCredential } from './types';
export declare function roleInHierarchy(minRole: RoleName, actualRole: RoleName): boolean;
export declare function resolveInheritedPermissions(role: RoleName): Permission[];
export declare function issueRoleCredential(input: {
    issuerWalletAddress: string;
    subjectWalletAddress: string;
    role: RoleName;
    permissions?: Permission[];
    expiresInDays?: number;
}): Promise<StoredCredential>;
export declare function verifyCredential(credential: StoredCredential): Promise<boolean>;
export declare function buildRbacContext(walletAddress: string): Promise<RbacContext>;
export declare function generateTokens(params: {
    walletAddress: string;
    did: string;
    nonce: string;
}): AuthTokens;
export declare function verifyAccessToken(token: string): {
    sub: string;
    did: string;
};
export declare function refreshAccessToken(refreshToken: string): AuthTokens;
export declare function getIssuerDid(): string;
export declare function getCredentialByIdSafe(credentialId: string): StoredCredential;
//# sourceMappingURL=service.d.ts.map