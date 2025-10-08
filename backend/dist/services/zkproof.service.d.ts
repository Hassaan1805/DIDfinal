export declare class ZKProofService {
    private verificationKey;
    private readonly CORPORATE_EXCELLENCE_CONTRACT;
    private isEnabled;
    constructor();
    private loadVerificationKey;
    verifyNFTOwnershipProof(proof: any, publicSignals: string[]): Promise<boolean>;
    generateAuthChallenge(): any;
    private isValidProofStructure;
    private isValidPublicSignals;
    getServiceStats(): any;
}
export default ZKProofService;
//# sourceMappingURL=zkproof.service.d.ts.map