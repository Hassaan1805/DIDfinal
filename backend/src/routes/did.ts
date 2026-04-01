import { Router, Request, Response } from 'express';
import { blockchainService } from '../services/blockchainService';
import { sepoliaService } from '../services/SepoliaService';
import { ethers } from 'ethers';
import { resolveDidDocument } from '../services/didResolver.service';

const router = Router();

/**
 * POST /api/did/create
 * Creates a new DID for a user using the gas station pattern
 */
router.post('/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const readiness = blockchainService.getReadinessStatus();
    if (!readiness.ready) {
      res.status(503).json({
        success: false,
        error: 'Legacy DID service is not configured for blockchain writes',
        data: {
          readiness,
          recommendedPath: '/api/auth/challenge + /api/auth/verify (Sepolia enterprise path)',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

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
    const readiness = blockchainService.getReadinessStatus();
    if (!readiness.ready) {
      res.status(503).json({
        success: false,
        error: 'Legacy DID lookup is unavailable because blockchain service is not configured',
        data: {
          readiness,
          sepoliaReady: sepoliaService.isReady(),
          recommendedPath: '/api/admin/employee/:employeeId for enterprise DID status',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

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
 * GET /api/did/resolve/:did
 * Resolves a did:ethr identifier to a W3C DID Document sourced from on-chain data.
 */
router.get('/resolve/:did', async (req: Request, res: Response): Promise<void> => {
  try {
    const decodedDid = decodeURIComponent(req.params.did);
    const didDocument = await resolveDidDocument(decodedDid);

    res.json({
      success: true,
      data: {
        did: decodedDid,
        didDocument,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error?.message || 'Failed to resolve DID document',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/did/status/unified
 * Gets unified blockchain status with actionable messages
 */
router.get('/status/unified', async (req: Request, res: Response) => {
  try {
    const legacyReadiness = blockchainService.getReadinessStatus();
    const sepoliaUnified = await sepoliaService.getUnifiedStatus();

    // Determine overall status
    let overallStatus: 'operational' | 'degraded' | 'unavailable';
    if (sepoliaUnified.sepolia.status === 'operational') {
      overallStatus = 'operational';
    } else if (sepoliaUnified.sepolia.status === 'degraded' || legacyReadiness.ready) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unavailable';
    }

    // Collect all actionable messages
    const allActionableMessages: string[] = [...sepoliaUnified.sepolia.actionableMessages];
    if (!legacyReadiness.ready) {
      legacyReadiness.reasons.forEach((reason) => {
        allActionableMessages.push(`Legacy: ${reason}`);
      });
    }

    res.json({
      success: true,
      data: {
        overallStatus,
        recommendedPath: sepoliaUnified.sepolia.status === 'operational'
          ? 'Use Sepolia endpoints (/api/auth/*, /api/admin/*)'
          : 'Configure Sepolia environment for full functionality',
        sepolia: sepoliaUnified.sepolia,
        legacy: {
          ready: legacyReadiness.ready,
          configured: legacyReadiness.configured,
          status: legacyReadiness.ready ? 'operational' : 'unavailable',
          issues: legacyReadiness.reasons,
          config: {
            rpcUrl: legacyReadiness.rpcUrl ? `${legacyReadiness.rpcUrl.substring(0, 30)}...` : 'not set',
            contractAddress: legacyReadiness.contractAddress || 'not set',
            gasStationAddress: legacyReadiness.gasStationAddress || 'not set',
          },
        },
        actionableMessages: allActionableMessages,
      },
      message: `Blockchain services: ${overallStatus}`,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ Unified status check failed:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get unified blockchain status',
      actionableMessage: 'Check server logs for details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/did/status/gas-station
 * Gets gas station status and balance
 */
router.get('/status/gas-station', async (req: Request, res: Response) => {
  try {
    const legacyReadiness = blockchainService.getReadinessStatus();
    const sepoliaUnified = await sepoliaService.getUnifiedStatus();

    const [legacyBalance, legacyNetworkInfo] = await Promise.all([
      legacyReadiness.ready
        ? blockchainService.getGasStationBalance().catch(() => 'unavailable')
        : Promise.resolve('unavailable'),
      legacyReadiness.ready
        ? blockchainService.getNetworkInfo().catch(() => null)
        : Promise.resolve(null),
    ]);

    res.json({
      success: true,
      data: {
        legacy: {
          readiness: legacyReadiness,
          gasStation: {
            balance: legacyBalance === 'unavailable' ? 'unavailable' : `${legacyBalance} ETH`,
            address: legacyReadiness.gasStationAddress,
          },
          network: legacyNetworkInfo,
          contract: {
            address: legacyReadiness.contractAddress,
          },
        },
        sepolia: sepoliaUnified.sepolia,
        recommendedAction: sepoliaUnified.recommendedAction,
      },
      message: sepoliaUnified.sepolia.status === 'operational'
        ? 'Sepolia blockchain is operational'
        : sepoliaUnified.sepolia.status === 'degraded'
          ? 'Sepolia blockchain has issues - see actionable messages'
          : 'Configure Sepolia environment variables for blockchain features',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Gas station status check failed:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get gas station status',
      actionableMessage: 'Check server logs and environment configuration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

export { router as didRoutes };
