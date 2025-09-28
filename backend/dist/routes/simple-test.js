"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ethers_1 = require("ethers");
const router = (0, express_1.Router)();
router.get('/blockchain-status', async (req, res) => {
    try {
        console.log('🧪 Testing basic blockchain connectivity...');
        const provider = new ethers_1.ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        const latestBlock = await provider.getBlockNumber();
        const balance = await provider.getBalance(process.env.PLATFORM_ADDRESS);
        res.json({
            success: true,
            message: 'Blockchain connectivity successful',
            network: {
                name: 'Sepolia Testnet',
                currentBlock: latestBlock,
                platformAddress: process.env.PLATFORM_ADDRESS,
                platformBalance: ethers_1.ethers.formatEther(balance) + ' ETH'
            },
            links: {
                platformWallet: `https://sepolia.etherscan.io/address/${process.env.PLATFORM_ADDRESS}`,
                faucet: 'https://sepoliafaucet.com/'
            }
        });
    }
    catch (error) {
        console.error('❌ Blockchain connectivity test failed:', error);
        res.status(500).json({
            success: false,
            error: 'Blockchain connectivity failed',
            details: error.message
        });
    }
});
router.post('/create-transaction', async (req, res) => {
    try {
        console.log('🧪 Creating test transaction...');
        const provider = new ethers_1.ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        const wallet = new ethers_1.ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY, provider);
        const balance = await provider.getBalance(wallet.address);
        console.log('💰 Current balance:', ethers_1.ethers.formatEther(balance), 'ETH');
        if (balance === 0n) {
            res.status(400).json({
                success: false,
                error: 'Insufficient balance. Please fund the platform wallet.',
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
        console.log('📤 Transaction sent:', tx.hash);
        console.log('⏳ Waiting for confirmation...');
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed in block:', receipt?.blockNumber);
        res.json({
            success: true,
            message: 'Test transaction successful! 🎉',
            transaction: {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: ethers_1.ethers.formatEther(tx.value) + ' ETH',
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
//# sourceMappingURL=simple-test.js.map