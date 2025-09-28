"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZKProofService = void 0;
const snarkjs = require('snarkjs');
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
class ZKProofService {
    constructor() {
        this.CORPORATE_EXCELLENCE_CONTRACT = '0x742d35Cc6634C0532925a3b8D8B5d3d8c0eF7e95';
        this.loadVerificationKey();
    }
    loadVerificationKey() {
        try {
            const vkeyPath = path.join(__dirname, '..', 'zkp', 'verification_key.json');
            if (!fs.existsSync(vkeyPath)) {
                throw new Error(`Verification key not found at ${vkeyPath}`);
            }
            this.verificationKey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
            console.log('🔑 ZK-proof verification key loaded successfully');
            console.log(`   - Protocol: ${this.verificationKey.protocol}`);
            console.log(`   - Curve: ${this.verificationKey.curve}`);
            console.log(`   - Public inputs: ${this.verificationKey.nPublic}`);
        }
        catch (error) {
            console.error('💥 Failed to load verification key:', error);
            throw new Error('ZK-proof verification key initialization failed');
        }
    }
    async verifyNFTOwnershipProof(proof, publicSignals) {
        try {
            console.log('🔍 Starting ZK-proof verification process...');
            console.log('📊 Verification details:');
            console.log(`   - Public signals: ${publicSignals.length} values`);
            console.log(`   - Expected NFT contract: ${this.CORPORATE_EXCELLENCE_CONTRACT}`);
            if (!this.isValidProofStructure(proof)) {
                console.log('❌ Invalid proof structure');
                return false;
            }
            if (!this.isValidPublicSignals(publicSignals)) {
                console.log('❌ Invalid public signals');
                return false;
            }
            console.log('🔐 Verifying ZK-proof with Groth16...');
            const startTime = Date.now();
            const isValid = await snarkjs.groth16.verify(this.verificationKey, publicSignals, proof);
            const verificationTime = Date.now() - startTime;
            console.log(`⏱️  Groth16 verification completed in ${verificationTime}ms`);
            if (isValid) {
                console.log('✅ ZK-proof verification successful!');
                console.log('🎉 Privacy-preserving NFT ownership confirmed');
                console.log('🔒 User identity remains completely anonymous');
            }
            else {
                console.log('❌ ZK-proof verification failed');
                console.log('🚫 Invalid proof or user does not own required NFT');
            }
            return isValid;
        }
        catch (error) {
            console.error('💥 ZK-proof verification error:', error);
            console.log('🔍 Error details:');
            console.log(`   - Error type: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
            console.log(`   - Error message: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
    generateAuthChallenge() {
        const challenge = {
            challengeId: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            nftContract: this.CORPORATE_EXCELLENCE_CONTRACT,
            requiredProof: 'NFT_OWNERSHIP',
            expiresAt: Date.now() + (5 * 60 * 1000),
            instructions: {
                step1: 'Generate ZK-proof using your mobile wallet',
                step2: 'Submit proof to /api/auth/verify-zkp endpoint',
                step3: 'Receive anonymous premium access token',
                privacy: 'Your wallet address will never be revealed'
            }
        };
        console.log(`🎯 Generated auth challenge: ${challenge.challengeId}`);
        console.log(`   - NFT Contract: ${challenge.nftContract}`);
        console.log(`   - Expires: ${new Date(challenge.expiresAt).toISOString()}`);
        return challenge;
    }
    isValidProofStructure(proof) {
        if (!proof || typeof proof !== 'object') {
            console.log('❌ Proof is not an object');
            return false;
        }
        const requiredComponents = ['pi_a', 'pi_b', 'pi_c'];
        for (const component of requiredComponents) {
            if (!proof[component]) {
                console.log(`❌ Missing proof component: ${component}`);
                return false;
            }
            if (!Array.isArray(proof[component])) {
                console.log(`❌ Proof component ${component} is not an array`);
                return false;
            }
        }
        if (proof.pi_a.length !== 3) {
            console.log('❌ Invalid pi_a length (expected 3 elements)');
            return false;
        }
        if (proof.pi_b.length !== 3) {
            console.log('❌ Invalid pi_b length (expected 3 elements)');
            return false;
        }
        for (let i = 0; i < 2; i++) {
            if (!Array.isArray(proof.pi_b[i]) || proof.pi_b[i].length !== 2) {
                console.log(`❌ Invalid pi_b[${i}] structure`);
                return false;
            }
        }
        if (proof.pi_c.length !== 3) {
            console.log('❌ Invalid pi_c length (expected 3 elements)');
            return false;
        }
        console.log('✅ Proof structure validation passed');
        return true;
    }
    isValidPublicSignals(publicSignals) {
        if (!Array.isArray(publicSignals)) {
            console.log('❌ Public signals is not an array');
            return false;
        }
        if (publicSignals.length === 0) {
            console.log('❌ Public signals array is empty');
            return false;
        }
        for (let i = 0; i < publicSignals.length; i++) {
            const signal = publicSignals[i];
            if (typeof signal !== 'string') {
                console.log(`❌ Public signal ${i} is not a string`);
                return false;
            }
            if (!/^\d+$/.test(signal)) {
                console.log(`❌ Public signal ${i} is not a valid numeric string`);
                return false;
            }
            try {
                const signalBigInt = BigInt(signal);
                const fieldSize = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
                if (signalBigInt >= fieldSize) {
                    console.log(`❌ Public signal ${i} exceeds field size`);
                    return false;
                }
            }
            catch (error) {
                console.log(`❌ Public signal ${i} conversion to BigInt failed`);
                return false;
            }
        }
        console.log(`✅ Public signals validation passed (${publicSignals.length} signals)`);
        return true;
    }
    getServiceStats() {
        return {
            service: 'ZK-Proof Verification Service',
            status: 'active',
            protocol: this.verificationKey?.protocol || 'unknown',
            curve: this.verificationKey?.curve || 'unknown',
            nftContract: this.CORPORATE_EXCELLENCE_CONTRACT,
            publicInputs: this.verificationKey?.nPublic || 0,
            features: [
                'Zero-knowledge NFT ownership verification',
                'Privacy-preserving authentication',
                'Anonymous premium access tokens',
                'Groth16 zk-SNARK verification',
                'Corporate Excellence 2025 NFT support'
            ],
            privacy: {
                walletAddressHidden: true,
                identityPreserving: true,
                zeroKnowledgeProofs: true,
                anonymousAccess: true
            }
        };
    }
}
exports.ZKProofService = ZKProofService;
exports.default = ZKProofService;
//# sourceMappingURL=zkproof.service.js.map