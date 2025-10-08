import { ethers } from 'ethers';

// DID utility functions
const formatDID = (method: string, identifier: string): string => {
  return `did:${method}:${identifier.toLowerCase()}`;
};

// Contract ABI for the registerDID function and events
const DID_REGISTRY_ABI = [
  "function registerDID(address userAddress, string memory publicKey) public",
  "function getDIDDocument(address didOwner) public view returns (string memory)",
  "function isValidDID(address didOwner) public view returns (bool)",
  "function getPublicKey(address didOwner) public view returns (string memory)",
  "function owner() public view returns (address)",
  "event DIDRegistered(address indexed owner, address indexed registrar, string publicKey)",
  "event DIDCreated(address indexed owner, string did)"
];

interface BlockchainConfig {
  rpcUrl: string;
  contractAddress: string;
  gasStationPrivateKey: string;
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private gasStationWallet: ethers.Wallet;
  private didRegistryContract: ethers.Contract;

  constructor(config: BlockchainConfig) {
    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    
    // Initialize gas station wallet (backend's funded wallet)
    this.gasStationWallet = new ethers.Wallet(config.gasStationPrivateKey, this.provider);
    
    // Initialize contract instance
    this.didRegistryContract = new ethers.Contract(
      config.contractAddress,
      DID_REGISTRY_ABI,
      this.gasStationWallet
    );
  }

  /**
   * Registers a DID for a user using the gas station pattern
   * @param userAddress - The user's Ethereum address
   * @param publicKey - The user's public key (compressed format)
   * @returns Transaction result with DID information
   */
  async registerDID(userAddress: string, publicKey: string): Promise<{
    did: string;
    txHash: string;
    blockNumber: number;
    gasUsed: string;
  }> {
    try {
      // Validate inputs
      if (!ethers.isAddress(userAddress)) {
        throw new Error('Invalid user address format');
      }
      
      if (!publicKey || publicKey.length < 66) {
        throw new Error('Invalid public key format');
      }

      console.log(`🔗 Registering DID for address: ${userAddress}`);
      console.log(`🔑 Public key: ${publicKey.substring(0, 10)}...`);

      // Check if DID already exists
      const existingDID = await this.isDIDRegistered(userAddress);
      if (existingDID) {
        throw new Error('DID already registered for this address');
      }

      // Estimate gas
      const gasEstimate = await this.didRegistryContract.registerDID.estimateGas(
        userAddress,
        publicKey
      );
      
      console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);

      // Execute transaction
      const tx = await this.didRegistryContract.registerDID(
        userAddress,
        publicKey,
        {
          gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
        }
      );

      console.log(`📋 Transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction failed - no receipt');
      }

      console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);

      // Generate DID string
      const did = formatDID('ethr', userAddress);

      // Parse events to get additional info
      const registeredEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = this.didRegistryContract.interface.parseLog(log);
          return parsed?.name === 'DIDRegistered';
        } catch {
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

    } catch (error: any) {
      console.error('❌ Blockchain service error:', error);
      
      // Handle specific blockchain errors
      if (error.code === 'CALL_EXCEPTION') {
        throw new Error(`Smart contract error: ${error.reason || error.message}`);
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds in gas station wallet');
      } else if (error.code === 'NETWORK_ERROR') {
        throw new Error('Blockchain network connection error');
      }
      
      throw new Error(`Blockchain operation failed: ${error.message}`);
    }
  }

  /**
   * Checks if a DID is already registered for an address
   * @param userAddress - The user's Ethereum address
   * @returns True if DID exists
   */
  async isDIDRegistered(userAddress: string): Promise<boolean> {
    try {
      return await this.didRegistryContract.isValidDID(userAddress);
    } catch (error) {
      console.error('Error checking DID registration:', error);
      return false;
    }
  }

  /**
   * Gets the DID document for a registered address
   * @param userAddress - The user's Ethereum address
   * @returns DID document as JSON string
   */
  async getDIDDocument(userAddress: string): Promise<string> {
    try {
      return await this.didRegistryContract.getDIDDocument(userAddress);
    } catch (error: any) {
      throw new Error(`Failed to get DID document: ${error.message}`);
    }
  }

  /**
   * Gets the public key for a registered DID from the smart contract
   * @param userAddress The user's Ethereum address
   * @returns The user's public key string
   */
  async getPublicKey(userAddress: string): Promise<string> {
    try {
      console.log(`🔍 Getting public key for address: ${userAddress}`);
      
      // Call the getPublicKey function from the smart contract
      const publicKey = await this.didRegistryContract.getPublicKey(userAddress);
      
      if (!publicKey || publicKey.trim() === '') {
        throw new Error('Public key not found for this address');
      }
      
      console.log(`✅ Public key retrieved: ${publicKey}`);
      return publicKey;
      
    } catch (error: any) {
      console.error(`❌ Failed to get public key for ${userAddress}:`, error);
      
      // Provide more specific error messages
      if (error.message.includes('Public key not found')) {
        throw new Error('No public key registered for this address');
      } else if (error.message.includes('revert')) {
        throw new Error('DID not registered on blockchain');
      }
      
      throw new Error(`Failed to retrieve public key: ${error.message}`);
    }
  }

  /**
   * Gets gas station wallet balance
   * @returns Balance in ETH
   */
  async getGasStationBalance(): Promise<string> {
    try {
      const balance = await this.provider.getBalance(this.gasStationWallet.address);
      return ethers.formatEther(balance);
    } catch (error: any) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  /**
   * Gets current network information
   * @returns Network details
   */
  async getNetworkInfo(): Promise<{ name: string; chainId: number; blockNumber: number }> {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      
      return {
        name: network.name,
        chainId: Number(network.chainId),
        blockNumber
      };
    } catch (error: any) {
      throw new Error(`Failed to get network info: ${error.message}`);
    }
  }

  /**
   * Gets contract information
   * @returns Contract details
   */
  getContractInfo(): { address: string; abi: any[] } {
    return {
      address: this.didRegistryContract.target as string,
      abi: DID_REGISTRY_ABI
    };
  }

  /**
   * Gets all registered DIDs by querying events
   * @returns Array of registered DID information
   */
  async getAllRegisteredDIDs(): Promise<Array<{
    address: string;
    did: string;
    publicKey: string;
    txHash: string;
    blockNumber: number;
    timestamp?: string;
  }>> {
    try {
      console.log('🔍 Fetching all registered DIDs...');
      
      // Query DIDRegistered events from the contract
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last 10k blocks
      
      const filter = this.didRegistryContract.filters.DIDRegistered();
      const events = await this.didRegistryContract.queryFilter(filter, fromBlock, currentBlock);
      
      console.log(`📋 Found ${events.length} DID registration events`);
      
      const registeredDIDs = [];
      
      for (const event of events) {
        try {
          // Check if this is an EventLog (not a regular Log)
          if ('args' in event && event.args) {
            const args = event.args;
            
            const userAddress = args[0]; // owner
            const publicKey = args[2]; // publicKey
            const did = formatDID('ethr', userAddress);
            
            // Get block timestamp
            let timestamp = 'Unknown';
            try {
              const block = await this.provider.getBlock(event.blockNumber);
              if (block) {
                timestamp = new Date(block.timestamp * 1000).toLocaleString();
              }
            } catch (blockError) {
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
          
        } catch (parseError) {
          console.warn('⚠️ Error parsing DID event:', parseError);
        }
      }
      
      // Sort by block number (newest first)
      registeredDIDs.sort((a, b) => b.blockNumber - a.blockNumber);
      
      console.log(`✅ Processed ${registeredDIDs.length} registered DIDs`);
      return registeredDIDs;
      
    } catch (error: any) {
      console.error('❌ Error fetching registered DIDs:', error);
      throw new Error(`Failed to fetch registered DIDs: ${error.message}`);
    }
  }

  /**
   * Gets recent blockchain transactions related to our contract
   * @param limit - Maximum number of transactions to return
   * @returns Array of transaction information
   */
  async getRecentTransactions(limit: number = 10): Promise<Array<{
    hash: string;
    from: string;
    to: string;
    blockNumber: number;
    gasUsed: string;
    timestamp: string;
    type: 'DID_REGISTRATION' | 'CONTRACT_CALL';
  }>> {
    try {
      console.log('🔍 Fetching recent transactions...');
      
      const transactions = [];
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000); // Last 1000 blocks
      
      // Get DID registration transactions
      const filter = this.didRegistryContract.filters.DIDRegistered();
      const events = await this.didRegistryContract.queryFilter(filter, fromBlock, currentBlock);
      
      for (const event of events.slice(0, limit)) {
        try {
          const tx = await this.provider.getTransaction(event.transactionHash);
          const receipt = await this.provider.getTransactionReceipt(event.transactionHash);
          
          if (!tx || !receipt) continue;
          
          let timestamp = 'Unknown';
          try {
            const block = await this.provider.getBlock(event.blockNumber);
            if (block) {
              timestamp = new Date(block.timestamp * 1000).toLocaleString();
            }
          } catch (blockError) {
            console.warn(`⚠️ Could not fetch block ${event.blockNumber}:`, blockError);
          }
          
          transactions.push({
            hash: event.transactionHash,
            from: tx.from,
            to: tx.to || this.didRegistryContract.target as string,
            blockNumber: event.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            timestamp: timestamp,
            type: 'DID_REGISTRATION' as const
          });
          
        } catch (txError) {
          console.warn('⚠️ Error fetching transaction details:', txError);
        }
      }
      
      // Sort by block number (newest first)
      transactions.sort((a, b) => b.blockNumber - a.blockNumber);
      
      console.log(`✅ Processed ${transactions.length} recent transactions`);
      return transactions;
      
    } catch (error: any) {
      console.error('❌ Error fetching recent transactions:', error);
      throw new Error(`Failed to fetch recent transactions: ${error.message}`);
    }
  }
}

// Create and export a blockchain service instance
const blockchainConfig = {
  rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/your-project-id',
  contractAddress: process.env.CONTRACT_ADDRESS || '0x80c410CFb20c85eFFeA6469Bb1e4703955cF4D48',
  gasStationPrivateKey: process.env.GAS_STATION_PRIVATE_KEY || '0x1234567890123456789012345678901234567890123456789012345678901234'
};

export const blockchainService = new BlockchainService(blockchainConfig);
