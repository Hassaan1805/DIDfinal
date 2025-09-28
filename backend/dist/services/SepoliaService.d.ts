export declare class SepoliaBlockchainService {
    private provider;
    private contract;
    private wallet;
    private config;
    private readonly CONTRACT_ABI;
    constructor();
    private initializeProvider;
    registerEmployeeDID(employeeAddress: string, did: string, publicKeyJwk: string): Promise<{
        success: boolean;
        txHash?: string;
        gasUsed?: string;
        error?: string;
    }>;
    recordAuthentication(challengeId: string, message: string, userAddress: string): Promise<{
        success: boolean;
        txHash?: string;
        gasUsed?: string;
        error?: string;
    }>;
    verifyAuthentication(challengeId: string, signature: string): Promise<{
        success: boolean;
        isValid: boolean;
        txHash?: string;
        gasUsed?: string;
        error?: string;
    }>;
    getEmployeeDIDInfo(employeeAddress: string): Promise<{
        success: boolean;
        didInfo?: {
            did: string;
            publicKeyJwk: string;
            registrationDate: string;
            isActive: boolean;
            authCount: number;
        };
        error?: string;
    }>;
    getNetworkStatus(): Promise<{
        success: boolean;
        status?: {
            networkName: string;
            chainId: number;
            blockNumber: number;
            gasPrice: string;
            walletAddress: string;
            walletBalance: string;
            contractAddress: string;
            contractDeployed: boolean;
        };
        error?: string;
    }>;
    getConfig(): {
        rpcUrl: string;
        contractAddress: string;
        chainId: number;
        walletAddress: string;
    };
    isConfigured(): boolean;
    isReady(): boolean;
}
export declare const sepoliaService: SepoliaBlockchainService;
//# sourceMappingURL=SepoliaService.d.ts.map