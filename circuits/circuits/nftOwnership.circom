pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";

/*
 * NFT Ownership Zero-Knowledge Proof Circuit
 *
 * Proves that a user owns an NFT from a specific contract
 * without revealing their wallet address or private key.
 */

template NFTOwnership() {
    // Private inputs (signal input = private by default in circom v2)
    signal input privateKey;
    signal input nonce;
    signal input tokenId;

    // Public inputs
    signal input nftContractAddress;
    signal input merkleRoot;
    signal input merkleProof[8];
    signal input merkleIndices[8];

    // Output
    signal output isValid;

    // Intermediate signals (must be declared at template level, not inside loops)
    signal publicAddress;
    signal ownershipHash;
    signal merkleLeaf;
    signal merkleNodes[9];
    signal leftInput[8];
    signal rightInput[8];

    // Components
    component privateKeyBits = Num2Bits(252);
    component addressHasher = Poseidon(2);
    component ownershipHasher = Poseidon(3);
    component merkleHasher[8];
    component merkleComparator = IsEqual();
    component finalValidator = IsEqual();

    for (var i = 0; i < 8; i++) {
        merkleHasher[i] = Poseidon(2);
    }

    // Step 1: Constrain private key to field size (252 bits fits BN254)
    privateKeyBits.in <== privateKey;

    // Step 2: Derive public address via Poseidon(privateKey, nonce)
    addressHasher.inputs[0] <== privateKey;
    addressHasher.inputs[1] <== nonce;
    publicAddress <== addressHasher.out;

    // Step 3: Ownership commitment
    ownershipHasher.inputs[0] <== publicAddress;
    ownershipHasher.inputs[1] <== nftContractAddress;
    ownershipHasher.inputs[2] <== tokenId;
    ownershipHash <== ownershipHasher.out;

    // Step 4: Merkle proof verification
    merkleLeaf <== ownershipHash;
    merkleNodes[0] <== merkleLeaf;

    for (var level = 0; level < 8; level++) {
        // Mux: if index==0, current is left; if index==1, current is right
        // leftInput  = index * proof  + (1 - index) * current
        //            = current + index * (proof - current)
        // This expands to a single quadratic constraint each
        leftInput[level]  <== merkleNodes[level] + merkleIndices[level] * (merkleProof[level] - merkleNodes[level]);
        rightInput[level] <== merkleProof[level] + merkleIndices[level] * (merkleNodes[level]  - merkleProof[level]);

        merkleHasher[level].inputs[0] <== leftInput[level];
        merkleHasher[level].inputs[1] <== rightInput[level];
        merkleNodes[level + 1] <== merkleHasher[level].out;
    }

    // Step 5: Check computed root == expected root
    merkleComparator.in[0] <== merkleNodes[8];
    merkleComparator.in[1] <== merkleRoot;

    finalValidator.in[0] <== merkleComparator.out;
    finalValidator.in[1] <== 1;
    isValid <== finalValidator.out;

    // Ensure contract address is non-zero
    component contractAddressValid = IsZero();
    contractAddressValid.in <== nftContractAddress;
    contractAddressValid.out === 0;
}

component main {public [nftContractAddress, merkleRoot, merkleProof, merkleIndices]} = NFTOwnership();
