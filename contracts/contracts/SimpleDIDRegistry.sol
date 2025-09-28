// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Simple DID Registry for Testing
 * @dev Basic DID registry for Sepolia deployment testing
 */
contract SimpleDIDRegistry {
    // Events
    event DIDRegistered(
        address indexed user, 
        string indexed did, 
        uint256 timestamp
    );
    
    event AuthenticationRecorded(
        address indexed user, 
        string indexed challengeId, 
        uint256 timestamp
    );

    // Structures
    struct DIDRecord {
        string did;                    // DID identifier
        string publicKeyJwk;          // Public key
        uint256 registrationDate;     // Registration timestamp
        bool isActive;                // Active status
        uint256 authCount;            // Number of authentications
    }

    struct AuthSession {
        address user;                 // User address
        string challengeId;          // Challenge identifier
        uint256 timestamp;           // Session timestamp
        bool isVerified;             // Verification status
        bool exists;                 // Session exists flag
    }

    // Storage
    mapping(address => DIDRecord) public didRegistry;
    mapping(string => AuthSession) public authSessions;
    mapping(address => string[]) public userAuthHistory;
    
    // Configuration
    uint256 public totalRegistrations = 0;
    uint256 public totalAuthentications = 0;
    
    // Contract owner
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Register employee DID
     */
    function registerEmployeeDID(
        address _employee,
        string memory _did,
        string memory _publicKeyJwk
    ) external onlyOwner returns (bool) {
        require(_employee != address(0), "Invalid employee address");
        require(bytes(_did).length > 0, "DID cannot be empty");
        require(!didRegistry[_employee].isActive, "DID already registered");

        didRegistry[_employee] = DIDRecord({
            did: _did,
            publicKeyJwk: _publicKeyJwk,
            registrationDate: block.timestamp,
            isActive: true,
            authCount: 0
        });

        totalRegistrations++;
        emit DIDRegistered(_employee, _did, block.timestamp);
        
        return true;
    }

    /**
     * @dev Record authentication attempt
     */
    function recordAuthentication(
        string memory _challengeId,
        string memory _message,
        address _user
    ) external onlyOwner returns (bool) {
        require(_user != address(0), "Invalid user address");
        require(bytes(_challengeId).length > 0, "Challenge ID required");
        require(didRegistry[_user].isActive, "User DID not registered");

        authSessions[_challengeId] = AuthSession({
            user: _user,
            challengeId: _challengeId,
            timestamp: block.timestamp,
            isVerified: false,
            exists: true
        });

        return true;
    }

    /**
     * @dev Verify authentication
     */
    function verifyAuthentication(
        string memory _challengeId,
        bytes memory _signature
    ) external onlyOwner returns (bool) {
        AuthSession storage session = authSessions[_challengeId];
        
        require(session.exists, "Challenge not found");
        require(!session.isVerified, "Challenge already verified");
        require(didRegistry[session.user].isActive, "User DID not active");

        // For simplicity, assume signature is valid (in production use proper verification)
        session.isVerified = true;
        didRegistry[session.user].authCount++;
        userAuthHistory[session.user].push(_challengeId);
        totalAuthentications++;

        emit AuthenticationRecorded(session.user, _challengeId, block.timestamp);
        
        return true;
    }

    /**
     * @dev Get employee's DID information
     */
    function getEmployeeDIDInfo(address _user) external view returns (
        string memory did,
        string memory publicKeyJwk,
        uint256 registrationDate,
        bool isActive,
        uint256 authCount
    ) {
        DIDRecord memory record = didRegistry[_user];
        return (record.did, record.publicKeyJwk, record.registrationDate, record.isActive, record.authCount);
    }

    /**
     * @dev Get authentication session details
     */
    function getAuthSession(string memory _challengeId) external view returns (
        address user,
        uint256 timestamp,
        bool isVerified,
        bool exists
    ) {
        AuthSession memory session = authSessions[_challengeId];
        return (session.user, session.timestamp, session.isVerified, session.exists);
    }

    /**
     * @dev Get contract statistics
     */
    function getContractStats() external view returns (
        uint256 registrations,
        uint256 authentications,
        uint256 blockNumber
    ) {
        return (totalRegistrations, totalAuthentications, block.number);
    }

    /**
     * @dev Check if user is registered
     */
    function isUserRegistered(address _user) external view returns (bool) {
        return didRegistry[_user].isActive;
    }
}