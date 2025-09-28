import { ethers } from 'ethers';

// Local validation utilities
function isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function formatDID(method: string, address: string): string {
    return `did:${method}:${address}`;
}

interface SepoliaConfig {
    rpcUrl: string;
    contractAddress: string;
    privateKey: string;
    chainId: number;
}

export class SepoliaBlockchainService {
    private provider!: ethers.JsonRpcProvider;
    private contract: ethers.Contract | null = null;
    private wallet!: ethers.Wallet;
    private config: SepoliaConfig;

    // Contract ABI for SimpleDIDRegistry
    private readonly CONTRACT_ABI = [
        // Owner functions
        "function registerEmployeeDID(address _employee, string memory _did, string memory _publicKeyJwk) external returns (bool)",
        "function recordAuthentication(string memory _challengeId, string memory _message, address _user) external returns (bool)",
        "function verifyAuthentication(string memory _challengeId, bytes memory _signature) external returns (bool)",
        
        // View functions
        "function getEmployeeDIDInfo(address _user) external view returns (string memory, string memory, uint256, bool, uint256)",
        "function getAuthSession(string memory _challengeId) external view returns (address, uint256, bool, bool)",
        "function getContractStats() external view returns (uint256, uint256, uint256)",
        "function isUserRegistered(address _user) external view returns (bool)",
        "function owner() external view returns (address)",
        
        // Events
        "event DIDRegistered(address indexed user, string indexed did, uint256 timestamp)",
        "event AuthenticationRecorded(address indexed user, string indexed challengeId, uint256 timestamp)"
    ];

    constructor() {
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
        } catch (error: any) {
            console.error('❌ Failed to initialize Sepolia service:', error.message);
        }
    }

    /**
     * Initialize provider, wallet, and contract
     */
    private initializeProvider(): void {
        console.log('🔗 Initializing Sepolia blockchain service...');

        // Create provider
        this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);

        // Create wallet
        this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);
        console.log('👛 Platform wallet:', this.wallet.address);

        // Create contract instance if address is provided
        if (this.config.contractAddress) {
            this.contract = new ethers.Contract(
                this.config.contractAddress,
                this.CONTRACT_ABI,
                this.wallet
            );
            console.log('📄 Contract connected:', this.config.contractAddress);
        } else {
            console.warn('⚠️ No contract address configured - contract methods unavailable');
        }

        console.log('✅ Sepolia service initialized successfully');
    }

    /**
     * Register employee DID on blockchain
     */
    async registerEmployeeDID(
        employeeAddress: string,
        did: string,
        publicKeyJwk: string
    ): Promise<{
        success: boolean;
        txHash?: string;
        gasUsed?: string;
        error?: string;
    }> {
        try {
            if (!this.contract) {
                throw new Error('Smart contract not available - check SEPOLIA_CONTRACT_ADDRESS');
            }

            console.log(`🔐 Registering employee DID on Sepolia: ${employeeAddress}`);

            // Validate inputs
            if (!isValidEthereumAddress(employeeAddress)) {
                throw new Error('Invalid Ethereum address');
            }

            if (!did.startsWith('did:ethr:')) {
                throw new Error('Invalid DID format');
            }

            // Check if already registered
            const isRegistered = await this.contract.isUserRegistered(employeeAddress);
            if (isRegistered) {
                console.log('ℹ️ Employee DID already registered for this address');
                return {
                    success: true,
                    txHash: 'already-registered'
                };
            }

            // Estimate gas
            const gasEstimate = await this.contract.registerEmployeeDID.estimateGas(
                employeeAddress,
                did,
                publicKeyJwk
            );
            console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);

            // Execute transaction
            const tx = await this.contract.registerEmployeeDID(
                employeeAddress,
                did,
                publicKeyJwk,
                {
                    gasLimit: gasEstimate * 120n / 100n // 20% buffer
                }
            );

            console.log(`📝 Transaction submitted: ${tx.hash}`);
            console.log(`🔍 Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);

            // Wait for confirmation
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

        } catch (error: any) {
            console.error('❌ Sepolia employee DID registration failed:', error);
            return {
                success: false,
                error: error.message || 'Registration failed'
            };
        }
    }

    /**
     * Record authentication session on blockchain
     */
    async recordAuthentication(
        challengeId: string,
        message: string,
        userAddress: string
    ): Promise<{
        success: boolean;
        txHash?: string;
        gasUsed?: string;
        error?: string;
    }> {
        try {
            if (!this.contract) {
                throw new Error('Smart contract not available - check SEPOLIA_CONTRACT_ADDRESS');
            }

            console.log(`🔏 Recording authentication on Sepolia for challenge ${challengeId}...`);

            // Estimate gas
            const gasEstimate = await this.contract.recordAuthentication.estimateGas(
                challengeId,
                message,
                userAddress
            );

            // Execute transaction
            const tx = await this.contract.recordAuthentication(
                challengeId,
                message,
                userAddress,
                {
                    gasLimit: gasEstimate * 120n / 100n
                }
            );

            console.log(`📝 Authentication record transaction: ${tx.hash}`);

            // Wait for confirmation
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

        } catch (error: any) {
            console.error('❌ Failed to record authentication:', error);
            return {
                success: false,
                error: error.message || 'Authentication recording failed'
            };
        }
    }

    /**
     * Verify authentication signature on blockchain
     */
    async verifyAuthentication(
        challengeId: string,
        signature: string
    ): Promise<{
        success: boolean;
        isValid: boolean;
        txHash?: string;
        gasUsed?: string;
        error?: string;
    }> {
        try {
            if (!this.contract) {
                throw new Error('Smart contract not available - check SEPOLIA_CONTRACT_ADDRESS');
            }

            console.log(`🔍 Verifying authentication on Sepolia for challenge ${challengeId}...`);

            // Convert signature to bytes
            const signatureBytes = ethers.getBytes(signature);

            // Estimate gas
            const gasEstimate = await this.contract.verifyAuthentication.estimateGas(
                challengeId,
                signatureBytes
            );

            // Execute transaction
            const tx = await this.contract.verifyAuthentication(
                challengeId,
                signatureBytes,
                {
                    gasLimit: gasEstimate * 120n / 100n
                }
            );

            console.log(`📝 Verification transaction: ${tx.hash}`);

            // Wait for confirmation
            const receipt = await tx.wait(1);

            // Get verification result from events (simplified)
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

        } catch (error: any) {
            console.error('❌ Authentication verification failed:', error);
            return {
                success: false,
                isValid: false,
                error: error.message || 'Verification failed'
            };
        }
    }

    /**
     * Get employee DID information from blockchain
     */
    async getEmployeeDIDInfo(employeeAddress: string): Promise<{
        success: boolean;
        didInfo?: {
            did: string;
            publicKeyJwk: string;
            registrationDate: string;
            isActive: boolean;
            authCount: number;
        };
        error?: string;
    }> {
        try {
            if (!this.contract) {
                throw new Error('Smart contract not available');
            }

            console.log(`📋 Getting employee DID info for: ${employeeAddress}`);

            if (!isValidEthereumAddress(employeeAddress)) {
                throw new Error('Invalid Ethereum address');
            }

            // Call contract method
            const result = await this.contract.getEmployeeDIDInfo(employeeAddress);

            // Parse result (did, publicKeyJwk, registrationDate, isActive, authCount)
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

        } catch (error: any) {
            console.error('❌ Failed to get employee DID info:', error);
            return {
                success: false,
                error: error.message || 'Failed to retrieve DID info'
            };
        }
    }

    /**
     * Get network status and configuration
     */
    async getNetworkStatus(): Promise<{
        success: boolean;
        status?: {
            networkName: string;
            chainId: number;
            blockNumber: number;
            gasPrice: string;
            walletAddress: string;
            walletBalance: string;
            contractAddress: string;
            contractDeployed: boolean;
        };
        error?: string;
    }> {
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

            // Check if contract is deployed
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
                    gasPrice: ethers.formatUnits(gasPrice.gasPrice || 0, 'gwei') + ' gwei',
                    walletAddress: this.wallet.address,
                    walletBalance: ethers.formatEther(balance) + ' ETH',
                    contractAddress: this.config.contractAddress || 'Not configured',
                    contractDeployed
                }
            };

        } catch (error: any) {
            console.error('❌ Network status check failed:', error);
            return {
                success: false,
                error: error.message || 'Network check failed'
            };
        }
    }

    /**
     * Get service configuration
     */
    getConfig() {
        return {
            rpcUrl: this.config.rpcUrl,
            contractAddress: this.config.contractAddress,
            chainId: this.config.chainId,
            walletAddress: this.wallet?.address || 'Not initialized'
        };
    }

    /**
     * Check if service is configured
     */
    isConfigured(): boolean {
        return !!(this.config.rpcUrl && this.config.privateKey && this.config.contractAddress);
    }

    /**
     * Check if service is ready
     */
    isReady(): boolean {
        return !!(this.provider && this.wallet && this.contract);
    }
}

// Export singleton instance
export const sepoliaService = new SepoliaBlockchainService();