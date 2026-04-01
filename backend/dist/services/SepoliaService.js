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
            chainId: 11155111,
            adminGasPayerAddress: process.env.ADMIN_GAS_PAYER_ADDRESS || '0xBdA3AC10e1403cFC54Ab2195Aad7Da8a39B775B9',
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
        if (this.config.adminGasPayerAddress) {
            const configured = this.config.adminGasPayerAddress.toLowerCase();
            const signer = this.wallet.address.toLowerCase();
            if (configured !== signer) {
                console.warn(`⚠️ ADMIN_GAS_PAYER_ADDRESS (${this.config.adminGasPayerAddress}) does not match signer wallet (${this.wallet.address}). ` +
                    'Transactions will be paid by the signer wallet.');
            }
        }
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
            const balance = await this.provider.getBalance(this.wallet.address);
            const feeData = await this.provider.getFeeData();
            const gasPrice = feeData.gasPrice || 0n;
            const estimatedCost = 300000n * gasPrice;
            const requiredBalance = estimatedCost * 150n / 100n;
            console.log(`💰 Wallet balance: ${ethers_1.ethers.formatEther(balance)} ETH`);
            console.log(`💸 Estimated cost: ${ethers_1.ethers.formatEther(estimatedCost)} ETH`);
            console.log(`⚠️  Required balance: ${ethers_1.ethers.formatEther(requiredBalance)} ETH`);
            if (balance < requiredBalance) {
                const shortfall = requiredBalance - balance;
                return {
                    success: false,
                    error: `Insufficient funds in gas station wallet. ` +
                        `Balance: ${ethers_1.ethers.formatEther(balance)} ETH, ` +
                        `Required: ${ethers_1.ethers.formatEther(requiredBalance)} ETH, ` +
                        `Shortfall: ${ethers_1.ethers.formatEther(shortfall)} ETH. ` +
                        `Please fund wallet at ${this.wallet.address} using https://sepoliafaucet.com/`
                };
            }
            let gasLimit;
            try {
                const gasEstimate = await this.contract.registerEmployeeDID.estimateGas(employeeAddress, did, publicKeyJwk);
                console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
                gasLimit = gasEstimate * 150n / 100n;
            }
            catch (estimateError) {
                console.warn('⚠️  Gas estimation failed, using fallback:', estimateError.message);
                gasLimit = 300000n;
            }
            console.log(`⛽ Using gas limit: ${gasLimit.toString()}`);
            const tx = await this.contract.registerEmployeeDID(employeeAddress, did, publicKeyJwk, {
                gasLimit: gasLimit
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
            let errorMessage = 'Registration failed';
            if (error.code === 'CALL_EXCEPTION') {
                errorMessage = `Contract rejected transaction: ${error.reason || error.message}. Possible causes: DID already registered, invalid input, or contract state issue.`;
            }
            else if (error.code === 'INSUFFICIENT_FUNDS' || error.message?.includes('insufficient funds')) {
                errorMessage = `Insufficient funds in wallet ${this.wallet.address}. Get testnet ETH from https://sepoliafaucet.com/`;
            }
            else if (error.code === 'NETWORK_ERROR' || error.code === 'SERVER_ERROR') {
                errorMessage = `Network connection error. Check internet connection or try alternative RPC endpoint.`;
            }
            else if (error.code === 'TIMEOUT') {
                errorMessage = `Transaction timeout. The transaction may still be pending on Sepolia.`;
            }
            else if (error.message?.includes('gas')) {
                errorMessage = `Gas error: ${error.message}. Check wallet balance and network status.`;
            }
            else {
                errorMessage = error.message || 'Unknown error occurred';
            }
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    async recordAuthentication(challengeId, message, userAddress) {
        try {
            if (!this.contract) {
                throw new Error('Smart contract not available - check SEPOLIA_CONTRACT_ADDRESS');
            }
            console.log(`🔏 Recording authentication on Sepolia for challenge ${challengeId}...`);
            let gasLimit;
            try {
                const gasEstimate = await this.contract.recordAuthentication.estimateGas(challengeId, message, userAddress);
                console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
                gasLimit = gasEstimate * 150n / 100n;
            }
            catch (estimateError) {
                console.warn('⚠️  Gas estimation failed, using fallback:', estimateError.message);
                gasLimit = 200000n;
            }
            console.log(`⛽ Using gas limit: ${gasLimit.toString()}`);
            const tx = await this.contract.recordAuthentication(challengeId, message, userAddress, {
                gasLimit: gasLimit
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
            let errorMessage = 'Authentication recording failed';
            if (error.code === 'CALL_EXCEPTION') {
                errorMessage = `Contract rejected transaction: ${error.reason || error.message}`;
            }
            else if (error.code === 'INSUFFICIENT_FUNDS' || error.message?.includes('insufficient funds')) {
                errorMessage = `Insufficient funds. Fund wallet at https://sepoliafaucet.com/`;
            }
            else if (error.code === 'NETWORK_ERROR' || error.code === 'SERVER_ERROR') {
                errorMessage = `Network connection error. Check RPC endpoint.`;
            }
            else if (error.message?.includes('gas')) {
                errorMessage = `Gas error: ${error.message}`;
            }
            else {
                errorMessage = error.message || 'Unknown error occurred';
            }
            return {
                success: false,
                error: errorMessage
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
            let gasLimit;
            try {
                const gasEstimate = await this.contract.verifyAuthentication.estimateGas(challengeId, signatureBytes);
                console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
                gasLimit = gasEstimate * 150n / 100n;
            }
            catch (estimateError) {
                console.warn('⚠️  Gas estimation failed, using fallback:', estimateError.message);
                gasLimit = 150000n;
            }
            console.log(`⛽ Using gas limit: ${gasLimit.toString()}`);
            const tx = await this.contract.verifyAuthentication(challengeId, signatureBytes, {
                gasLimit: gasLimit
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
    async getLatestDidRegistrationTx(employeeAddress) {
        try {
            if (!this.contract || !this.provider) {
                throw new Error('Smart contract not available');
            }
            if (!isValidEthereumAddress(employeeAddress)) {
                throw new Error('Invalid Ethereum address');
            }
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 500000);
            const filter = this.contract.filters.DIDRegistered(employeeAddress);
            const events = await this.contract.queryFilter(filter, fromBlock, currentBlock);
            if (events.length === 0) {
                throw new Error('No DID registration transaction found for this address');
            }
            const latest = events[events.length - 1];
            const block = await this.provider.getBlock(latest.blockNumber);
            return {
                success: true,
                txHash: latest.transactionHash,
                blockNumber: latest.blockNumber,
                timestamp: block ? new Date(block.timestamp * 1000).toISOString() : undefined,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to resolve DID registration transaction',
            };
        }
    }
    async getLatestAuthenticationTx(employeeAddress) {
        try {
            if (!this.contract || !this.provider) {
                throw new Error('Smart contract not available');
            }
            if (!isValidEthereumAddress(employeeAddress)) {
                throw new Error('Invalid Ethereum address');
            }
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 500000);
            const filter = this.contract.filters.AuthenticationRecorded(employeeAddress);
            const events = await this.contract.queryFilter(filter, fromBlock, currentBlock);
            if (events.length === 0) {
                throw new Error('No authentication transaction found for this address');
            }
            const latest = events[events.length - 1];
            const block = await this.provider.getBlock(latest.blockNumber);
            return {
                success: true,
                txHash: latest.transactionHash,
                blockNumber: latest.blockNumber,
                timestamp: block ? new Date(block.timestamp * 1000).toISOString() : undefined,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to resolve authentication transaction',
            };
        }
    }
    getConfig() {
        return {
            rpcUrl: this.config.rpcUrl,
            contractAddress: this.config.contractAddress,
            chainId: this.config.chainId,
            walletAddress: this.wallet?.address || 'Not initialized',
            adminGasPayerAddress: this.getGasPayerAddress(),
        };
    }
    getGasPayerAddress() {
        return this.wallet?.address || this.config.adminGasPayerAddress || '';
    }
    getGasPayerEtherscanUrl() {
        const gasPayer = this.getGasPayerAddress();
        return gasPayer ? `https://sepolia.etherscan.io/address/${gasPayer}` : 'https://sepolia.etherscan.io';
    }
    isConfigured() {
        return !!(this.config.rpcUrl && this.config.privateKey && this.config.contractAddress);
    }
    isReady() {
        return !!(this.provider && this.wallet && this.contract);
    }
    getReadinessStatus() {
        const issues = [];
        const actionableMessages = [];
        if (!this.config.rpcUrl) {
            issues.push('SEPOLIA_RPC_URL not configured');
            actionableMessages.push('Set SEPOLIA_RPC_URL in your .env file (e.g., https://sepolia.infura.io/v3/YOUR_KEY)');
        }
        if (!this.config.privateKey) {
            issues.push('PLATFORM_PRIVATE_KEY not configured');
            actionableMessages.push('Set PLATFORM_PRIVATE_KEY in your .env file (use a dedicated wallet for gas payments)');
        }
        if (!this.config.contractAddress) {
            issues.push('SEPOLIA_CONTRACT_ADDRESS not configured');
            actionableMessages.push('Set SEPOLIA_CONTRACT_ADDRESS in your .env file after deploying the contract');
        }
        if (this.config.rpcUrl && !this.provider) {
            issues.push('Provider failed to initialize');
            actionableMessages.push('Check that SEPOLIA_RPC_URL is valid and accessible');
        }
        if (this.config.privateKey && !this.wallet) {
            issues.push('Wallet failed to initialize');
            actionableMessages.push('Check that PLATFORM_PRIVATE_KEY is a valid Ethereum private key');
        }
        if (this.config.contractAddress && !this.contract) {
            issues.push('Contract failed to initialize');
            actionableMessages.push('Verify the contract is deployed at SEPOLIA_CONTRACT_ADDRESS');
        }
        return {
            ready: issues.length === 0 && this.isReady(),
            configured: this.isConfigured(),
            issues,
            actionableMessages,
            config: {
                rpcUrl: this.config.rpcUrl ? `${this.config.rpcUrl.substring(0, 30)}...` : 'not set',
                contractAddress: this.config.contractAddress || 'not set',
                walletAddress: this.wallet?.address || 'not initialized',
                chainId: this.config.chainId,
            },
        };
    }
    async getUnifiedStatus() {
        const readiness = this.getReadinessStatus();
        let status = 'unavailable';
        let networkStatus = undefined;
        let recommendedAction = '';
        if (readiness.ready) {
            try {
                const networkResult = await this.getNetworkStatus();
                if (networkResult.success && networkResult.status) {
                    networkStatus = networkResult.status;
                    status = networkResult.status.contractDeployed ? 'operational' : 'degraded';
                    if (!networkResult.status.contractDeployed) {
                        readiness.issues.push('Contract not deployed at configured address');
                        readiness.actionableMessages.push('Deploy the contract using: npm run blockchain:deploy');
                    }
                    const balanceNum = parseFloat(networkResult.status.walletBalance);
                    if (balanceNum < 0.01) {
                        readiness.issues.push('Low wallet balance for gas payments');
                        readiness.actionableMessages.push(`Fund wallet ${this.wallet?.address} with Sepolia ETH from https://sepoliafaucet.com/`);
                        status = 'degraded';
                    }
                }
                else {
                    status = 'degraded';
                    readiness.issues.push('Network status check failed');
                    readiness.actionableMessages.push('Verify RPC endpoint is accessible');
                }
            }
            catch (error) {
                status = 'degraded';
                readiness.issues.push(`Network check error: ${error.message}`);
            }
        }
        if (status === 'operational') {
            recommendedAction = 'Sepolia blockchain is operational. You can register DIDs and authenticate.';
        }
        else if (status === 'degraded') {
            recommendedAction = readiness.actionableMessages[0] || 'Review configuration and resolve issues.';
        }
        else {
            recommendedAction = 'Configure Sepolia environment variables to enable blockchain features.';
        }
        return {
            sepolia: {
                ready: status === 'operational',
                configured: readiness.configured,
                status,
                issues: readiness.issues,
                actionableMessages: readiness.actionableMessages,
                networkStatus,
            },
            recommendedAction,
        };
    }
}
exports.SepoliaBlockchainService = SepoliaBlockchainService;
exports.sepoliaService = new SepoliaBlockchainService();
//# sourceMappingURL=SepoliaService.js.map