"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.didRoutes = void 0;
const express_1 = require("express");
const blockchainService_1 = require("../services/blockchainService");
const SepoliaService_1 = require("../services/SepoliaService");
const ethers_1 = require("ethers");
const didResolver_service_1 = require("../services/didResolver.service");
const router = (0, express_1.Router)();
exports.didRoutes = router;
router.post('/create', async (req, res) => {
    try {
        const readiness = blockchainService_1.blockchainService.getReadinessStatus();
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
        if (!publicKey.startsWith('0x') || publicKey.length !== 68) {
            res.status(400).json({
                success: false,
                error: 'Public key must be a valid compressed public key (68 characters starting with 0x)',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (!ethers_1.ethers.isAddress(userAddress)) {
            res.status(400).json({
                success: false,
                error: 'Invalid Ethereum address format',
                timestamp: new Date().toISOString()
            });
            return;
        }
        console.log(`🔍 Creating DID for address: ${userAddress}`);
        console.log(`🔑 Public key: ${publicKey.substring(0, 10)}...`);
        const existingDID = await blockchainService_1.blockchainService.isDIDRegistered(userAddress);
        if (existingDID) {
            res.status(409).json({
                success: false,
                error: 'DID already exists for this address',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const result = await blockchainService_1.blockchainService.registerDID(userAddress, publicKey);
        console.log(`✅ DID created successfully: ${result.did}`);
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
    }
    catch (error) {
        console.error('❌ DID creation failed:', error);
        let statusCode = 500;
        let errorMessage = 'Internal server error';
        if (error.message.includes('already registered')) {
            statusCode = 409;
            errorMessage = 'DID already exists for this address';
        }
        else if (error.message.includes('Invalid')) {
            statusCode = 400;
            errorMessage = error.message;
        }
        else if (error.message.includes('Insufficient funds')) {
            statusCode = 503;
            errorMessage = 'Service temporarily unavailable - insufficient gas funds';
        }
        else if (error.message.includes('network')) {
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
router.get('/:address', async (req, res) => {
    try {
        const readiness = blockchainService_1.blockchainService.getReadinessStatus();
        if (!readiness.ready) {
            res.status(503).json({
                success: false,
                error: 'Legacy DID lookup is unavailable because blockchain service is not configured',
                data: {
                    readiness,
                    sepoliaReady: SepoliaService_1.sepoliaService.isReady(),
                    recommendedPath: '/api/admin/employee/:employeeId for enterprise DID status',
                },
                timestamp: new Date().toISOString(),
            });
            return;
        }
        const { address } = req.params;
        if (!ethers_1.ethers.isAddress(address)) {
            res.status(400).json({
                success: false,
                error: 'Invalid Ethereum address format',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const isRegistered = await blockchainService_1.blockchainService.isDIDRegistered(address);
        if (!isRegistered) {
            res.status(404).json({
                success: false,
                error: 'DID not found for this address',
                timestamp: new Date().toISOString()
            });
            return;
        }
        const didDocument = await blockchainService_1.blockchainService.getDIDDocument(address);
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
    }
    catch (error) {
        console.error('❌ DID lookup failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve DID information',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/resolve/:did', async (req, res) => {
    try {
        const decodedDid = decodeURIComponent(req.params.did);
        const didDocument = await (0, didResolver_service_1.resolveDidDocument)(decodedDid);
        res.json({
            success: true,
            data: {
                did: decodedDid,
                didDocument,
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            error: error?.message || 'Failed to resolve DID document',
            timestamp: new Date().toISOString(),
        });
    }
});
router.get('/status/unified', async (req, res) => {
    try {
        const legacyReadiness = blockchainService_1.blockchainService.getReadinessStatus();
        const sepoliaUnified = await SepoliaService_1.sepoliaService.getUnifiedStatus();
        let overallStatus;
        if (sepoliaUnified.sepolia.status === 'operational') {
            overallStatus = 'operational';
        }
        else if (sepoliaUnified.sepolia.status === 'degraded' || legacyReadiness.ready) {
            overallStatus = 'degraded';
        }
        else {
            overallStatus = 'unavailable';
        }
        const allActionableMessages = [...sepoliaUnified.sepolia.actionableMessages];
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
    }
    catch (error) {
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
router.get('/status/gas-station', async (req, res) => {
    try {
        const legacyReadiness = blockchainService_1.blockchainService.getReadinessStatus();
        const sepoliaUnified = await SepoliaService_1.sepoliaService.getUnifiedStatus();
        const [legacyBalance, legacyNetworkInfo] = await Promise.all([
            legacyReadiness.ready
                ? blockchainService_1.blockchainService.getGasStationBalance().catch(() => 'unavailable')
                : Promise.resolve('unavailable'),
            legacyReadiness.ready
                ? blockchainService_1.blockchainService.getNetworkInfo().catch(() => null)
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
    }
    catch (error) {
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
//# sourceMappingURL=did.js.map