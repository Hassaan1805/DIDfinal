import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

const router = Router();

/**
 * GET /api/simple-test/blockchain-status
 * Simple blockchain connectivity test
 */
router.get('/blockchain-status', async (req: Request, res: Response) => {
    try {
        console.log('🧪 Testing basic blockchain connectivity...');
        
        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        const latestBlock = await provider.getBlockNumber();
        const balance = await provider.getBalance(process.env.PLATFORM_ADDRESS!);
        
        res.json({
            success: true,
            message: 'Blockchain connectivity successful',
            network: {
                name: 'Sepolia Testnet',
                currentBlock: latestBlock,
                platformAddress: process.env.PLATFORM_ADDRESS,
                platformBalance: ethers.formatEther(balance) + ' ETH'
            },
            links: {
                platformWallet: `https://sepolia.etherscan.io/address/${process.env.PLATFORM_ADDRESS}`,
                faucet: 'https://sepoliafaucet.com/'
            }
        });
        
    } catch (error: any) {
        console.error('❌ Blockchain connectivity test failed:', error);
        res.status(500).json({
            success: false,
            error: 'Blockchain connectivity failed',
            details: error.message
        });
    }
});

/**
 * POST /api/simple-test/create-transaction
 * Create a simple test transaction
 */
router.post('/create-transaction', async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('🧪 Creating test transaction...');
        
        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL!);
        const wallet = new ethers.Wallet(process.env.PLATFORM_PRIVATE_KEY!, provider);
        
        // Check balance
        const balance = await provider.getBalance(wallet.address);
        console.log('💰 Current balance:', ethers.formatEther(balance), 'ETH');
        
        if (balance === 0n) {
            res.status(400).json({
                success: false,
                error: 'Insufficient balance. Please fund the platform wallet.',
                address: wallet.address,
                faucetUrl: 'https://sepoliafaucet.com/'
            });
            return;
        }
        
        // Create a simple transaction (send to self to minimize cost)
        const tx = await wallet.sendTransaction({
            to: wallet.address,
            value: ethers.parseEther('0.001'), // Very small amount
            gasLimit: 21000,
        });
        
        console.log('📤 Transaction sent:', tx.hash);
        
        // Wait for confirmation
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
                value: ethers.formatEther(tx.value) + ' ETH',
                blockNumber: receipt?.blockNumber,
                status: receipt?.status === 1 ? 'Success' : 'Failed',
                etherscanUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`
            }
        });
        
    } catch (error: any) {
        console.error('❌ Test transaction failed:', error);
        res.status(500).json({
            success: false,
            error: 'Test transaction failed',
            details: error.message
        });
    }
});

export default router;