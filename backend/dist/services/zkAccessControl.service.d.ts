export type AccessLevel = 'public' | 'basic' | 'premium' | 'enterprise';
export interface AccessGrant {
    level: AccessLevel;
    grantId: string;
    grantType: string;
    issuedAt: number;
    expiresAt: number;
    anonymous: boolean;
    proofType?: string;
    claims?: Record<string, any>;
}
export interface ProofRequirement {
    proofType: string;
    description: string;
    requiredSignals: string[];
    accessLevel: AccessLevel;
}
interface ContentAccessRule {
    resourceId: string;
    resourceType: string;
    requiredLevel: AccessLevel;
    requiredProofs?: string[];
    description: string;
}
export declare class ZKAccessControlService {
    private zkProofService;
    private jwtSecret;
    constructor();
    generateChallenge(proofType: string): {
        challengeId: string;
        challenge: any;
    };
    verifyAndGrantAccess(challengeId: string, proof: any, publicSignals: string[]): Promise<{
        success: boolean;
        grant?: AccessGrant;
        token?: string;
        error?: string;
    }>;
    checkResourceAccess(token: string, resourceId: string): {
        hasAccess: boolean;
        reason?: string;
        grant?: AccessGrant;
    };
    getProofRequirements(): ProofRequirement[];
    getContentAccessRules(): ContentAccessRule[];
    getTieredContent(accessLevel: AccessLevel): any;
    cleanup(): {
        challengesRemoved: number;
        grantsRemoved: number;
    };
}
export declare const zkAccessControl: ZKAccessControlService;
export {};
//# sourceMappingURL=zkAccessControl.service.d.ts.map