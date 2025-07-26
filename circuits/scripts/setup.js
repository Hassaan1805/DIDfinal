#!/usr/bin/env node

/**
 * NFT Ownership ZK-Proof Setup Script
 * 
 * This script handles the complete setup process for the NFT ownership circuit:
 * 1. Compiles the Circom circuit
 * 2. Performs the trusted setup ceremony
 * 3. Generates the Solidity verifier contract
 * 4. Creates test data for development
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CIRCUIT_NAME = 'nftOwnership';
const BUILD_DIR = path.join(__dirname, '..', 'build');
const CIRCUITS_DIR = path.join(__dirname, '..', 'circuits');

// Colors for console output
const colors = {
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
    log(`\n🔧 ${description}...`, 'blue');
    try {
        execSync(command, { stdio: 'inherit' });
        log(`✅ ${description} completed successfully`, 'green');
    } catch (error) {
        log(`❌ ${description} failed: ${error.message}`, 'red');
        process.exit(1);
    }
}

async function main() {
    log('🚀 Starting NFT Ownership ZK-Proof Setup', 'green');
    log('========================================', 'green');

    // Ensure build directory exists
    if (!fs.existsSync(BUILD_DIR)) {
        fs.mkdirSync(BUILD_DIR, { recursive: true });
    }

    // Step 1: Compile the circuit
    const circuitPath = path.join(CIRCUITS_DIR, `${CIRCUIT_NAME}.circom`);
    execCommand(
        `circom ${circuitPath} --r1cs --wasm --sym --c -o ${BUILD_DIR}`,
        'Compiling Circom circuit'
    );

    // Step 2: Powers of Tau ceremony (Phase 1)
    log('\n🎭 Starting Powers of Tau ceremony...', 'yellow');
    
    execCommand(
        'snarkjs powersoftau new bn128 14 pot14_0000.ptau',
        'Initializing Powers of Tau'
    );

    execCommand(
        'snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="NFT Circuit Contribution" -v',
        'Contributing to Powers of Tau'
    );

    execCommand(
        'snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v',
        'Preparing Phase 2'
    );

    // Step 3: Circuit-specific setup (Phase 2)
    log('\n🔐 Starting circuit-specific setup...', 'yellow');

    const r1csPath = path.join(BUILD_DIR, `${CIRCUIT_NAME}.r1cs`);
    execCommand(
        `snarkjs groth16 setup ${r1csPath} pot14_final.ptau ${CIRCUIT_NAME}_0000.zkey`,
        'Circuit setup'
    );

    execCommand(
        `snarkjs zkey contribute ${CIRCUIT_NAME}_0000.zkey ${CIRCUIT_NAME}_0001.zkey --name="Circuit Contribution" -v`,
        'Key contribution'
    );

    execCommand(
        `snarkjs zkey export verificationkey ${CIRCUIT_NAME}_0001.zkey verification_key.json`,
        'Exporting verification key'
    );

    // Step 4: Generate Solidity verifier
    execCommand(
        `snarkjs zkey export solidityverifier ${CIRCUIT_NAME}_0001.zkey verifier.sol`,
        'Generating Solidity verifier contract'
    );

    // Step 5: Create test data and utilities
    await createTestUtilities();

    log('\n🎉 Setup completed successfully!', 'green');
    log('📁 Generated files:', 'blue');
    log(`   - ${BUILD_DIR}/${CIRCUIT_NAME}.r1cs (R1CS constraint system)`, 'reset');
    log(`   - ${BUILD_DIR}/${CIRCUIT_NAME}.wasm (WebAssembly for proof generation)`, 'reset');
    log(`   - verification_key.json (Verification key)`, 'reset');
    log(`   - verifier.sol (Solidity verifier contract)`, 'reset');
    log(`   - ${CIRCUIT_NAME}_0001.zkey (Proving key)`, 'reset');
    
    log('\n🔧 Next steps:', 'yellow');
    log('   1. Deploy verifier.sol to your blockchain', 'reset');
    log('   2. Use verification_key.json in your backend', 'reset');
    log('   3. Use the .wasm and .zkey files for proof generation', 'reset');
}

async function createTestUtilities() {
    log('\n📝 Creating test utilities...', 'blue');

    // Create test data generator
    const testDataGenerator = `
const snarkjs = require("snarkjs");
const circomlib = require("circomlib");
const crypto = require("crypto");

/**
 * Test data generator for NFT ownership circuit
 */
class NFTTestDataGenerator {
    constructor() {
        this.poseidon = circomlib.poseidon;
    }

    /**
     * Generate test input for the circuit
     */
    generateTestInput() {
        // Simulate Corporate Excellence 2025 NFT contract
        const nftContractAddress = "0x742d35Cc6634C0532925a3b8D8B5d3d8c0eF7e95";
        
        // Generate random private key (for testing only)
        const privateKey = crypto.randomBytes(32);
        const privateKeyBigInt = BigInt("0x" + privateKey.toString('hex'));
        
        // Generate random nonce
        const nonce = Math.floor(Math.random() * 1000000);
        
        // Simulate token ID
        const tokenId = Math.floor(Math.random() * 10000);
        
        // Create merkle tree data (simplified for testing)
        const merkleProof = Array(8).fill(0).map(() => 
            BigInt("0x" + crypto.randomBytes(32).toString('hex'))
        );
        
        const merkleIndices = Array(8).fill(0).map(() => Math.floor(Math.random() * 2));
        
        // Generate merkle root (simplified)
        const merkleRoot = BigInt("0x" + crypto.randomBytes(32).toString('hex'));
        
        return {
            // Private inputs
            privateKey: privateKeyBigInt.toString(),
            nonce: nonce.toString(),
            tokenId: tokenId.toString(),
            
            // Public inputs
            nftContractAddress: BigInt(nftContractAddress).toString(),
            merkleRoot: merkleRoot.toString(),
            merkleProof: merkleProof.map(p => p.toString()),
            merkleIndices: merkleIndices.map(i => i.toString())
        };
    }

    /**
     * Generate proof using the circuit
     */
    async generateProof(input) {
        try {
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input,
                "build/nftOwnership.wasm",
                "nftOwnership_0001.zkey"
            );
            
            return { proof, publicSignals };
        } catch (error) {
            console.error("Proof generation failed:", error);
            throw error;
        }
    }

    /**
     * Verify proof using verification key
     */
    async verifyProof(proof, publicSignals) {
        try {
            const vKey = JSON.parse(require('fs').readFileSync("verification_key.json"));
            const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
            return res;
        } catch (error) {
            console.error("Proof verification failed:", error);
            throw error;
        }
    }
}

module.exports = NFTTestDataGenerator;

// CLI usage
if (require.main === module) {
    const generator = new NFTTestDataGenerator();
    
    console.log("🧪 Generating test data for NFT ownership circuit...");
    const testInput = generator.generateTestInput();
    
    console.log("📊 Test Input:");
    console.log(JSON.stringify(testInput, null, 2));
    
    // Save test input
    require('fs').writeFileSync('test_input.json', JSON.stringify(testInput, null, 2));
    console.log("💾 Test input saved to test_input.json");
}
`;

    fs.writeFileSync(path.join(__dirname, '..', 'test_data_generator.js'), testDataGenerator);

    // Create circuit info file
    const circuitInfo = {
        name: "NFT Ownership Zero-Knowledge Proof",
        description: "Proves ownership of Corporate Excellence 2025 NFT without revealing wallet address",
        version: "1.0.0",
        circuitFile: "circuits/nftOwnership.circom",
        constraints: "To be calculated after compilation",
        inputs: {
            private: ["privateKey", "nonce", "tokenId"],
            public: ["nftContractAddress", "merkleRoot", "merkleProof", "merkleIndices"]
        },
        outputs: ["isValid"],
        securityModel: "Groth16 zk-SNARK with BN254 curve",
        trustedSetup: "Required (Powers of Tau + Circuit-specific)",
        privacy: "Wallet address and private key remain completely hidden",
        features: [
            "Zero-knowledge proof of NFT ownership",
            "Merkle tree verification for scalability",
            "Replay attack protection via nonce",
            "Range checks for input validation"
        ]
    };

    fs.writeFileSync(
        path.join(__dirname, '..', 'circuit_info.json'),
        JSON.stringify(circuitInfo, null, 2)
    );

    log('✅ Test utilities created', 'green');
}

// Error handling
process.on('uncaughtException', (error) => {
    log(`💥 Uncaught exception: ${error.message}`, 'red');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`💥 Unhandled rejection at: ${promise}, reason: ${reason}`, 'red');
    process.exit(1);
});

// Run the setup
main().catch(console.error);
