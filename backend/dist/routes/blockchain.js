"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const blockchainService_1 = require("../services/blockchainService");
const SepoliaService_1 = require("../services/SepoliaService");
const router = (0, express_1.Router)();
router.get('/status', async (req, res) => {
    try {
        console.log('🔗 Blockchain status request received');
        const legacyReadiness = blockchainService_1.blockchainService.getReadinessStatus();
        const sepoliaUnified = await SepoliaService_1.sepoliaService.getUnifiedStatus();
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
                    ...legacyReadiness.reasons.map((r) => `Legacy: ${r}`),
                ],
                timestamp: new Date().toISOString(),
            });
            return;
        }
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
        const sepoliaStatus = await SepoliaService_1.sepoliaService.getUnifiedStatus();
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
    }
    catch (error) {
        console.error('❌ Blockchain status error:', error);
        const legacyReadiness = blockchainService_1.blockchainService.getReadinessStatus();
        res.json({
            success: true,
            data: {
                readiness: {
                    legacy: legacyReadiness,
                    sepoliaReady: SepoliaService_1.sepoliaService.isReady(),
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
router.get('/network', async (req, res) => {
    try {
        console.log('📡 Network info request received');
        const legacyReadiness = blockchainService_1.blockchainService.getReadinessStatus();
        const sepoliaReady = SepoliaService_1.sepoliaService.isReady();
        if (!legacyReadiness.ready) {
            const sepoliaStatus = sepoliaReady
                ? await SepoliaService_1.sepoliaService.getNetworkStatus().catch((error) => ({
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
        const networkInfo = await blockchainService_1.blockchainService.getNetworkInfo();
        res.json({
            success: true,
            data: networkInfo,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Network info error:', error);
        const legacyReadiness = blockchainService_1.blockchainService.getReadinessStatus();
        res.json({
            success: true,
            data: {
                readiness: {
                    legacy: legacyReadiness,
                    sepoliaReady: SepoliaService_1.sepoliaService.isReady(),
                },
            },
            message: `Network info unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/dids', async (req, res) => {
    try {
        console.log('👥 Registered DIDs request received');
        const legacyReadiness = blockchainService_1.blockchainService.getReadinessStatus();
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
        res.json({
            success: true,
            data: {
                dids: [],
                count: 0,
                readiness: blockchainService_1.blockchainService.getReadinessStatus(),
            },
            message: `Registered DID list unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/transactions', async (req, res) => {
    try {
        console.log('📋 Transactions request received');
        const legacyReadiness = blockchainService_1.blockchainService.getReadinessStatus();
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
        res.json({
            success: true,
            data: {
                transactions: [],
                count: 0,
                readiness: blockchainService_1.blockchainService.getReadinessStatus(),
            },
            message: `Transaction list unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
            timestamp: new Date().toISOString()
        });
    }
});
exports.default = router;
//# sourceMappingURL=blockchain.js.map