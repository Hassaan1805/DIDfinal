// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DIDRegistry
 * @dev A simple DID registry contract for managing decentralized identifiers
 * This contract serves as the foundation for our DID-based authentication system
 */
contract DIDRegistry {
    // Event emitted when a DID is created
    event DIDCreated(address indexed owner, string did);
    
    // Event emitted when a DID is registered via gas station
    event DIDRegistered(address indexed owner, address indexed registrar, string publicKey);
    
    // Event emitted when a DID is updated
    event DIDUpdated(address indexed owner, string did);
    
    // Event emitted when a DID is revoked
    event DIDRevoked(address indexed owner, string did);
    
    // Mapping from address to DID document
    mapping(address => string) public didDocuments;
    
    // Mapping from address to public key (for gas station registration)
    mapping(address => string) public publicKeys;
    
    // Mapping to track if a DID is revoked
    mapping(address => bool) public revokedDIDs;
    
    // Contract owner
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyDIDOwner(address didOwner) {
        require(msg.sender == didOwner, "Only DID owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Registers a DID for a user via gas station pattern
     * @param userAddress The address of the user who owns the DID
     * @param publicKey The user's public key (compressed format)
     */
    function registerDID(address userAddress, string memory publicKey) public {
        require(userAddress != address(0), "Invalid user address");
        require(bytes(publicKey).length > 0, "Public key cannot be empty");
        require(bytes(publicKeys[userAddress]).length == 0, "DID already registered");
        require(!revokedDIDs[userAddress], "DID is revoked");
        
        // Store the public key
        publicKeys[userAddress] = publicKey;
        
        // Create a basic DID document
        string memory didDocument = string(abi.encodePacked(
            '{"@context":["https://www.w3.org/ns/did/v1"],"id":"did:ethr:',
            _addressToString(userAddress),
            '","verificationMethod":[{"id":"did:ethr:',
            _addressToString(userAddress),
            '#controller","type":"EcdsaSecp256k1RecoveryMethod2020","controller":"did:ethr:',
            _addressToString(userAddress),
            '","publicKeyHex":"',
            publicKey,
            '"}]}'
        ));
        
        didDocuments[userAddress] = didDocument;
        
        emit DIDRegistered(userAddress, msg.sender, publicKey);
        emit DIDCreated(userAddress, didDocument);
    }

    /**
     * @dev Creates a new DID for the caller
     * @param didDocument The DID document as a JSON string
     */
    function createDID(string memory didDocument) public {
        require(bytes(didDocuments[msg.sender]).length == 0, "DID already exists");
        require(!revokedDIDs[msg.sender], "DID is revoked");
        
        didDocuments[msg.sender] = didDocument;
        emit DIDCreated(msg.sender, didDocument);
    }
    
    /**
     * @dev Updates an existing DID document
     * @param didDocument The updated DID document as a JSON string
     */
    function updateDID(string memory didDocument) public onlyDIDOwner(msg.sender) {
        require(bytes(didDocuments[msg.sender]).length > 0, "DID does not exist");
        require(!revokedDIDs[msg.sender], "DID is revoked");
        
        didDocuments[msg.sender] = didDocument;
        emit DIDUpdated(msg.sender, didDocument);
    }
    
    /**
     * @dev Revokes a DID
     */
    function revokeDID() public onlyDIDOwner(msg.sender) {
        require(bytes(didDocuments[msg.sender]).length > 0, "DID does not exist");
        require(!revokedDIDs[msg.sender], "DID already revoked");
        
        revokedDIDs[msg.sender] = true;
        emit DIDRevoked(msg.sender, didDocuments[msg.sender]);
    }
    
    /**
     * @dev Gets a DID document by owner address
     * @param didOwner The address of the DID owner
     * @return The DID document as a JSON string
     */
    function getDIDDocument(address didOwner) public view returns (string memory) {
        require(bytes(didDocuments[didOwner]).length > 0, "DID does not exist");
        require(!revokedDIDs[didOwner], "DID is revoked");
        
        return didDocuments[didOwner];
    }
    
    /**
     * @dev Checks if a DID exists and is not revoked
     * @param didOwner The address of the DID owner
     * @return True if DID exists and is not revoked
     */
    function isValidDID(address didOwner) public view returns (bool) {
        return bytes(didDocuments[didOwner]).length > 0 && !revokedDIDs[didOwner];
    }
    
    /**
     * @dev Gets the public key for a registered DID
     * @param didOwner The address of the DID owner
     * @return The public key as a string
     */
    function getPublicKey(address didOwner) public view returns (string memory) {
        require(bytes(publicKeys[didOwner]).length > 0, "Public key not found");
        return publicKeys[didOwner];
    }
    
    /**
     * @dev Helper function to convert address to lowercase hex string
     * @param addr The address to convert
     * @return The address as a hex string
     */
    function _addressToString(address addr) private pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}
