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
    verifyRoleProof(proof: any, publicSignals: string[], expectedRoleHash: string, expectedMerkleRoot: string): Promise<{
        valid: boolean;
        reason?: string;
    }>;
    private static readonly ROLE_HASHES;
    computeMerkleRoot(zkPrivKey: string, roleHash: string): Promise<string>;
    computeZkAddress(zkPrivKey: string): Promise<string>;
    generateAndVerifyRoleProof(zkPrivKey: string, requiredBadge: string, existingMerkleRoot?: string): Promise<{
        valid: boolean;
        merkleRoot?: string;
        reason?: string;
    }>;
    getServiceStats(): any;
}
export default ZKProofService;
//# sourceMappingURL=zkproof.service.d.ts.map