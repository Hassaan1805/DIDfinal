import { Router, Request, Response } from 'express';
import { blockchainService } from '../services/blockchainService';

const router = Router();

/**
 * GET /api/blockchain/status
 * Returns comprehensive blockchain data including DIDs, transactions, and network info
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    console.log('🔗 Blockchain status request received');

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
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch blockchain status',
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

    const networkInfo = await blockchainService.getNetworkInfo();
    
    res.json({
      success: true,
      data: networkInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Network info error:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch network info',
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
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch registered DIDs',
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
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transactions',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;