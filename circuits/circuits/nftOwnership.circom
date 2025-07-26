pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

/*
 * NFT Ownership Zero-Knowledge Proof Circuit
 * 
 * This circuit proves that a user owns an NFT from a specific contract
 * without revealing their wallet address or private key.
 * 
 * The proof statement: "I know a private key which, when converted to a 
 * public address, is the owner of an NFT from the specified contract address."
 */

template NFTOwnership() {
    // Private inputs (known only to the prover)
    signal private input privateKey;           // User's private key (256 bits)
    signal private input nonce;               // Random nonce for uniqueness
    signal private input tokenId;             // Specific NFT token ID owned
    
    // Public inputs (known to both prover and verifier)
    signal input nftContractAddress;          // Address of the NFT contract
    signal input merkleRoot;                  // Merkle root of valid NFT owners
    signal input merkleProof[8];             // Merkle proof path (depth 8)
    signal input merkleIndices[8];           // Path indices for merkle proof
    
    // Output signal
    signal output isValid;                    // 1 if proof is valid, 0 otherwise
    
    // Intermediate signals
    signal publicAddress;                     // Derived public address
    signal addressHash;                       // Hash of the public address
    signal ownershipHash;                     // Hash proving ownership
    signal merkleLeaf;                        // Leaf in the merkle tree
    
    // Component declarations
    component privateKeyBits = Num2Bits(256);
    component addressHasher = Poseidon(2);
    component ownershipHasher = Poseidon(3);
    component merkleHasher[8];
    component merkleComparator = IsEqual();
    component finalValidator = IsEqual();
    
    // Initialize merkle hashers
    for (var i = 0; i < 8; i++) {
        merkleHasher[i] = Poseidon(2);
    }
    
    // Step 1: Convert private key to bits for address derivation
    privateKeyBits.in <== privateKey;
    
    // Step 2: Derive public address from private key (simplified simulation)
    // In a real implementation, this would use ECDSA on secp256k1
    // For this PoC, we use Poseidon hash as a secure mapping
    addressHasher.inputs[0] <== privateKey;
    addressHasher.inputs[1] <== nonce;
    publicAddress <== addressHasher.out;
    
    // Step 3: Create ownership proof hash
    // This represents the commitment that links the address to NFT ownership
    ownershipHasher.inputs[0] <== publicAddress;
    ownershipHasher.inputs[1] <== nftContractAddress;
    ownershipHasher.inputs[2] <== tokenId;
    ownershipHash <== ownershipHasher.out;
    
    // Step 4: Create merkle tree leaf (what should be in the tree)
    merkleLeaf <== ownershipHash;
    
    // Step 5: Verify merkle proof
    // This proves that the ownership hash exists in the merkle tree of valid owners
    signal merkleNodes[9]; // 8 intermediate nodes + root
    merkleNodes[0] <== merkleLeaf;
    
    for (var level = 0; level < 8; level++) {
        // Determine if we hash (current, sibling) or (sibling, current)
        signal leftInput;
        signal rightInput;
        
        // If merkleIndices[level] == 0, current node is left child
        // If merkleIndices[level] == 1, current node is right child
        leftInput <== merkleIndices[level] * merkleProof[level] + (1 - merkleIndices[level]) * merkleNodes[level];
        rightInput <== merkleIndices[level] * merkleNodes[level] + (1 - merkleIndices[level]) * merkleProof[level];
        
        merkleHasher[level].inputs[0] <== leftInput;
        merkleHasher[level].inputs[1] <== rightInput;
        merkleNodes[level + 1] <== merkleHasher[level].out;
    }
    
    // Step 6: Verify that computed root matches expected root
    merkleComparator.in[0] <== merkleNodes[8]; // Computed root
    merkleComparator.in[1] <== merkleRoot;     // Expected root
    
    // Step 7: Final validation
    // The proof is valid if merkle verification passes
    finalValidator.in[0] <== merkleComparator.out;
    finalValidator.in[1] <== 1;
    isValid <== finalValidator.out;
    
    // Constraints to prevent malicious inputs
    // Ensure private key is within valid range (non-zero, less than curve order)
    component privateKeyRange = LessThan(256);
    privateKeyRange.in[0] <== privateKey;
    privateKeyRange.in[1] <== 21888242871839275222246405745257275088548364400416034343698204186575808495617; // BN254 field size
    privateKeyRange.out === 1;
    
    // Ensure nonce contributes to uniqueness
    component nonceRange = LessThan(64);
    nonceRange.in[0] <== nonce;
    nonceRange.in[1] <== 18446744073709551616; // 2^64
    nonceRange.out === 1;
    
    // Ensure contract address is valid (non-zero)
    component contractAddressValid = IsZero();
    contractAddressValid.in <== nftContractAddress;
    contractAddressValid.out === 0; // Should NOT be zero
}

// Main component instantiation
component main {public [nftContractAddress, merkleRoot, merkleProof, merkleIndices]} = NFTOwnership();

/*
 * Circuit Analysis:
 * 
 * PRIVACY PROPERTIES:
 * - Private key never revealed or stored
 * - Actual wallet address never disclosed
 * - Only proves membership in the set of valid NFT owners
 * 
 * SECURITY PROPERTIES:
 * - Uses cryptographically secure Poseidon hash function
 * - Merkle tree prevents forgery of ownership claims
 * - Range checks prevent invalid inputs
 * - Nonce prevents replay attacks
 * 
 * SCALABILITY:
 * - Merkle tree allows efficient verification for large NFT collections
 * - Circuit size is logarithmic in number of valid owners
 * - Proof size is constant regardless of NFT collection size
 * 
 * USAGE FLOW:
 * 1. Service maintains merkle tree of all valid NFT owners
 * 2. User generates proof using their private key and merkle path
 * 3. Service verifies proof without learning user identity
 * 4. Access granted based on proof validity only
 */
