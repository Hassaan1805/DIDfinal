"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sepoliaService = exports.SepoliaBlockchainService = void 0;
const ethers_1 = require("ethers");
function isValidEthereumAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}
function formatDID(method, address) {
    return `did:${method}:${address}`;
}
class SepoliaBlockchainService {
    constructor() {
        this.contract = null;
        this.CONTRACT_ABI = [
            "function registerEmployeeDID(address _employee, string memory _did, string memory _publicKeyJwk) external returns (bool)",
            "function recordAuthentication(string memory _challengeId, string memory _message, address _user) external returns (bool)",
            "function verifyAuthentication(string memory _challengeId, bytes memory _signature) external returns (bool)",
            "function getEmployeeDIDInfo(address _user) external view returns (string memory, string memory, uint256, bool, uint256)",
            "function getAuthSession(string memory _challengeId) external view returns (address, uint256, bool, bool)",
            "function getContractStats() external view returns (uint256, uint256, uint256)",
            "function isUserRegistered(address _user) external view returns (bool)",
            "function owner() external view returns (address)",
            "event DIDRegistered(address indexed user, string indexed did, uint256 timestamp)",
            "event AuthenticationRecorded(address indexed user, string indexed challengeId, uint256 timestamp)"
        ];
        this.config = {
            rpcUrl: process.env.SEPOLIA_RPC_URL || '',
            contractAddress: process.env.SEPOLIA_CONTRACT_ADDRESS || '',
            privateKey: process.env.PLATFORM_PRIVATE_KEY || '',
            chainId: 11155111
        };
        if (!this.config.rpcUrl || !this.config.privateKey) {
            console.warn('⚠️ Sepolia service not fully configured - check environment variables');
            return;
        }
        try {
            this.initializeProvider();
        }
        catch (error) {
            console.error('❌ Failed to initialize Sepolia service:', error.message);
        }
    }
    initializeProvider() {
        console.log('🔗 Initializing Sepolia blockchain service...');
        this.provider = new ethers_1.ethers.JsonRpcProvider(this.config.rpcUrl);
        this.wallet = new ethers_1.ethers.Wallet(this.config.privateKey, this.provider);
        console.log('👛 Platform wallet:', this.wallet.address);
        if (this.config.contractAddress) {
            this.contract = new ethers_1.ethers.Contract(this.config.contractAddress, this.CONTRACT_ABI, this.wallet);
            console.log('📄 Contract connected:', this.config.contractAddress);
        }
        else {
            console.warn('⚠️ No contract address configured - contract methods unavailable');
        }
        console.log('✅ Sepolia service initialized successfully');
    }
    async registerEmployeeDID(employeeAddress, did, publicKeyJwk) {
        try {
            if (!this.contract) {
                throw new Error('Smart contract not available - check SEPOLIA_CONTRACT_ADDRESS');
            }
            console.log(`🔐 Registering employee DID on Sepolia: ${employeeAddress}`);
            if (!isValidEthereumAddress(employeeAddress)) {
                throw new Error('Invalid Ethereum address');
            }
            if (!did.startsWith('did:ethr:')) {
                throw new Error('Invalid DID format');
            }
            const isRegistered = await this.contract.isUserRegistered(employeeAddress);
            if (isRegistered) {
                console.log('ℹ️ Employee DID already registered for this address');
                return {
                    success: true,
                    txHash: 'already-registered'
                };
            }
            const gasEstimate = await this.contract.registerEmployeeDID.estimateGas(employeeAddress, did, publicKeyJwk);
            console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
            const tx = await this.contract.registerEmployeeDID(employeeAddress, did, publicKeyJwk, {
                gasLimit: gasEstimate * 120n / 100n
            });
            console.log(`📝 Transaction submitted: ${tx.hash}`);
            console.log(`🔍 Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
            const receipt = await tx.wait(1);
            console.log('✅ Employee DID registration confirmed on Sepolia:', {
                address: employeeAddress,
                did,
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            });
            return {
                success: true,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString()
            };
        }
        catch (error) {
            console.error('❌ Sepolia employee DID registration failed:', error);
            return {
                success: false,
                error: error.message || 'Registration failed'
            };
        }
    }
    async recordAuthentication(challengeId, message, userAddress) {
        try {
            if (!this.contract) {
                throw new Error('Smart contract not available - check SEPOLIA_CONTRACT_ADDRESS');
            }
            console.log(`🔏 Recording authentication on Sepolia for challenge ${challengeId}...`);
            const gasEstimate = await this.contract.recordAuthentication.estimateGas(challengeId, message, userAddress);
            const tx = await this.contract.recordAuthentication(challengeId, message, userAddress, {
                gasLimit: gasEstimate * 120n / 100n
            });
            console.log(`📝 Authentication record transaction: ${tx.hash}`);
            const receipt = await tx.wait(1);
            console.log('✅ Authentication recorded on Sepolia:', {
                challengeId,
                userAddress,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString()
            });
            return {
                success: true,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString()
            };
        }
        catch (error) {
            console.error('❌ Failed to record authentication:', error);
            return {
                success: false,
                error: error.message || 'Authentication recording failed'
            };
        }
    }
    async verifyAuthentication(challengeId, signature) {
        try {
            if (!this.contract) {
                throw new Error('Smart contract not available - check SEPOLIA_CONTRACT_ADDRESS');
            }
            console.log(`🔍 Verifying authentication on Sepolia for challenge ${challengeId}...`);
            const signatureBytes = ethers_1.ethers.getBytes(signature);
            const gasEstimate = await this.contract.verifyAuthentication.estimateGas(challengeId, signatureBytes);
            const tx = await this.contract.verifyAuthentication(challengeId, signatureBytes, {
                gasLimit: gasEstimate * 120n / 100n
            });
            console.log(`📝 Verification transaction: ${tx.hash}`);
            const receipt = await tx.wait(1);
            const isValid = receipt.status === 1;
            console.log('✅ Authentication verification completed:', {
                challengeId,
                isValid,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString()
            });
            return {
                success: true,
                isValid,
                txHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString()
            };
        }
        catch (error) {
            console.error('❌ Authentication verification failed:', error);
            return {
                success: false,
                isValid: false,
                error: error.message || 'Verification failed'
            };
        }
    }
    async getEmployeeDIDInfo(employeeAddress) {
        try {
            if (!this.contract) {
                throw new Error('Smart contract not available');
            }
            console.log(`📋 Getting employee DID info for: ${employeeAddress}`);
            if (!isValidEthereumAddress(employeeAddress)) {
                throw new Error('Invalid Ethereum address');
            }
            const result = await this.contract.getEmployeeDIDInfo(employeeAddress);
            const [did, publicKeyJwk, registrationDate, isActive, authCount] = result;
            return {
                success: true,
                didInfo: {
                    did,
                    publicKeyJwk,
                    registrationDate: new Date(Number(registrationDate) * 1000).toISOString(),
                    isActive,
                    authCount: Number(authCount)
                }
            };
        }
        catch (error) {
            console.error('❌ Failed to get employee DID info:', error);
            return {
                success: false,
                error: error.message || 'Failed to retrieve DID info'
            };
        }
    }
    async getNetworkStatus() {
        try {
            if (!this.provider || !this.wallet) {
                throw new Error('Provider not initialized');
            }
            console.log('🌐 Checking Sepolia network status...');
            const [network, blockNumber, gasPrice, balance] = await Promise.all([
                this.provider.getNetwork(),
                this.provider.getBlockNumber(),
                this.provider.getFeeData(),
                this.provider.getBalance(this.wallet.address)
            ]);
            const contractCode = this.config.contractAddress
                ? await this.provider.getCode(this.config.contractAddress)
                : '0x';
            const contractDeployed = contractCode !== '0x';
            return {
                success: true,
                status: {
                    networkName: network.name,
                    chainId: Number(network.chainId),
                    blockNumber,
                    gasPrice: ethers_1.ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei') + ' gwei',
                    walletAddress: this.wallet.address,
                    walletBalance: ethers_1.ethers.formatEther(balance) + ' ETH',
                    contractAddress: this.config.contractAddress || 'Not configured',
                    contractDeployed
                }
            };
        }
        catch (error) {
            console.error('❌ Network status check failed:', error);
            return {
                success: false,
                error: error.message || 'Network check failed'
            };
        }
    }
    getConfig() {
        return {
            rpcUrl: this.config.rpcUrl,
            contractAddress: this.config.contractAddress,
            chainId: this.config.chainId,
            walletAddress: this.wallet?.address || 'Not initialized'
        };
    }
    isConfigured() {
        return !!(this.config.rpcUrl && this.config.privateKey && this.config.contractAddress);
    }
    isReady() {
        return !!(this.provider && this.wallet && this.contract);
    }
}
exports.SepoliaBlockchainService = SepoliaBlockchainService;
exports.sepoliaService = new SepoliaBlockchainService();
//# sourceMappingURL=SepoliaService.js.map