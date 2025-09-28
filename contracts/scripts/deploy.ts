import { ethers } from "hardhat";
import hre from "hardhat";

async function main() {
  console.log("🚀 Starting DID Authentication Registry deployment...");
  console.log("🌐 Network:", hre.network.name);
  
  // Get the deployer account from Hardhat's signers
  const [deployer] = await ethers.getSigners();
  
  console.log("📋 Deploying contracts with account:", deployer.address);
  
  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.utils.formatEther(balance), "ETH");

  if (balance.isZero()) {
    console.error("❌ Deployer account has no ETH! Please fund the account before deployment.");
    if (hre.network.name === "sepolia") {
      console.log("💡 Get Sepolia ETH from faucet: https://sepoliafaucet.com/");
    }
    process.exit(1);
  }

  // Deploy the SimpleDIDRegistry contract (for Sepolia blockchain authentication)
  console.log("📄 Deploying SimpleDIDRegistry contract...");
  
  const SimpleDIDRegistry = await ethers.getContractFactory("SimpleDIDRegistry");
  const simpleDIDRegistry = await SimpleDIDRegistry.deploy();
  
  // Wait for deployment (ethers v5 style)
  await simpleDIDRegistry.deployed();
  const contractAddress = simpleDIDRegistry.address;
  
  console.log("✅ SimpleDIDRegistry deployed successfully!");
  console.log("📍 Contract address:", contractAddress);
  console.log("🌐 Network:", hre.network.name);
  console.log("⛽ Transaction hash:", simpleDIDRegistry.deployTransaction?.hash);
  
  // Verify contract deployment by calling a contract function
  console.log("🔍 Verifying deployment...");
  try {
    // Try to call a view function to verify the contract is working
    const contractCode = await ethers.provider.getCode(contractAddress);
    if (contractCode === '0x') {
      throw new Error("Contract deployment failed - no code at address");
    }
    
    // Test contract functionality
    const stats = await simpleDIDRegistry.getContractStats();
    console.log("📊 Initial stats:", {
      registrations: stats[0].toString(),
      authentications: stats[1].toString(),
      blockNumber: stats[2].toString()
    });
    
    console.log("✅ Contract functionality verified!");
  } catch (error) {
    console.error("❌ Contract verification failed:", error);
    process.exit(1);
  }
  
  // Save deployment info to a file
  const deploymentInfo = {
    network: hre.network.name,
    contractName: "SimpleDIDRegistry",
    contractAddress,
    deployerAddress: deployer.address,
    transactionHash: simpleDIDRegistry.deployTransaction?.hash,
    blockNumber: simpleDIDRegistry.deployTransaction?.blockNumber,
    timestamp: new Date().toISOString(),
    etherscanUrl: hre.network.name === "sepolia" ? `https://sepolia.etherscan.io/address/${contractAddress}` : null,
  };
  
  const fs = require('fs');
  const path = require('path');
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }
  
  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`
📊 Deployment Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Network: ${hre.network.name}
Contract: SimpleDIDRegistry v1.0.0
Address: ${contractAddress}
Deployer: ${deployer.address}
Transaction: ${simpleDIDRegistry.deployTransaction?.hash}
Gas Used: ${simpleDIDRegistry.deployTransaction?.gasLimit}
${hre.network.name === "sepolia" ? `Etherscan: https://sepolia.etherscan.io/address/${contractAddress}` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Environment Variables to Update:
SEPOLIA_CONTRACT_ADDRESS=${contractAddress}

📁 Deployment info saved to: ${deploymentFile}
  `);
  
  // Return deployment info for use in other scripts
  return {
    simpleDIDRegistry,
    contractAddress,
    deployer
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});

export default main;
