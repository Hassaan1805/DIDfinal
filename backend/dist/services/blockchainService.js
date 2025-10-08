"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockchainService = exports.BlockchainService = void 0;
const ethers_1 = require("ethers");
const formatDID = (method, identifier) => {
    return `did:${method}:${identifier.toLowerCase()}`;
};
const DID_REGISTRY_ABI = [
    "function registerDID(address userAddress, string memory publicKey) public",
    "function getDIDDocument(address didOwner) public view returns (string memory)",
    "function isValidDID(address didOwner) public view returns (bool)",
    "function getPublicKey(address didOwner) public view returns (string memory)",
    "function owner() public view returns (address)",
    "event DIDRegistered(address indexed owner, address indexed registrar, string publicKey)",
    "event DIDCreated(address indexed owner, string did)"
];
class BlockchainService {
    constructor(config) {
        this.provider = new ethers_1.ethers.JsonRpcProvider(config.rpcUrl);
        this.gasStationWallet = new ethers_1.ethers.Wallet(config.gasStationPrivateKey, this.provider);
        this.didRegistryContract = new ethers_1.ethers.Contract(config.contractAddress, DID_REGISTRY_ABI, this.gasStationWallet);
    }
    async registerDID(userAddress, publicKey) {
        try {
            if (!ethers_1.ethers.isAddress(userAddress)) {
                throw new Error('Invalid user address format');
            }
            if (!publicKey || publicKey.length < 66) {
                throw new Error('Invalid public key format');
            }
            console.log(`🔗 Registering DID for address: ${userAddress}`);
            console.log(`🔑 Public key: ${publicKey.substring(0, 10)}...`);
            const existingDID = await this.isDIDRegistered(userAddress);
            if (existingDID) {
                throw new Error('DID already registered for this address');
            }
            const gasEstimate = await this.didRegistryContract.registerDID.estimateGas(userAddress, publicKey);
            console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
            const tx = await this.didRegistryContract.registerDID(userAddress, publicKey, {
                gasLimit: gasEstimate * 120n / 100n
            });
            console.log(`📋 Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            if (!receipt) {
                throw new Error('Transaction failed - no receipt');
            }
            console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
            const did = formatDID('ethr', userAddress);
            const registeredEvent = receipt.logs.find((log) => {
                try {
                    const parsed = this.didRegistryContract.interface.parseLog(log);
                    return parsed?.name === 'DIDRegistered';
                }
                catch {
                    return false;
                }
            });
            if (registeredEvent) {
                console.log(`🎉 DID registered successfully: ${did}`);
            }
            return {
                did,
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };
        }
        catch (error) {
            console.error('❌ Blockchain service error:', error);
            if (error.code === 'CALL_EXCEPTION') {
                throw new Error(`Smart contract error: ${error.reason || error.message}`);
            }
            else if (error.code === 'INSUFFICIENT_FUNDS') {
                throw new Error('Insufficient funds in gas station wallet');
            }
            else if (error.code === 'NETWORK_ERROR') {
                throw new Error('Blockchain network connection error');
            }
            throw new Error(`Blockchain operation failed: ${error.message}`);
        }
    }
    async isDIDRegistered(userAddress) {
        try {
            return await this.didRegistryContract.isValidDID(userAddress);
        }
        catch (error) {
            console.error('Error checking DID registration:', error);
            return false;
        }
    }
    async getDIDDocument(userAddress) {
        try {
            return await this.didRegistryContract.getDIDDocument(userAddress);
        }
        catch (error) {
            throw new Error(`Failed to get DID document: ${error.message}`);
        }
    }
    async getPublicKey(userAddress) {
        try {
            console.log(`🔍 Getting public key for address: ${userAddress}`);
            const publicKey = await this.didRegistryContract.getPublicKey(userAddress);
            if (!publicKey || publicKey.trim() === '') {
                throw new Error('Public key not found for this address');
            }
            console.log(`✅ Public key retrieved: ${publicKey}`);
            return publicKey;
        }
        catch (error) {
            console.error(`❌ Failed to get public key for ${userAddress}:`, error);
            if (error.message.includes('Public key not found')) {
                throw new Error('No public key registered for this address');
            }
            else if (error.message.includes('revert')) {
                throw new Error('DID not registered on blockchain');
            }
            throw new Error(`Failed to retrieve public key: ${error.message}`);
        }
    }
    async getGasStationBalance() {
        try {
            const balance = await this.provider.getBalance(this.gasStationWallet.address);
            return ethers_1.ethers.formatEther(balance);
        }
        catch (error) {
            throw new Error(`Failed to get balance: ${error.message}`);
        }
    }
    async getNetworkInfo() {
        try {
            const network = await this.provider.getNetwork();
            const blockNumber = await this.provider.getBlockNumber();
            return {
                name: network.name,
                chainId: Number(network.chainId),
                blockNumber
            };
        }
        catch (error) {
            throw new Error(`Failed to get network info: ${error.message}`);
        }
    }
    getContractInfo() {
        return {
            address: this.didRegistryContract.target,
            abi: DID_REGISTRY_ABI
        };
    }
    async getAllRegisteredDIDs() {
        try {
            console.log('🔍 Fetching all registered DIDs...');
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 10000);
            const filter = this.didRegistryContract.filters.DIDRegistered();
            const events = await this.didRegistryContract.queryFilter(filter, fromBlock, currentBlock);
            console.log(`📋 Found ${events.length} DID registration events`);
            const registeredDIDs = [];
            for (const event of events) {
                try {
                    if ('args' in event && event.args) {
                        const args = event.args;
                        const userAddress = args[0];
                        const publicKey = args[2];
                        const did = formatDID('ethr', userAddress);
                        let timestamp = 'Unknown';
                        try {
                            const block = await this.provider.getBlock(event.blockNumber);
                            if (block) {
                                timestamp = new Date(block.timestamp * 1000).toLocaleString();
                            }
                        }
                        catch (blockError) {
                            console.warn(`⚠️ Could not fetch block ${event.blockNumber}:`, blockError);
                        }
                        registeredDIDs.push({
                            address: userAddress,
                            did: did,
                            publicKey: publicKey,
                            txHash: event.transactionHash,
                            blockNumber: event.blockNumber,
                            timestamp: timestamp
                        });
                    }
                }
                catch (parseError) {
                    console.warn('⚠️ Error parsing DID event:', parseError);
                }
            }
            registeredDIDs.sort((a, b) => b.blockNumber - a.blockNumber);
            console.log(`✅ Processed ${registeredDIDs.length} registered DIDs`);
            return registeredDIDs;
        }
        catch (error) {
            console.error('❌ Error fetching registered DIDs:', error);
            throw new Error(`Failed to fetch registered DIDs: ${error.message}`);
        }
    }
    async getRecentTransactions(limit = 10) {
        try {
            console.log('🔍 Fetching recent transactions...');
            const transactions = [];
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 1000);
            const filter = this.didRegistryContract.filters.DIDRegistered();
            const events = await this.didRegistryContract.queryFilter(filter, fromBlock, currentBlock);
            for (const event of events.slice(0, limit)) {
                try {
                    const tx = await this.provider.getTransaction(event.transactionHash);
                    const receipt = await this.provider.getTransactionReceipt(event.transactionHash);
                    if (!tx || !receipt)
                        continue;
                    let timestamp = 'Unknown';
                    try {
                        const block = await this.provider.getBlock(event.blockNumber);
                        if (block) {
                            timestamp = new Date(block.timestamp * 1000).toLocaleString();
                        }
                    }
                    catch (blockError) {
                        console.warn(`⚠️ Could not fetch block ${event.blockNumber}:`, blockError);
                    }
                    transactions.push({
                        hash: event.transactionHash,
                        from: tx.from,
                        to: tx.to || this.didRegistryContract.target,
                        blockNumber: event.blockNumber,
                        gasUsed: receipt.gasUsed.toString(),
                        timestamp: timestamp,
                        type: 'DID_REGISTRATION'
                    });
                }
                catch (txError) {
                    console.warn('⚠️ Error fetching transaction details:', txError);
                }
            }
            transactions.sort((a, b) => b.blockNumber - a.blockNumber);
            console.log(`✅ Processed ${transactions.length} recent transactions`);
            return transactions;
        }
        catch (error) {
            console.error('❌ Error fetching recent transactions:', error);
            throw new Error(`Failed to fetch recent transactions: ${error.message}`);
        }
    }
}
exports.BlockchainService = BlockchainService;
const blockchainConfig = {
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/your-project-id',
    contractAddress: process.env.CONTRACT_ADDRESS || '0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48',
    gasStationPrivateKey: process.env.GAS_STATION_PRIVATE_KEY || '0x1234567890123456789012345678901234567890123456789012345678901234'
};
exports.blockchainService = new BlockchainService(blockchainConfig);
//# sourceMappingURL=blockchainService.js.map