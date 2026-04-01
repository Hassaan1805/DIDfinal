export interface ResolvedDidDocument {
    '@context': string[];
    id: string;
    verificationMethod: Array<{
        id: string;
        type: string;
        controller: string;
        blockchainAccountId: string;
        publicKeyJwk?: Record<string, unknown>;
    }>;
    authentication: string[];
    assertionMethod: string[];
    service?: Array<{
        id: string;
        type: string;
        serviceEndpoint: string;
    }>;
    metadata: {
        registrationDate?: string;
        isActive: boolean;
        authCount: number;
    };
}
export declare function resolveDidDocument(did: string): Promise<ResolvedDidDocument>;
//# sourceMappingURL=didResolver.service.d.ts.map