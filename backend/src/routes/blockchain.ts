import { Router, Request, Response } from 'express';
import { blockchainService } from '../services/blockchainService';
import { sepoliaService } from '../services/SepoliaService';

const router = Router();

/**
 * GET /api/blockchain/status
 * Returns comprehensive blockchain data including DIDs, transactions, and network info
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    console.log('🔗 Blockchain status request received');
    const legacyReadiness = blockchainService.getReadinessStatus();
    const sepoliaUnified = await sepoliaService.getUnifiedStatus();

    if (!legacyReadiness.ready) {
      res.json({
        success: true,
        data: {
          readiness: {
            legacy: legacyReadiness,
            sepolia: sepoliaUnified.sepolia,
          },
          overallStatus: sepoliaUnified.sepolia.status,
          recommendedAction: sepoliaUnified.recommendedAction,
          registeredDIDs: [],
          recentTransactions: [],
          stats: {
            totalDIDs: 0,
            totalTransactions: 0,
            lastActivity: 'No recent activity',
          },
        },
        message: sepoliaUnified.sepolia.status === 'operational'
          ? 'Legacy blockchain viewer is not configured; Sepolia is operational'
          : sepoliaUnified.sepolia.status === 'degraded'
            ? 'Both legacy and Sepolia have issues - see actionable messages'
            : 'Blockchain services require configuration - see actionable messages',
        actionableMessages: [
          ...sepoliaUnified.sepolia.actionableMessages,
          ...legacyReadiness.reasons.map((r: string) => `Legacy: ${r}`),
        ],
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Get network information
    const networkInfo = await blockchainService.getNetworkInfo();
    console.log('📡 Network info:', networkInfo);

    // Get contract info
    const contractInfo = blockchainService.getContractInfo();
    console.log('📄 Contract info:', contractInfo);

    // Get gas station balance
    const gasStationBalance = await blockchainService.getGasStationBalance();
    console.log('⛽ Gas station balance:', gasStationBalance);

    // Get registered DIDs (simplified for now)
    const registeredDIDs = await blockchainService.getAllRegisteredDIDs();
    console.log('👥 Registered DIDs count:', registeredDIDs.length);

    // Get recent transactions
    const recentTransactions = await blockchainService.getRecentTransactions();
    console.log('📋 Recent transactions count:', recentTransactions.length);

    // Get Sepolia status
    const sepoliaStatus = await sepoliaService.getUnifiedStatus();

    // Calculate stats
    const stats = {
      totalDIDs: registeredDIDs.length,
      totalTransactions: recentTransactions.length,
      lastActivity: recentTransactions.length > 0 
        ? recentTransactions[0].timestamp 
        : 'No recent activity'
    };

    const responseData = {
      contractAddress: contractInfo.address,
      readiness: {
        legacy: legacyReadiness,
        sepolia: sepoliaStatus.sepolia,
      },
      networkInfo: {
        name: networkInfo.name,
        chainId: networkInfo.chainId,
        blockNumber: networkInfo.blockNumber
      },
      gasStationBalance: gasStationBalance,
      registeredDIDs: registeredDIDs,
      recentTransactions: recentTransactions,
      stats: stats
    };

    console.log('✅ Blockchain status response prepared');

    res.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Blockchain status error:', error);

    const legacyReadiness = blockchainService.getReadinessStatus();
    res.json({
      success: true,
      data: {
        readiness: {
          legacy: legacyReadiness,
          sepoliaReady: sepoliaService.isReady(),
        },
        registeredDIDs: [],
        recentTransactions: [],
        stats: {
          totalDIDs: 0,
          totalTransactions: 0,
          lastActivity: 'Unavailable',
        },
      },
      message: `Blockchain status unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/blockchain/network
 * Returns basic network information
 */
router.get('/network', async (req: Request, res: Response) => {
  try {
    console.log('📡 Network info request received');
    const legacyReadiness = blockchainService.getReadinessStatus();
    const sepoliaReady = sepoliaService.isReady();

    if (!legacyReadiness.ready) {
      const sepoliaStatus = sepoliaReady
        ? await sepoliaService.getNetworkStatus().catch((error: any) => ({
            success: false,
            error: error?.message || 'Failed to query Sepolia status',
          }))
        : { success: false, error: 'Sepolia service not configured' };

      res.json({
        success: true,
        data: {
          readiness: {
            legacy: legacyReadiness,
            sepoliaReady,
          },
          sepolia: sepoliaStatus,
        },
        message: 'Legacy blockchain network info unavailable; readiness data returned',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const networkInfo = await blockchainService.getNetworkInfo();
    
    res.json({
      success: true,
      data: networkInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Network info error:', error);

    const legacyReadiness = blockchainService.getReadinessStatus();
    res.json({
      success: true,
      data: {
        readiness: {
          legacy: legacyReadiness,
          sepoliaReady: sepoliaService.isReady(),
        },
      },
      message: `Network info unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/blockchain/dids
 * Returns all registered DIDs
 */
router.get('/dids', async (req: Request, res: Response) => {
  try {
    console.log('👥 Registered DIDs request received');
    const legacyReadiness = blockchainService.getReadinessStatus();

    if (!legacyReadiness.ready) {
      res.json({
        success: true,
        data: {
          dids: [],
          count: 0,
          readiness: legacyReadiness,
        },
        message: 'Legacy DID registry viewer is not configured',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const registeredDIDs = await blockchainService.getAllRegisteredDIDs();
    
    res.json({
      success: true,
      data: {
        dids: registeredDIDs,
        count: registeredDIDs.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ DIDs fetch error:', error);

    res.json({
      success: true,
      data: {
        dids: [],
        count: 0,
        readiness: blockchainService.getReadinessStatus(),
      },
      message: `Registered DID list unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/blockchain/transactions
 * Returns recent blockchain transactions
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    console.log('📋 Transactions request received');
    const legacyReadiness = blockchainService.getReadinessStatus();

    if (!legacyReadiness.ready) {
      res.json({
        success: true,
        data: {
          transactions: [],
          count: 0,
          readiness: legacyReadiness,
        },
        message: 'Legacy transaction viewer is not configured',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const transactions = await blockchainService.getRecentTransactions(limit);
    
    res.json({
      success: true,
      data: {
        transactions: transactions,
        count: transactions.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Transactions fetch error:', error);

    res.json({
      success: true,
      data: {
        transactions: [],
        count: 0,
        readiness: blockchainService.getReadinessStatus(),
      },
      message: `Transaction list unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;