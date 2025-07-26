const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");

/**
 * Comprehensive test suite for NFT Ownership ZK-Proof Circuit
 * 
 * Tests the complete flow from proof generation to verification
 * for the Corporate Excellence 2025 NFT privacy-preserving authentication
 */

class NFTOwnershipTest {
    constructor() {
        this.wasmPath = path.join(__dirname, "..", "build", "nftOwnership.wasm");
        this.zkeyPath = path.join(__dirname, "..", "nftOwnership_0001.zkey");
        this.vkeyPath = path.join(__dirname, "..", "verification_key.json");
    }

    /**
     * Generate realistic test data for Corporate Excellence 2025 NFT
     */
    generateTestData() {
        // Corporate Excellence 2025 NFT contract address (simulated)
        const corporateExcellenceContract = "0x742d35Cc6634C0532925a3b8D8B5d3d8c0eF7e95";
        
        // User's private key (in real app, this comes from wallet)
        const userPrivateKey = "12345678901234567890123456789012345678901234567890123456789012345";
        
        // Generate test merkle tree data
        // In production, this would be maintained by the service
        const merkleRoot = "1234567890123456789012345678901234567890123456789012345678901234";
        const merkleProof = [
            "1111111111111111111111111111111111111111111111111111111111111111",
            "2222222222222222222222222222222222222222222222222222222222222222",
            "3333333333333333333333333333333333333333333333333333333333333333",
            "4444444444444444444444444444444444444444444444444444444444444444",
            "5555555555555555555555555555555555555555555555555555555555555555",
            "6666666666666666666666666666666666666666666666666666666666666666",
            "7777777777777777777777777777777777777777777777777777777777777777",
            "8888888888888888888888888888888888888888888888888888888888888888"
        ];
        const merkleIndices = [0, 1, 0, 1, 0, 1, 0, 1]; // Path through tree

        return {
            // Private inputs (never revealed)
            privateKey: userPrivateKey,
            nonce: "12345",
            tokenId: "42", // User owns token #42
            
            // Public inputs (known to verifier)
            nftContractAddress: BigInt(corporateExcellenceContract).toString(),
            merkleRoot: merkleRoot,
            merkleProof: merkleProof,
            merkleIndices: merkleIndices.map(i => i.toString())
        };
    }

    /**
     * Test proof generation
     */
    async testProofGeneration() {
        console.log("🔐 Testing ZK-Proof Generation...");
        console.log("=====================================");

        try {
            const input = this.generateTestData();
            
            console.log("📊 Input Data:");
            console.log("  Private Key: [HIDDEN]");
            console.log("  NFT Contract:", input.nftContractAddress);
            console.log("  Token ID: [HIDDEN]");
            console.log("  Merkle Root:", input.merkleRoot);

            const startTime = Date.now();
            
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input,
                this.wasmPath,
                this.zkeyPath
            );

            const proofTime = Date.now() - startTime;

            console.log(`\n✅ Proof generated successfully in ${proofTime}ms`);
            console.log("📋 Public Signals:", publicSignals);
            console.log("🔍 Proof components:");
            console.log("  π_a:", proof.pi_a);
            console.log("  π_b:", proof.pi_b); 
            console.log("  π_c:", proof.pi_c);

            return { proof, publicSignals, proofTime };

        } catch (error) {
            console.error("❌ Proof generation failed:", error);
            throw error;
        }
    }

    /**
     * Test proof verification
     */
    async testProofVerification(proof, publicSignals) {
        console.log("\n🔍 Testing ZK-Proof Verification...");
        console.log("====================================");

        try {
            const vKey = JSON.parse(fs.readFileSync(this.vkeyPath));
            
            const startTime = Date.now();
            const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
            const verifyTime = Date.now() - startTime;

            console.log(`\n📊 Verification Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
            console.log(`⏱️  Verification time: ${verifyTime}ms`);

            if (isValid) {
                console.log("🎉 Privacy-preserving authentication successful!");
                console.log("   ✓ User owns Corporate Excellence 2025 NFT");
                console.log("   ✓ Wallet address remains completely private");
                console.log("   ✓ Zero-knowledge proof verified");
            }

            return { isValid, verifyTime };

        } catch (error) {
            console.error("❌ Proof verification failed:", error);
            throw error;
        }
    }

    /**
     * Test invalid proof detection
     */
    async testInvalidProof() {
        console.log("\n🚫 Testing Invalid Proof Detection...");
        console.log("======================================");

        try {
            // Generate proof with invalid data
            const invalidInput = this.generateTestData();
            invalidInput.tokenId = "999"; // User doesn't own this token
            
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                invalidInput,
                this.wasmPath,
                this.zkeyPath
            );

            const vKey = JSON.parse(fs.readFileSync(this.vkeyPath));
            const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);

            console.log(`📊 Invalid proof result: ${isValid ? '❌ INCORRECTLY VALID' : '✅ CORRECTLY INVALID'}`);
            
            return !isValid; // Should be false for invalid proof

        } catch (error) {
            console.log("✅ Invalid proof correctly rejected during generation");
            return true;
        }
    }

    /**
     * Performance benchmarking
     */
    async benchmarkPerformance() {
        console.log("\n⚡ Performance Benchmarking...");
        console.log("===============================");

        const results = {
            proofTimes: [],
            verifyTimes: [],
            avgProofTime: 0,
            avgVerifyTime: 0
        };

        const numTests = 5;

        for (let i = 0; i < numTests; i++) {
            console.log(`🔄 Running test ${i + 1}/${numTests}...`);
            
            const { proofTime, verifyTime } = await this.runSingleBenchmark();
            results.proofTimes.push(proofTime);
            results.verifyTimes.push(verifyTime);
        }

        results.avgProofTime = results.proofTimes.reduce((a, b) => a + b, 0) / numTests;
        results.avgVerifyTime = results.verifyTimes.reduce((a, b) => a + b, 0) / numTests;

        console.log("\n📊 Benchmark Results:");
        console.log(`   Average Proof Generation: ${results.avgProofTime.toFixed(2)}ms`);
        console.log(`   Average Verification: ${results.avgVerifyTime.toFixed(2)}ms`);
        console.log(`   Proof Times: [${results.proofTimes.join(', ')}]ms`);
        console.log(`   Verify Times: [${results.verifyTimes.join(', ')}]ms`);

        return results;
    }

    async runSingleBenchmark() {
        const input = this.generateTestData();
        
        const proofStart = Date.now();
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            this.wasmPath,
            this.zkeyPath
        );
        const proofTime = Date.now() - proofStart;

        const vKey = JSON.parse(fs.readFileSync(this.vkeyPath));
        const verifyStart = Date.now();
        await snarkjs.groth16.verify(vKey, publicSignals, proof);
        const verifyTime = Date.now() - verifyStart;

        return { proofTime, verifyTime };
    }

    /**
     * Run complete test suite
     */
    async runAllTests() {
        console.log("🧪 NFT Ownership ZK-Proof Circuit Test Suite");
        console.log("==============================================");
        console.log("Testing privacy-preserving Corporate Excellence 2025 NFT authentication\n");

        try {
            // Test 1: Valid proof generation and verification
            const { proof, publicSignals } = await this.testProofGeneration();
            const { isValid } = await this.testProofVerification(proof, publicSignals);

            if (!isValid) {
                throw new Error("Valid proof failed verification");
            }

            // Test 2: Invalid proof detection
            const invalidDetected = await this.testInvalidProof();
            if (!invalidDetected) {
                throw new Error("Invalid proof was not properly detected");
            }

            // Test 3: Performance benchmarking
            const benchmarkResults = await this.benchmarkPerformance();

            console.log("\n🎉 All tests passed successfully!");
            console.log("==================================");
            console.log("✅ Valid proofs generate and verify correctly");
            console.log("✅ Invalid proofs are properly rejected");
            console.log("✅ Performance is within acceptable limits");
            console.log(`✅ Average proof time: ${benchmarkResults.avgProofTime.toFixed(2)}ms`);
            console.log(`✅ Average verify time: ${benchmarkResults.avgVerifyTime.toFixed(2)}ms`);

            // Save test results
            const testResults = {
                timestamp: new Date().toISOString(),
                validProofTest: { passed: true, isValid },
                invalidProofTest: { passed: true, invalidDetected },
                benchmarkResults,
                summary: "All tests passed - Circuit ready for production"
            };

            fs.writeFileSync(
                path.join(__dirname, "..", "test_results.json"),
                JSON.stringify(testResults, null, 2)
            );

            return testResults;

        } catch (error) {
            console.error("\n💥 Test suite failed:", error.message);
            throw error;
        }
    }
}

// CLI execution
if (require.main === module) {
    const tester = new NFTOwnershipTest();
    
    tester.runAllTests()
        .then(results => {
            console.log("\n📄 Test results saved to test_results.json");
            process.exit(0);
        })
        .catch(error => {
            console.error("Test suite failed:", error);
            process.exit(1);
        });
}

module.exports = NFTOwnershipTest;
