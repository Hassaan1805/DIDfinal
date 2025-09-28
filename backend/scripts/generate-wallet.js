const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating Platform Wallet for Sepolia Blockchain...');
console.log('=' * 60);

// Generate a new random wallet
const wallet = ethers.Wallet.createRandom();

console.log('✅ Platform Wallet Generated Successfully!');
console.log('\n📋 Wallet Details:');
console.log('   Address:', wallet.address);
console.log('   Private Key:', wallet.privateKey);
console.log('   Mnemonic:', wallet.mnemonic?.phrase || 'N/A');

console.log('\n⚠️  SECURITY WARNING:');
console.log('   • Save these details securely');
console.log('   • Never share your private key');
console.log('   • This wallet will be used for contract deployment');

console.log('\n💰 Getting Testnet ETH:');
console.log('   1. Visit: https://sepoliafaucet.com/');
console.log('   2. Enter address:', wallet.address);
console.log('   3. Request 0.5 ETH (enough for multiple deployments)');
console.log('   4. Wait for confirmation (~30 seconds)');

console.log('\n🔧 Environment Configuration:');
console.log('   Add these to your backend/.env file:');
console.log('   PLATFORM_PRIVATE_KEY=' + wallet.privateKey);
console.log('   PLATFORM_ADDRESS=' + wallet.address);
console.log('   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');

// Save wallet info to file (for reference, not for production use)
const walletInfo = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase,
    generatedAt: new Date().toISOString(),
    purpose: 'Platform wallet for Decentralized Trust Platform - Sepolia testnet',
    warning: 'This is for development/testing only. Never use in production!'
};

const walletPath = path.join(__dirname, 'generated-wallet.json');
fs.writeFileSync(walletPath, JSON.stringify(walletInfo, null, 2));
console.log('\n💾 Wallet info saved to:', walletPath);
console.log('   (For reference only - keep this file secure!)');

console.log('\n📱 Mobile Wallet Integration:');
console.log('   • Your employees will use their own wallets');
console.log('   • This platform wallet pays for blockchain transactions');
console.log('   • Employee wallets sign authentication challenges');

console.log('\n🎯 Next Steps:');
console.log('   1. Get testnet ETH from faucet');
console.log('   2. Update your .env file with the keys above');
console.log('   3. Run: npm run blockchain:deploy');
console.log('   4. Test with: npm run sepolia:status');

console.log('\n🔗 Useful Links:');
console.log('   • Sepolia Faucet: https://sepoliafaucet.com/');
console.log('   • Infura Faucet: https://www.infura.io/faucet/sepolia');
console.log('   • Sepolia Explorer: https://sepolia.etherscan.io/');
console.log('   • Check balance: https://sepolia.etherscan.io/address/' + wallet.address);

console.log('\n✨ Ready for blockchain integration!');