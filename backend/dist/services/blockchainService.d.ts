interface BlockchainConfig {
    rpcUrl: string;
    contractAddress: string;
    gasStationPrivateKey: string;
}
export interface BlockchainReadiness {
    configured: boolean;
    ready: boolean;
    reasons: string[];
    rpcUrl: string;
    contractAddress: string;
    gasStationAddress: string;
}
export declare class BlockchainService {
    private config;
    private provider;
    private gasStationWallet;
    private didRegistryContract;
    constructor(config: BlockchainConfig);
    private static isPlaceholderRpcUrl;
    private static isPlaceholderContractAddress;
    private static isPlaceholderPrivateKey;
    getReadinessStatus(): BlockchainReadiness;
    isReady(): boolean;
    registerDID(userAddress: string, publicKey: string): Promise<{
        did: string;
        txHash: string;
        blockNumber: number;
        gasUsed: string;
    }>;
    isDIDRegistered(userAddress: string): Promise<boolean>;
    getDIDDocument(userAddress: string): Promise<string>;
    getPublicKey(userAddress: string): Promise<string>;
    getGasStationBalance(): Promise<string>;
    getNetworkInfo(): Promise<{
        name: string;
        chainId: number;
        blockNumber: number;
    }>;
    getContractInfo(): {
        address: string;
        abi: any[];
    };
    getAllRegisteredDIDs(): Promise<Array<{
        address: string;
        did: string;
        publicKey: string;
        txHash: string;
        blockNumber: number;
        timestamp?: string;
    }>>;
    getRecentTransactions(limit?: number): Promise<Array<{
        hash: string;
        from: string;
        to: string;
        blockNumber: number;
        gasUsed: string;
        timestamp: string;
        type: 'DID_REGISTRATION' | 'CONTRACT_CALL';
    }>>;
}
export declare const blockchainService: BlockchainService;
export {};
//# sourceMappingURL=blockchainService.d.ts.map