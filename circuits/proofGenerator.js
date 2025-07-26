const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * NFT Ownership Proof Generator Utility
 * 
 * This module provides utilities for generating and verifying
 * zero-knowledge proofs of NFT ownership for the Corporate Excellence 2025
 * premium access system.
 */

class NFTOwnershipProofGenerator {
    constructor(circuitPath = __dirname) {
        this.wasmPath = path.join(circuitPath, "build", "nftOwnership.wasm");
        this.zkeyPath = path.join(circuitPath, "nftOwnership_0001.zkey");
        this.vkeyPath = path.join(circuitPath, "verification_key.json");
        
        // Corporate Excellence 2025 NFT contract address
        this.CORPORATE_EXCELLENCE_CONTRACT = "0x742d35Cc6634C0532925a3b8D8B5d3d8c0eF7e95";
    }

    /**
     * Generate a zero-knowledge proof of NFT ownership
     * 
     * @param {string} privateKey - User's private key (hex string)
     * @param {string} tokenId - NFT token ID owned by user
     * @param {Object} merkleData - Merkle tree data for ownership verification
     * @returns {Promise<Object>} Generated proof and public signals
     */
    async generateProof(privateKey, tokenId, merkleData) {
        try {
            // Validate inputs
            this.validateInputs(privateKey, tokenId, merkleData);

            // Prepare circuit inputs
            const circuitInputs = {
                // Private inputs (never revealed)
                privateKey: privateKey,
                nonce: this.generateNonce().toString(),
                tokenId: tokenId.toString(),
                
                // Public inputs (known to verifier)
                nftContractAddress: BigInt(this.CORPORATE_EXCELLENCE_CONTRACT).toString(),
                merkleRoot: merkleData.root,
                merkleProof: merkleData.proof,
                merkleIndices: merkleData.indices.map(i => i.toString())
            };

            console.log("🔐 Generating ZK-proof for NFT ownership...");
            const startTime = Date.now();

            // Generate the proof
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                circuitInputs,
                this.wasmPath,
                this.zkeyPath
            );

            const proofTime = Date.now() - startTime;
            console.log(`✅ Proof generated successfully in ${proofTime}ms`);

            return {
                proof,
                publicSignals,
                metadata: {
                    proofTime,
                    timestamp: new Date().toISOString(),
                    nftContract: this.CORPORATE_EXCELLENCE_CONTRACT,
                    privacyLevel: "zero-knowledge"
                }
            };

        } catch (error) {
            console.error("❌ Proof generation failed:", error.message);
            throw new Error(`Proof generation failed: ${error.message}`);
        }
    }

    /**
     * Verify a zero-knowledge proof of NFT ownership
     * 
     * @param {Object} proof - The generated proof
     * @param {Array} publicSignals - Public signals from proof generation
     * @returns {Promise<boolean>} True if proof is valid
     */
    async verifyProof(proof, publicSignals) {
        try {
            console.log("🔍 Verifying ZK-proof...");
            const startTime = Date.now();

            // Load verification key
            const vKey = JSON.parse(fs.readFileSync(this.vkeyPath, 'utf8'));

            // Verify the proof
            const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);

            const verifyTime = Date.now() - startTime;
            console.log(`📊 Verification completed in ${verifyTime}ms: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

            return isValid;

        } catch (error) {
            console.error("❌ Proof verification failed:", error.message);
            return false;
        }
    }

    /**
     * Generate test merkle tree data for development
     * 
     * @param {string} userAddress - User's wallet address (for testing)
     * @param {string} tokenId - Token ID to include in tree
     * @returns {Object} Merkle tree data for testing
     */
    generateTestMerkleData(userAddress, tokenId) {
        console.log("🧪 Generating test merkle tree data...");

        // Simulate merkle tree with user's ownership
        const merkleRoot = this.hashToField("test_merkle_root_" + Date.now());
        
        // Generate fake merkle proof (8 levels)
        const merkleProof = Array(8).fill(0).map((_, i) => 
            this.hashToField(`sibling_${i}_${Date.now()}`)
        );
        
        // Random path through tree
        const merkleIndices = Array(8).fill(0).map(() => Math.floor(Math.random() * 2));

        return {
            root: merkleRoot,
            proof: merkleProof,
            indices: merkleIndices,
            note: "This is test data only - replace with real merkle tree in production"
        };
    }

    /**
     * Create authentication challenge for mobile wallet
     * 
     * @returns {Object} Challenge data for proof generation
     */
    createAuthChallenge() {
        const challenge = {
            challengeId: crypto.randomUUID(),
            timestamp: Date.now(),
            nftContract: this.CORPORATE_EXCELLENCE_CONTRACT,
            requiredProof: "NFT_OWNERSHIP",
            expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
        };

        console.log(`🎯 Created auth challenge: ${challenge.challengeId}`);
        return challenge;
    }

    /**
     * Format proof for API submission
     * 
     * @param {Object} proof - Generated proof
     * @param {Array} publicSignals - Public signals
     * @param {string} challengeId - Challenge ID from auth flow
     * @returns {Object} Formatted proof for API
     */
    formatProofForAPI(proof, publicSignals, challengeId) {
        return {
            challengeId,
            zkProof: {
                pi_a: proof.pi_a,
                pi_b: proof.pi_b,
                pi_c: proof.pi_c,
                protocol: "groth16",
                curve: "bn128"
            },
            publicSignals,
            timestamp: new Date().toISOString(),
            proofType: "NFT_OWNERSHIP"
        };
    }

    /**
     * Validate circuit inputs
     */
    validateInputs(privateKey, tokenId, merkleData) {
        if (!privateKey || typeof privateKey !== 'string') {
            throw new Error("Invalid private key");
        }

        if (!tokenId || isNaN(parseInt(tokenId))) {
            throw new Error("Invalid token ID");
        }

        if (!merkleData || !merkleData.root || !merkleData.proof || !merkleData.indices) {
            throw new Error("Invalid merkle data");
        }

        if (merkleData.proof.length !== 8 || merkleData.indices.length !== 8) {
            throw new Error("Merkle proof must have exactly 8 levels");
        }
    }

    /**
     * Generate random nonce for proof uniqueness
     */
    generateNonce() {
        return Math.floor(Math.random() * 1000000);
    }

    /**
     * Hash string to field element
     */
    hashToField(input) {
        const hash = crypto.createHash('sha256').update(input).digest('hex');
        return BigInt('0x' + hash).toString();
    }

    /**
     * Check if circuit files exist and are accessible
     */
    async checkCircuitFiles() {
        const files = [
            { path: this.wasmPath, name: "WASM file" },
            { path: this.zkeyPath, name: "Proving key" },
            { path: this.vkeyPath, name: "Verification key" }
        ];

        for (const file of files) {
            if (!fs.existsSync(file.path)) {
                throw new Error(`Missing ${file.name} at ${file.path}. Please run circuit setup first.`);
            }
        }

        console.log("✅ All circuit files found and accessible");
        return true;
    }

    /**
     * Get circuit statistics
     */
    async getCircuitStats() {
        try {
            await this.checkCircuitFiles();

            const wasmStats = fs.statSync(this.wasmPath);
            const zkeyStats = fs.statSync(this.zkeyPath);
            const vkeyStats = fs.statSync(this.vkeyPath);

            return {
                files: {
                    wasm: { size: wasmStats.size, path: this.wasmPath },
                    provingKey: { size: zkeyStats.size, path: this.zkeyPath },
                    verificationKey: { size: vkeyStats.size, path: this.vkeyPath }
                },
                contract: this.CORPORATE_EXCELLENCE_CONTRACT,
                status: "ready"
            };

        } catch (error) {
            return {
                status: "not_ready",
                error: error.message
            };
        }
    }
}

module.exports = NFTOwnershipProofGenerator;
