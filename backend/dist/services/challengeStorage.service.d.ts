export interface AuthChallenge {
    challenge: string;
    timestamp: number;
    used: boolean;
    token?: string;
    refreshToken?: string;
    userAddress?: string;
    did?: string;
    employeeId?: string;
    employeeName?: string;
    badge?: 'employee' | 'manager' | 'admin' | 'auditor';
    permissions?: string[];
    hashId?: string;
    didRegistrationTxHash?: string;
    authRecordTxHash?: string;
    authVerifyTxHash?: string;
    adminGasPayerAddress?: string;
    adminGasPayerEtherscanUrl?: string;
    companyId?: string;
    verifierId?: string;
    verifierOrganizationId?: string;
    verifierOrganizationName?: string;
    verifierPolicyVersion?: number;
    verifierCredentialRequired?: boolean;
    requestType?: 'portal_access' | 'general_auth';
    requestedClaims?: {
        requestType: string;
        requiredClaims: Array<'subjectDid' | 'employeeId' | 'name' | 'role' | 'department' | 'email'>;
        policyVersion: number;
        proofRequired?: boolean;
        bindingVersion?: string;
    };
    disclosedClaims?: Partial<Record<string, string>>;
    disclosedClaimsVerified?: boolean;
    disclosedClaimsProofVerified?: boolean;
    disclosedClaimsBindingDigest?: string;
    blockchainResults?: {
        registration?: any;
        authRecord?: any;
        verification?: any;
        didInfo?: any;
        completedAt?: string;
    };
    blockchainError?: string;
}
export interface IChallengeStorage {
    set(challengeId: string, challenge: AuthChallenge, ttlSeconds?: number): Promise<void>;
    get(challengeId: string): Promise<AuthChallenge | null>;
    delete(challengeId: string): Promise<void>;
    keys(): Promise<string[]>;
    isReady(): boolean;
}
export declare function initializeChallengeStorage(): void;
export declare function getChallengeStorage(): IChallengeStorage;
export declare function setChallenge(challengeId: string, challenge: AuthChallenge, ttlSeconds?: number): Promise<void>;
export declare function getChallenge(challengeId: string): Promise<AuthChallenge | null>;
export declare function deleteChallenge(challengeId: string): Promise<void>;
export declare function getAllChallengeIds(): Promise<string[]>;
//# sourceMappingURL=challengeStorage.service.d.ts.map