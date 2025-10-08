"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const blockchainService_1 = require("../services/blockchainService");
const router = (0, express_1.Router)();
router.get('/status', async (req, res) => {
    try {
        console.log('🔗 Blockchain status request received');
        const networkInfo = await blockchainService_1.blockchainService.getNetworkInfo();
        console.log('📡 Network info:', networkInfo);
        const contractInfo = blockchainService_1.blockchainService.getContractInfo();
        console.log('📄 Contract info:', contractInfo);
        const gasStationBalance = await blockchainService_1.blockchainService.getGasStationBalance();
        console.log('⛽ Gas station balance:', gasStationBalance);
        const registeredDIDs = await blockchainService_1.blockchainService.getAllRegisteredDIDs();
        console.log('👥 Registered DIDs count:', registeredDIDs.length);
        const recentTransactions = await blockchainService_1.blockchainService.getRecentTransactions();
        console.log('📋 Recent transactions count:', recentTransactions.length);
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
    }
    catch (error) {
        console.error('❌ Blockchain status error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch blockchain status',
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/network', async (req, res) => {
    try {
        console.log('📡 Network info request received');
        const networkInfo = await blockchainService_1.blockchainService.getNetworkInfo();
        res.json({
            success: true,
            data: networkInfo,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Network info error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch network info',
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/dids', async (req, res) => {
    try {
        console.log('👥 Registered DIDs request received');
        const registeredDIDs = await blockchainService_1.blockchainService.getAllRegisteredDIDs();
        res.json({
            success: true,
            data: {
                dids: registeredDIDs,
                count: registeredDIDs.length
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ DIDs fetch error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch registered DIDs',
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/transactions', async (req, res) => {
    try {
        console.log('📋 Transactions request received');
        const limit = parseInt(req.query.limit) || 10;
        const transactions = await blockchainService_1.blockchainService.getRecentTransactions(limit);
        res.json({
            success: true,
            data: {
                transactions: transactions,
                count: transactions.length
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Transactions fetch error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch transactions',
            timestamp: new Date().toISOString()
        });
    }
});
exports.default = router;
//# sourceMappingURL=blockchain.js.map