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
const { buildPoseidon } = require('circomlibjs');
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
class ZKProofService {
    constructor() {
        this.CORPORATE_EXCELLENCE_CONTRACT = '0x742d35Cc6634C0532925a3b8D8B5d3d8c0eF7e95';
        this.isEnabled = false;
        this.loadVerificationKey();
    }
    loadVerificationKey() {
        try {
            const vkeyPath = path.join(__dirname, '..', 'zkp', 'verification_key.json');
            if (!fs.existsSync(vkeyPath)) {
                console.log('⚠️  ZK-proof verification key not found - running in demo mode');
                console.log(`   - Missing file: ${vkeyPath}`);
                console.log('   - ZK-proof features will be disabled');
                this.isEnabled = false;
                return;
            }
            this.verificationKey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
            if (this.verificationKey.nPublic < 10) {
                console.warn('⚠️  verification_key.json appears to be a placeholder (nPublic=' + this.verificationKey.nPublic + ').');
                console.warn('   Regenerate it by running the circuit setup — see circuits/README.md');
            }
            this.isEnabled = true;
            console.log('🔑 ZK-proof verification key loaded successfully');
            console.log(`   - Protocol: ${this.verificationKey.protocol}`);
            console.log(`   - Curve: ${this.verificationKey.curve}`);
            console.log(`   - Public inputs: ${this.verificationKey.nPublic}`);
        }
        catch (error) {
            console.error('💥 Failed to load verification key:', error);
            console.log('⚠️  ZK-proof service will run in demo mode');
            this.isEnabled = false;
        }
    }
    async verifyNFTOwnershipProof(proof, publicSignals) {
        try {
            if (!this.isEnabled) {
                console.error('❌ ZK-proof service disabled - verification REJECTED (fail closed)');
                console.error('   Configure ZKP_VERIFICATION_KEY_PATH to enable proof verification');
                return false;
            }
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
    async verifyRoleProof(proof, publicSignals, expectedRoleHash, expectedMerkleRoot) {
        if (!this.isEnabled) {
            return { valid: false, reason: 'ZK-proof service not configured' };
        }
        if (!this.isValidProofStructure(proof)) {
            return { valid: false, reason: 'Invalid proof structure' };
        }
        if (!Array.isArray(publicSignals) || publicSignals.length !== 19) {
            return { valid: false, reason: `Expected 19 public signals, got ${publicSignals?.length}` };
        }
        if (publicSignals[0] !== '1') {
            return { valid: false, reason: 'Circuit output isValid is not 1' };
        }
        if (publicSignals[1] !== expectedRoleHash) {
            return { valid: false, reason: `Role hash mismatch: got ${publicSignals[1]}, expected ${expectedRoleHash}` };
        }
        if (publicSignals[2] !== expectedMerkleRoot) {
            return { valid: false, reason: 'Merkle root mismatch — wrong private key or unregistered identity' };
        }
        try {
            const ok = await snarkjs.groth16.verify(this.verificationKey, publicSignals, proof);
            return ok ? { valid: true } : { valid: false, reason: 'Groth16 verification failed' };
        }
        catch (err) {
            console.error('💥 groth16.verify error:', err?.message);
            console.error('   Stack:', err?.stack?.split('\n').slice(0, 4).join('\n   '));
            return { valid: false, reason: err?.message || 'Groth16 verification error' };
        }
    }
    async computeMerkleRoot(zkPrivKey, roleHash) {
        const poseidon = await buildPoseidon();
        const F = poseidon.F;
        const MAX_252 = BigInt(2) ** BigInt(252);
        const pkField = BigInt('0x' + zkPrivKey) % MAX_252;
        const addr = F.toObject(poseidon([pkField, BigInt(0)]));
        const leaf = F.toObject(poseidon([addr, BigInt(roleHash), BigInt(1)]));
        let node = leaf;
        for (let i = 0; i < 8; i++) {
            node = F.toObject(poseidon([node, BigInt(0)]));
        }
        return node.toString();
    }
    async computeZkAddress(zkPrivKey) {
        const poseidon = await buildPoseidon();
        const F = poseidon.F;
        const MAX_252 = BigInt(2) ** BigInt(252);
        const pkField = BigInt('0x' + zkPrivKey) % MAX_252;
        return F.toObject(poseidon([pkField, BigInt(0)])).toString();
    }
    async generateAndVerifyRoleProof(zkPrivKey, requiredBadge, existingMerkleRoot) {
        if (!this.isEnabled) {
            return { valid: false, reason: 'ZK-proof service not configured' };
        }
        const wasmPath = path.join(__dirname, '..', 'zkp', 'nftOwnership.wasm');
        const zkeyPath = path.join(__dirname, '..', 'zkp', 'nftOwnership_0001.zkey');
        if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
            return { valid: false, reason: 'Circuit artifacts missing from backend/src/zkp/ — copy nftOwnership.wasm and nftOwnership_0001.zkey there' };
        }
        const roleHash = ZKProofService.ROLE_HASHES[requiredBadge];
        if (!roleHash) {
            return { valid: false, reason: `Unknown badge: ${requiredBadge}` };
        }
        try {
            const t0 = Date.now();
            console.log(`\n${'═'.repeat(72)}`);
            console.log(`  ZK-PROOF AUTHENTICATION — Groth16 over BN128`);
            console.log(`${'═'.repeat(72)}`);
            console.log(`  Badge required : ${requiredBadge} (roleHash=${roleHash})`);
            console.log(`  Circuit        : nftOwnership.circom (Poseidon + 8-level Merkle)`);
            console.log(`  Proof system   : Groth16 (snarkjs)`);
            console.log(`  Curve          : BN128`);
            console.log(`  Public signals : 19 (1 output + 18 public inputs)`);
            console.log(`${'─'.repeat(72)}`);
            const merkleRoot = await this.computeMerkleRoot(zkPrivKey, roleHash);
            console.log(`  [1/4] Merkle root computed    : ${merkleRoot.slice(0, 20)}…`);
            if (existingMerkleRoot && existingMerkleRoot !== merkleRoot) {
                console.log(`  [ERR] Merkle root MISMATCH — expected ${existingMerkleRoot.slice(0, 20)}…`);
                console.log(`${'═'.repeat(72)}\n`);
                return { valid: false, reason: 'Merkle root mismatch — wrong private key for registered identity' };
            }
            if (existingMerkleRoot) {
                console.log(`        Matches registered root ✓`);
            }
            const MAX_252 = BigInt(2) ** BigInt(252);
            const pkField = (BigInt('0x' + zkPrivKey) % MAX_252).toString();
            const tProve0 = Date.now();
            console.log(`  [2/4] Generating Groth16 proof (witness + proving)…`);
            const { proof, publicSignals } = await snarkjs.groth16.fullProve({
                privateKey: pkField,
                nonce: '0',
                tokenId: '1',
                nftContractAddress: roleHash,
                merkleRoot,
                merkleProof: Array(8).fill('0'),
                merkleIndices: Array(8).fill('0'),
            }, wasmPath, zkeyPath);
            const proveMs = Date.now() - tProve0;
            console.log(`        Proof generated in ${proveMs}ms`);
            console.log(`        π.a = [${proof.pi_a[0].slice(0, 16)}…, ${proof.pi_a[1].slice(0, 16)}…]`);
            console.log(`        π.b = [[${proof.pi_b[0][0].slice(0, 12)}…], [${proof.pi_b[1][0].slice(0, 12)}…]]`);
            console.log(`        π.c = [${proof.pi_c[0].slice(0, 16)}…, ${proof.pi_c[1].slice(0, 16)}…]`);
            console.log(`  [3/4] Verifying proof against verification key…`);
            console.log(`        isValid (signal[0])     : ${publicSignals[0]}`);
            console.log(`        roleHash (signal[1])    : ${publicSignals[1]}`);
            console.log(`        merkleRoot (signal[2])  : ${publicSignals[2].slice(0, 20)}…`);
            const tVerify0 = Date.now();
            const result = await this.verifyRoleProof(proof, publicSignals, roleHash, merkleRoot);
            const verifyMs = Date.now() - tVerify0;
            if (!result.valid) {
                console.log(`  [FAIL] Verification failed: ${result.reason}`);
                console.log(`${'═'.repeat(72)}\n`);
                return { valid: false, reason: result.reason };
            }
            const totalMs = Date.now() - t0;
            console.log(`        groth16.verify() = true  (${verifyMs}ms)`);
            console.log(`  [4/4] PROOF ACCEPTED`);
            console.log(`${'─'.repeat(72)}`);
            console.log(`  Timing: merkle=${Date.now() - t0 - proveMs - verifyMs}ms  prove=${proveMs}ms  verify=${verifyMs}ms  total=${totalMs}ms`);
            console.log(`${'═'.repeat(72)}\n`);
            return { valid: true, merkleRoot };
        }
        catch (err) {
            console.error('💥 generateAndVerifyRoleProof caught error:', err?.message);
            console.error('   Stack:', err?.stack?.split('\n').slice(0, 6).join('\n   '));
            return { valid: false, reason: err?.message || 'Proof generation error' };
        }
    }
    getServiceStats() {
        return {
            service: 'ZK-Proof Verification Service',
            status: this.isEnabled ? 'active' : 'demo-mode',
            protocol: this.verificationKey?.protocol || 'demo',
            curve: this.verificationKey?.curve || 'demo',
            nftContract: this.CORPORATE_EXCELLENCE_CONTRACT,
            publicInputs: this.verificationKey?.nPublic || 0,
            enabled: this.isEnabled,
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
                zeroKnowledgeProofs: this.isEnabled,
                anonymousAccess: true
            },
            mode: this.isEnabled ? 'production' : 'demo'
        };
    }
}
exports.ZKProofService = ZKProofService;
ZKProofService.ROLE_HASHES = {
    employee: '1000', manager: '1001', auditor: '1002', admin: '1003',
};
exports.default = ZKProofService;
//# sourceMappingURL=zkproof.service.js.map