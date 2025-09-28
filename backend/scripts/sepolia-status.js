const { ethers } = require('ethers');
require('dotenv').config();

async function checkSepoliaStatus() {
    console.log('🔍 Checking Sepolia Blockchain Status...');
    console.log('=' * 50);

    try {
        // Check environment variables
        console.log('📋 Environment Check:');
        const rpcUrl = process.env.SEPOLIA_RPC_URL;
        const privateKey = process.env.PLATFORM_PRIVATE_KEY;
        const contractAddress = process.env.SEPOLIA_CONTRACT_ADDRESS;
        
        console.log('   RPC URL:', rpcUrl ? '✅ Configured' : '❌ Missing');
        console.log('   Platform Key:', privateKey ? '✅ Configured' : '❌ Missing');
        console.log('   Contract:', contractAddress ? '✅ Deployed' : '⚠️  Not deployed yet');

        if (!rpcUrl || !privateKey) {
            console.error('\n❌ Missing required environment variables!');
            console.error('   Please check your .env file');
            return;
        }

        // Connect to Sepolia
        console.log('\n🌐 Network Connection:');
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        
        try {
            const network = await provider.getNetwork();
            console.log('   Network:', network.name);
            console.log('   Chain ID:', network.chainId.toString());
            console.log('   Status: ✅ Connected');
            
            if (network.chainId !== 11155111n) {
                console.warn('   ⚠️  Warning: Not Sepolia network!');
            }
        } catch (error) {
            console.error('   Status: ❌ Connection failed');
            console.error('   Error:', error.message);
            return;
        }

        // Check platform wallet
        console.log('\n💰 Platform Wallet:');
        const wallet = new ethers.Wallet(privateKey, provider);
        console.log('   Address:', wallet.address);
        
        try {
            const balance = await provider.getBalance(wallet.address);
            const balanceEth = ethers.formatEther(balance);
            console.log('   Balance:', balanceEth, 'ETH');
            
            if (parseFloat(balanceEth) < 0.001) {
                console.warn('   ⚠️  Low balance! Get ETH from: https://sepoliafaucet.com/');
            } else {
                console.log('   Status: ✅ Sufficient for deployment');
            }
        } catch (error) {
            console.error('   ❌ Failed to get balance:', error.message);
        }

        // Check current block
        console.log('\n📊 Network Status:');
        try {
            const blockNumber = await provider.getBlockNumber();
            const block = await provider.getBlock(blockNumber);
            const feeData = await provider.getFeeData();
            
            console.log('   Latest block:', blockNumber);
            console.log('   Block timestamp:', new Date(block.timestamp * 1000).toLocaleString());
            console.log('   Gas price:', ethers.formatUnits(feeData.gasPrice, 'gwei'), 'gwei');
            console.log('   Status: ✅ Network active');
        } catch (error) {
            console.error('   ❌ Failed to get network info:', error.message);
        }

        // Check contract deployment status
        if (contractAddress) {
            console.log('\n📜 Smart Contract:');
            try {
                const contractCode = await provider.getCode(contractAddress);
                if (contractCode !== '0x') {
                    console.log('   Address:', contractAddress);
                    console.log('   Status: ✅ Contract deployed');
                    console.log('   Etherscan:', `https://sepolia.etherscan.io/address/${contractAddress}`);
                    
                    // Try to interact with contract
                    const contractABI = [
                        "function getContractInfo() external pure returns (string memory, string memory, string memory)",
                        "function getContractStats() external view returns (uint256, uint256, uint256)"
                    ];
                    
                    const contract = new ethers.Contract(contractAddress, contractABI, provider);
                    
                    try {
                        const info = await contract.getContractInfo();
                        console.log('   Name:', info[0]);
                        console.log('   Version:', info[1]);
                        
                        const stats = await contract.getContractStats();
                        console.log('   Registrations:', stats[0].toString());
                        console.log('   Authentications:', stats[1].toString());
                        
                        console.log('   Contract: ✅ Functional');
                    } catch (error) {
                        console.warn('   ⚠️  Contract deployed but not responding');
                        console.warn('   Error:', error.message);
                    }
                } else {
                    console.error('   ❌ No contract found at address:', contractAddress);
                }
            } catch (error) {
                console.error('   ❌ Contract check failed:', error.message);
            }
        }

        console.log('\n🎯 Summary:');
        console.log('=' * 50);
        
        if (!contractAddress) {
            console.log('⚠️  Contract not deployed yet');
            console.log('\n📝 Next steps:');
            console.log('   1. Get Sepolia ETH: https://sepoliafaucet.com/');
            console.log('   2. Deploy contract: npm run blockchain:deploy');
            console.log('   3. Update SEPOLIA_CONTRACT_ADDRESS in .env');
        } else {
            console.log('✅ Blockchain integration ready!');
            console.log('\n🔗 Useful links:');
            console.log('   • Contract:', `https://sepolia.etherscan.io/address/${contractAddress}`);
            console.log('   • Wallet:', `https://sepolia.etherscan.io/address/${wallet.address}`);
        }

    } catch (error) {
        console.error('\n❌ Status check failed:');
        console.error('   Error:', error.message);
        console.error('\n💡 Common solutions:');
        console.error('   • Check internet connection');
        console.error('   • Verify .env configuration');
        console.error('   • Try alternative RPC URL');
    }
}

// Run status check
checkSepoliaStatus();