"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ethers_1 = require("ethers");
const router = (0, express_1.Router)();
router.get('/dashboard', async (req, res) => {
    try {
        if (!process.env.SEPOLIA_RPC_URL || !process.env.SEPOLIA_CONTRACT_ADDRESS) {
            res.status(503).json({
                success: false,
                error: 'Sepolia service not configured',
                setup: {
                    required: [
                        'SEPOLIA_RPC_URL',
                        'SEPOLIA_CONTRACT_ADDRESS',
                        'PLATFORM_PRIVATE_KEY'
                    ],
                    faucets: [
                        'https://sepoliafaucet.com/',
                        'https://www.infura.io/faucet/sepolia'
                    ]
                }
            });
            return;
        }
        const provider = new ethers_1.ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        const latestBlock = await provider.getBlockNumber();
        const platformBalance = await provider.getBalance(process.env.PLATFORM_ADDRESS);
        const recentTransactions = await provider.getLogs({
            address: process.env.SEPOLIA_CONTRACT_ADDRESS,
            fromBlock: Math.max(0, latestBlock - 1000),
            toBlock: 'latest'
        });
        const dashboard = {
            success: true,
            timestamp: new Date().toISOString(),
            network: {
                name: 'Sepolia Testnet',
                chainId: 11155111,
                currentBlock: latestBlock,
                platformBalance: ethers_1.ethers.formatEther(platformBalance) + ' ETH',
                explorer: 'https://sepolia.etherscan.io'
            },
            contract: {
                address: process.env.SEPOLIA_CONTRACT_ADDRESS,
                deployerAddress: process.env.PLATFORM_ADDRESS,
                totalTransactions: recentTransactions.length,
                recentActivityBlocks: 1000
            },
            recentActivity: {
                totalEvents: recentTransactions.length,
                transactions: recentTransactions.slice(0, 10).map(tx => ({
                    transactionHash: tx.transactionHash,
                    blockNumber: tx.blockNumber,
                    etherscanUrl: `https://sepolia.etherscan.io/tx/${tx.transactionHash}`
                })),
                blockRange: {
                    from: Math.max(0, latestBlock - 1000),
                    to: latestBlock
                }
            },
            links: {
                contractOverview: `https://sepolia.etherscan.io/address/${process.env.SEPOLIA_CONTRACT_ADDRESS}`,
                contractTransactions: `https://sepolia.etherscan.io/address/${process.env.SEPOLIA_CONTRACT_ADDRESS}#transactions`,
                contractEvents: `https://sepolia.etherscan.io/address/${process.env.SEPOLIA_CONTRACT_ADDRESS}#events`,
                platformWallet: `https://sepolia.etherscan.io/address/${process.env.PLATFORM_ADDRESS}`
            },
            quickActions: [
                {
                    name: 'View Contract on Etherscan',
                    url: `https://sepolia.etherscan.io/address/${process.env.SEPOLIA_CONTRACT_ADDRESS}`
                },
                {
                    name: 'Check Platform Wallet Balance',
                    url: `https://sepolia.etherscan.io/address/${process.env.PLATFORM_ADDRESS}`
                },
                {
                    name: 'Get Testnet ETH',
                    url: 'https://sepoliafaucet.com/'
                }
            ]
        };
        res.json(dashboard);
    }
    catch (error) {
        console.error('❌ Dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load monitoring dashboard',
            details: error.message
        });
    }
});
router.get('/transaction/:txHash', async (req, res) => {
    try {
        const { txHash } = req.params;
        const provider = new ethers_1.ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        const [transaction, receipt] = await Promise.all([
            provider.getTransaction(txHash),
            provider.getTransactionReceipt(txHash)
        ]);
        if (!transaction) {
            res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
            return;
        }
        const block = await provider.getBlock(transaction.blockNumber);
        res.json({
            success: true,
            transaction: {
                hash: transaction.hash,
                from: transaction.from,
                to: transaction.to,
                value: ethers_1.ethers.formatEther(transaction.value),
                gasPrice: ethers_1.ethers.formatUnits(transaction.gasPrice, 'gwei') + ' gwei',
                gasLimit: transaction.gasLimit.toString(),
                gasUsed: receipt?.gasUsed.toString(),
                status: receipt?.status === 1 ? 'Success' : 'Failed',
                blockNumber: transaction.blockNumber,
                timestamp: new Date(block.timestamp * 1000).toISOString(),
                etherscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get transaction details',
            details: error.message
        });
    }
});
router.post('/test-transaction', async (req, res) => {
    try {
        if (!process.env.SEPOLIA_RPC_URL || !process.env.PLATFORM_PRIVATE_KEY) {
            res.status(503).json({
                success: false,
                error: 'Blockchain service not configured'
            });
            return;
        }
        const provider = new ethers_1.ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        const wallet = new ethers_1.ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY, provider);
        const balance = await provider.getBalance(wallet.address);
        if (balance === 0n) {
            res.status(400).json({
                success: false,
                error: 'Insufficient balance for test transaction',
                address: wallet.address,
                faucetUrl: 'https://sepoliafaucet.com/'
            });
            return;
        }
        const tx = await wallet.sendTransaction({
            to: wallet.address,
            value: ethers_1.ethers.parseEther('0.001'),
            gasLimit: 21000,
        });
        console.log('🧪 Test transaction sent:', tx.hash);
        const receipt = await tx.wait();
        res.json({
            success: true,
            message: 'Test transaction successful',
            transaction: {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: ethers_1.ethers.formatEther(tx.value),
                blockNumber: receipt?.blockNumber,
                status: receipt?.status === 1 ? 'Success' : 'Failed',
                etherscanUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`
            }
        });
    }
    catch (error) {
        console.error('❌ Test transaction failed:', error);
        res.status(500).json({
            success: false,
            error: 'Test transaction failed',
            details: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=monitoring.js.map