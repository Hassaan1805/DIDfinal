interface BlockchainConfig {
    rpcUrl: string;
    contractAddress: string;
    gasStationPrivateKey: string;
}
export declare class BlockchainService {
    private provider;
    private gasStationWallet;
    private didRegistryContract;
    constructor(config: BlockchainConfig);
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
}
export {};
//# sourceMappingURL=blockchainService.d.ts.map