import { Router, Request, Response } from 'express';
import { BlockchainService } from '../services/blockchainService';
import { ethers } from 'ethers';

const router = Router();

// Initialize blockchain service
const blockchainService = new BlockchainService({
  rpcUrl: process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
  contractAddress: process.env.DID_REGISTRY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  gasStationPrivateKey: process.env.GAS_STATION_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
});

/**
 * POST /api/did/create
 * Creates a new DID for a user using the gas station pattern
 */
router.post('/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const { publicKey, userAddress } = req.body;

    // Validate required fields
    if (!publicKey) {
      res.status(400).json({
        success: false,
        error: 'Public key is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!userAddress) {
      res.status(400).json({
        success: false,
        error: 'User address is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validate public key format (should be 68 chars total: 0x + 66 hex chars = 33 bytes)
    if (!publicKey.startsWith('0x') || publicKey.length !== 68) {
      res.status(400).json({
        success: false,
        error: 'Public key must be a valid compressed public key (68 characters starting with 0x)',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validate Ethereum address format
    if (!ethers.isAddress(userAddress)) {
      res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format',
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log(`🔍 Creating DID for address: ${userAddress}`);
    console.log(`🔑 Public key: ${publicKey.substring(0, 10)}...`);

    // Check if DID already exists
    const existingDID = await blockchainService.isDIDRegistered(userAddress);
    if (existingDID) {
      res.status(409).json({
        success: false,
        error: 'DID already exists for this address',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Register DID on blockchain
    const result = await blockchainService.registerDID(userAddress, publicKey);

    console.log(`✅ DID created successfully: ${result.did}`);

    // Return success response
    res.status(201).json({
      success: true,
      data: {
        did: result.did,
        userAddress: userAddress,
        publicKey: publicKey,
        transaction: {
          hash: result.txHash,
          blockNumber: result.blockNumber,
          gasUsed: result.gasUsed
        }
      },
      message: 'DID created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ DID creation failed:', error);

    // Handle different types of errors
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error.message.includes('already registered')) {
      statusCode = 409;
      errorMessage = 'DID already exists for this address';
    } else if (error.message.includes('Invalid')) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message.includes('Insufficient funds')) {
      statusCode = 503;
      errorMessage = 'Service temporarily unavailable - insufficient gas funds';
    } else if (error.message.includes('network')) {
      statusCode = 503;
      errorMessage = 'Blockchain network connection error';
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/did/:address
 * Gets DID information for a given address
 */
router.get('/:address', async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!ethers.isAddress(address)) {
      res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if DID exists
    const isRegistered = await blockchainService.isDIDRegistered(address);
    if (!isRegistered) {
      res.status(404).json({
        success: false,
        error: 'DID not found for this address',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Get DID document
    const didDocument = await blockchainService.getDIDDocument(address);
    const did = `did:ethr:${address.toLowerCase()}`;

    res.json({
      success: true,
      data: {
        did,
        address,
        didDocument: JSON.parse(didDocument),
        registered: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ DID lookup failed:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve DID information',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/did/status/gas-station
 * Gets gas station status and balance
 */
router.get('/status/gas-station', async (req: Request, res: Response) => {
  try {
    const balance = await blockchainService.getGasStationBalance();
    const networkInfo = await blockchainService.getNetworkInfo();

    res.json({
      success: true,
      data: {
        gasStation: {
          balance: `${balance} ETH`,
          address: process.env.GAS_STATION_ADDRESS || 'Not configured'
        },
        network: networkInfo,
        contract: {
          address: process.env.DID_REGISTRY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Gas station status check failed:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get gas station status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

export { router as didRoutes };
