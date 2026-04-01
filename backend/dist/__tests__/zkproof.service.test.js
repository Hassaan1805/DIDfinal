"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zkproof_service_1 = __importDefault(require("../services/zkproof.service"));
describe('ZKProof Service', () => {
    let service;
    beforeEach(() => {
        service = new zkproof_service_1.default();
    });
    describe('Service initialization', () => {
        test('should load verification key and be enabled', () => {
            const stats = service.getServiceStats();
            expect(stats.service).toBe('ZK-Proof Verification Service');
            expect(stats.nftContract).toBeDefined();
            expect(stats.features).toBeInstanceOf(Array);
            expect(stats.features.length).toBeGreaterThan(0);
        });
        test('should report correct protocol info', () => {
            const stats = service.getServiceStats();
            if (stats.enabled) {
                expect(stats.protocol).toBe('groth16');
                expect(stats.curve).toBe('bn128');
                expect(stats.publicInputs).toBe(4);
            }
        });
    });
    describe('generateAuthChallenge', () => {
        test('should generate a valid challenge object', () => {
            const challenge = service.generateAuthChallenge();
            expect(challenge.challengeId).toBeDefined();
            expect(typeof challenge.challengeId).toBe('string');
            expect(challenge.timestamp).toBeDefined();
            expect(challenge.nftContract).toBeDefined();
            expect(challenge.requiredProof).toBe('NFT_OWNERSHIP');
            expect(challenge.expiresAt).toBeGreaterThan(Date.now());
        });
        test('should generate unique challenge IDs', () => {
            const c1 = service.generateAuthChallenge();
            const c2 = service.generateAuthChallenge();
            expect(c1.challengeId).not.toBe(c2.challengeId);
        });
        test('challenge should expire in ~5 minutes', () => {
            const challenge = service.generateAuthChallenge();
            const fiveMinMs = 5 * 60 * 1000;
            const diff = challenge.expiresAt - challenge.timestamp;
            expect(diff).toBeCloseTo(fiveMinMs, -3);
        });
        test('challenge should include instructions', () => {
            const challenge = service.generateAuthChallenge();
            expect(challenge.instructions).toBeDefined();
            expect(challenge.instructions.step1).toBeDefined();
            expect(challenge.instructions.step2).toBeDefined();
            expect(challenge.instructions.step3).toBeDefined();
            expect(challenge.instructions.privacy).toBeDefined();
        });
    });
    describe('verifyNFTOwnershipProof', () => {
        test('should reject null proof', async () => {
            const result = await service.verifyNFTOwnershipProof(null, []);
            expect(result).toBe(false);
        });
        test('should reject proof with missing components', async () => {
            const badProof = { pi_a: ['1', '2', '3'] };
            const result = await service.verifyNFTOwnershipProof(badProof, ['0']);
            expect(result).toBe(false);
        });
        test('should reject proof with invalid pi_a length', async () => {
            const badProof = {
                pi_a: ['1', '2'],
                pi_b: [['1', '2'], ['3', '4'], '1'],
                pi_c: ['1', '2', '3'],
            };
            const result = await service.verifyNFTOwnershipProof(badProof, ['0']);
            expect(result).toBe(false);
        });
        test('should reject empty public signals', async () => {
            const proof = {
                pi_a: ['1', '2', '3'],
                pi_b: [['1', '2'], ['3', '4'], '1'],
                pi_c: ['1', '2', '3'],
            };
            const result = await service.verifyNFTOwnershipProof(proof, []);
            expect(result).toBe(false);
        });
        test('should reject non-numeric public signals', async () => {
            const proof = {
                pi_a: ['1', '2', '3'],
                pi_b: [['1', '2'], ['3', '4'], '1'],
                pi_c: ['1', '2', '3'],
            };
            const result = await service.verifyNFTOwnershipProof(proof, ['abc']);
            expect(result).toBe(false);
        });
        test('should reject signals exceeding field size', async () => {
            const proof = {
                pi_a: ['1', '2', '3'],
                pi_b: [['1', '2'], ['3', '4'], '1'],
                pi_c: ['1', '2', '3'],
            };
            const hugeSignal = '99999999999999999999999999999999999999999999999999999999999999999999999999999999';
            const result = await service.verifyNFTOwnershipProof(proof, [hugeSignal]);
            expect(result).toBe(false);
        });
    });
    describe('getServiceStats', () => {
        test('should return complete stats object', () => {
            const stats = service.getServiceStats();
            expect(stats.service).toBeDefined();
            expect(stats.status).toBeDefined();
            expect(stats.nftContract).toBeDefined();
            expect(typeof stats.enabled).toBe('boolean');
            expect(stats.features).toBeInstanceOf(Array);
            expect(stats.privacy).toBeDefined();
            expect(stats.privacy.walletAddressHidden).toBe(true);
            expect(stats.privacy.identityPreserving).toBe(true);
            expect(stats.privacy.anonymousAccess).toBe(true);
        });
        test('mode should match enabled status', () => {
            const stats = service.getServiceStats();
            if (stats.enabled) {
                expect(stats.mode).toBe('production');
                expect(stats.status).toBe('active');
            }
            else {
                expect(stats.mode).toBe('demo');
                expect(stats.status).toBe('demo-mode');
            }
        });
    });
});
//# sourceMappingURL=zkproof.service.test.js.map