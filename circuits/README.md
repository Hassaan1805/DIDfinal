# 🔐 Privacy-Preserving NFT Authentication Circuits

**Zero-Knowledge Proof System for Corporate Excellence 2025 NFT Ownership**

This workspace contains the cryptographic circuits that enable privacy-preserving authentication for premium content access. Users can prove they own a "Corporate Excellence 2025" NFT without revealing their wallet address or any other identifying information.

## 🎯 **Purpose**

The circuit implements a zero-knowledge proof system that proves the following statement:
> *"I know a private key which, when converted to a public address, is the owner of an NFT from the specified Corporate Excellence 2025 contract address."*

## 🏗️ **Architecture**

### **Core Components**

1. **`nftOwnership.circom`** - Main ZK-SNARK circuit
2. **Setup Scripts** - Trusted setup ceremony automation
3. **Test Suite** - Comprehensive testing and benchmarking
4. **Verification Key** - For backend proof verification
5. **Solidity Verifier** - On-chain verification (optional)

### **Circuit Design**

```
Input: Private Key (secret) + NFT Contract Address (public) + Merkle Proof
  ↓
Address Derivation (Poseidon Hash)
  ↓
Ownership Hash Generation
  ↓
Merkle Tree Verification
  ↓
Output: isValid (1 or 0)
```

## 🔒 **Privacy Properties**

- ✅ **Private Key**: Never revealed or stored
- ✅ **Wallet Address**: Completely hidden from verifier
- ✅ **Token ID**: Only prover knows which specific NFT they own
- ✅ **Zero-Knowledge**: Only proves membership in valid owner set
- ✅ **Unlinkability**: Multiple proofs cannot be linked to same user

## 🛡️ **Security Features**

- **Groth16 zk-SNARKs** with BN254 elliptic curve
- **Poseidon Hash Function** for efficiency and security
- **Merkle Tree Verification** for scalable ownership proofs
- **Range Checks** prevent malicious inputs
- **Replay Protection** via unique nonce system
- **Trusted Setup** with Powers of Tau ceremony

## 📋 **Circuit Inputs & Outputs**

### **Private Inputs (Secret)**
```javascript
{
  privateKey: "User's private key (256-bit)",
  nonce: "Random nonce for uniqueness", 
  tokenId: "Specific NFT token ID owned"
}
```

### **Public Inputs (Known to Verifier)**
```javascript
{
  nftContractAddress: "Corporate Excellence 2025 contract address",
  merkleRoot: "Root of valid NFT owners merkle tree",
  merkleProof: "8-level merkle proof path",
  merkleIndices: "Path indices for merkle verification"
}
```

### **Output**
```javascript
{
  isValid: 1 // Proof is valid, user owns required NFT
}
```

## 🚀 **Setup Instructions**

### **1. Install Dependencies**

```bash
cd circuits
npm install
```

### **2. Install Circom Compiler**

```bash
# On Windows (using chocolatey)
choco install circom

# On macOS
brew install circom

# Or download from: https://github.com/iden3/circom/releases
```

### **3. Run Complete Setup**

```bash
# Compile circuit and perform trusted setup
node scripts/setup.js
```

This will:
- ✅ Compile the Circom circuit to R1CS and WASM
- ✅ Perform Powers of Tau ceremony (Phase 1)
- ✅ Generate circuit-specific proving key (Phase 2)
- ✅ Export verification key for backend
- ✅ Generate Solidity verifier contract
- ✅ Create test utilities

### **4. Run Tests**

```bash
# Run comprehensive test suite
npm test
```

## 📊 **Performance Characteristics**

Based on benchmarking with BN254 curve:

| Operation | Time | Size |
|-----------|------|------|
| Proof Generation | ~2-5 seconds | ~1KB |
| Proof Verification | ~15-30ms | ~1KB |
| Circuit Constraints | ~50,000 | - |
| Trusted Setup | ~2-3 minutes | One-time |

## 🔧 **Integration Guide**

### **Backend Integration**

```javascript
const snarkjs = require("snarkjs");
const fs = require("fs");

// Load verification key
const vKey = JSON.parse(fs.readFileSync("verification_key.json"));

// Verify proof from client
async function verifyNFTOwnership(proof, publicSignals) {
  const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
  
  if (isValid) {
    // User owns Corporate Excellence 2025 NFT
    // Grant premium access without knowing their identity
    return { success: true, premiumAccess: true };
  }
  
  return { success: false, error: "Invalid NFT ownership proof" };
}
```

### **Mobile Wallet Integration**

```javascript
const snarkjs = require("snarkjs");

// Generate proof on mobile device
async function generateOwnershipProof(privateKey, nftContract, merkleData) {
  const input = {
    privateKey,
    nonce: Math.floor(Math.random() * 1000000).toString(),
    tokenId: "42", // User's token ID
    nftContractAddress: nftContract,
    merkleRoot: merkleData.root,
    merkleProof: merkleData.proof,
    merkleIndices: merkleData.indices
  };

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    "nftOwnership.wasm",
    "nftOwnership_0001.zkey"
  );

  return { proof, publicSignals };
}
```

## 📁 **File Structure**

```
circuits/
├── package.json                    # Dependencies and scripts
├── README.md                       # This documentation
├── circuits/
│   └── nftOwnership.circom         # Main ZK-SNARK circuit
├── scripts/
│   └── setup.js                    # Automated setup script
├── test/
│   └── test.js                     # Comprehensive test suite
├── build/                          # Generated files
│   ├── nftOwnership.r1cs           # R1CS constraint system
│   ├── nftOwnership.wasm           # WebAssembly for proving
│   └── nftOwnership.sym            # Symbol mapping
├── verification_key.json           # Verification key (backend)
├── verifier.sol                    # Solidity verifier contract
├── nftOwnership_0001.zkey          # Proving key (mobile)
└── test_results.json               # Latest test results
```

## 🌟 **Use Cases**

1. **Premium Content Access** - Prove NFT ownership for exclusive content
2. **Anonymous Membership** - Join exclusive groups without revealing identity
3. **Gated Communities** - Access private Discord/Telegram channels
4. **Exclusive Events** - RSVP to events without doxxing wallet
5. **Governance Participation** - Vote anonymously with verified ownership

## 🔄 **Development Workflow**

1. **Modify Circuit** - Edit `circuits/nftOwnership.circom`
2. **Recompile** - Run `npm run compile`
3. **Update Setup** - Run trusted setup if circuit changed significantly
4. **Test Changes** - Run `npm test` to verify functionality
5. **Deploy Verifier** - Update backend with new verification key

## 🚨 **Security Considerations**

### **Trusted Setup**
- The circuit requires a trusted setup ceremony
- Powers of Tau parameters must be generated securely
- Toxic waste (setup randomness) must be destroyed
- In production, use a multi-party ceremony

### **Implementation Security**
- Always validate proof inputs on the backend
- Use rate limiting to prevent DoS attacks
- Store proving keys securely on client devices
- Implement proper error handling

### **Privacy Considerations**
- Proofs are unlinkable but not renewable
- Merkle tree updates require coordination
- Consider proof batching for better anonymity
- Monitor for potential side-channel attacks

## 🤝 **Contributing**

1. Follow the existing circuit patterns
2. Add comprehensive tests for new features
3. Update documentation for any changes
4. Run the full test suite before submitting
5. Consider privacy and security implications

## 📚 **Additional Resources**

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Library](https://github.com/iden3/snarkjs)
- [ZK-SNARKs Explained](https://z.cash/technology/zksnarks/)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
- [BN254 Curve Specification](https://hackmd.io/@jpw/bn254)

---

**🔐 Built for Privacy. Designed for Trust. Powered by Zero-Knowledge.**

*Corporate Excellence 2025 NFT Authentication - Where Privacy Meets Proof*
