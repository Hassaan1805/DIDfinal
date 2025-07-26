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
}
