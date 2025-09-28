const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting DID Authentication Registry deployment to Sepolia...");
    console.log("=" * 60);

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📋 Deployment Details:");
    console.log("   Deployer address:", deployer.address);

    // Check balance
    const balance = await deployer.provider.getBalance(deployer.address);
    const balanceInEth = ethers.formatEther(balance);
    console.log("   Account balance:", balanceInEth, "ETH");

    if (parseFloat(balanceInEth) < 0.001) {
        console.error("❌ Insufficient balance!");
        console.error("   Required: At least 0.001 ETH");
        console.error("   Get Sepolia ETH from: https://sepoliafaucet.com/");
        console.error("   Or: https://www.infura.io/faucet/sepolia");
        process.exit(1);
    }

    // Get network information
    const network = await deployer.provider.getNetwork();
    console.log("   Network:", network.name);
    console.log("   Chain ID:", network.chainId.toString());
    
    if (network.chainId !== 11155111n) {
        console.error("❌ Wrong network! Expected Sepolia (11155111), got:", network.chainId.toString());
        process.exit(1);
    }

    console.log("\n🔨 Deploying DID Authentication Registry...");

    // Deploy contract
    const DIDAuthRegistry = await ethers.getContractFactory("DIDAuthRegistry");
    
    // Estimate deployment gas
    const deploymentData = DIDAuthRegistry.interface.encodeDeploy([]);
    const gasEstimate = await deployer.estimateGas({ data: deploymentData });
    console.log("   Estimated gas:", gasEstimate.toString());

    // Deploy with gas estimation
    const contract = await DIDAuthRegistry.deploy({
        gasLimit: gasEstimate * 120n / 100n // 20% buffer
    });

    console.log("📝 Transaction submitted:", contract.deploymentTransaction()?.hash);
    console.log("⏳ Waiting for confirmation...");

    // Wait for deployment
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("\n✅ Deployment successful!");
    console.log("=" * 60);
    console.log("📍 Contract Address:", contractAddress);
    console.log("🔍 Etherscan URL:", `https://sepolia.etherscan.io/address/${contractAddress}`);
    
    // Get deployment receipt
    const receipt = await contract.deploymentTransaction()?.wait();
    if (receipt) {
        console.log("📊 Deployment Details:");
        console.log("   Block number:", receipt.blockNumber);
        console.log("   Gas used:", receipt.gasUsed.toString());
        console.log("   Transaction hash:", receipt.hash);
    }

    // Verify contract is working
    console.log("\n🧪 Testing contract deployment...");
    try {
        const contractInfo = await contract.getContractInfo();
        console.log("   Contract name:", contractInfo[0]);
        console.log("   Contract version:", contractInfo[1]);
        console.log("   Platform:", contractInfo[2]);
        
        const stats = await contract.getContractStats();
        console.log("   Initial registrations:", stats[0].toString());
        console.log("   Initial authentications:", stats[1].toString());
        
        console.log("✅ Contract verification successful!");
    } catch (error) {
        console.error("❌ Contract verification failed:", error.message);
    }

    // Save deployment information
    const deploymentInfo = {
        contractName: "DIDAuthRegistry",
        contractAddress: contractAddress,
        deployerAddress: deployer.address,
        network: "sepolia",
        chainId: network.chainId.toString(),
        deploymentTime: new Date().toISOString(),
        transactionHash: contract.deploymentTransaction()?.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
        etherscanUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
        deploymentCost: receipt ? ethers.formatEther(receipt.gasUsed * receipt.gasPrice) + " ETH" : "unknown"
    };

    // Save to file
    const deploymentPath = path.join(__dirname, '../deployments', 'sepolia-deployment.json');
    const deploymentDir = path.dirname(deploymentPath);
    
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }
    
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n💾 Deployment info saved to:", deploymentPath);

    console.log("\n🎯 Next Steps:");
    console.log("=" * 60);
    console.log("1. Add to your .env file:");
    console.log(`   SEPOLIA_CONTRACT_ADDRESS=${contractAddress}`);
    console.log("\n2. Update your backend configuration");
    console.log("\n3. Test the blockchain integration:");
    console.log("   npm run test-sepolia");
    console.log("\n4. View on Etherscan:");
    console.log(`   https://sepolia.etherscan.io/address/${contractAddress}`);

    return deploymentInfo;
}

// Handle both direct execution and module import
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("\n❌ Deployment failed:");
            console.error("=" * 60);
            console.error("Error:", error.message);
            
            if (error.code === 'INSUFFICIENT_FUNDS') {
                console.error("\n💡 Solution: Get more Sepolia ETH from faucet:");
                console.error("   • https://sepoliafaucet.com/");
                console.error("   • https://www.infura.io/faucet/sepolia");
            } else if (error.code === 'NETWORK_ERROR') {
                console.error("\n💡 Solution: Check network connection and RPC URL");
            }
            
            process.exit(1);
        });
}

module.exports = { main };