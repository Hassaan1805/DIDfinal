import { ethers } from "hardhat";
import hre from "hardhat";

async function main() {
  console.log("🚀 Starting DIDRegistry deployment...");
  console.log("🌐 Network:", hre.network.name);
  
  // Get the deployer account from Hardhat's signers
  const [deployer] = await ethers.getSigners();
  
  console.log("📋 Deploying contracts with account:", deployer.address);
  
  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  if (balance === 0n) {
    console.error("❌ Deployer account has no ETH! Please fund the account before deployment.");
    if (hre.network.name === "sepolia") {
      console.log("💡 Get Sepolia ETH from faucet: https://sepoliafaucet.com/");
    }
    process.exit(1);
  }

  // Deploy the DIDRegistry contract
  console.log("📄 Deploying DIDRegistry contract...");
  
  const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
  const didRegistry = await DIDRegistry.deploy();
  await didRegistry.waitForDeployment();
  const contractAddress = await didRegistry.getAddress();
  
  console.log("✅ DIDRegistry deployed successfully!");
  console.log("📍 Contract address:", contractAddress);
  console.log("🌐 Network:", hre.network.name);
  console.log("⛽ Transaction hash:", didRegistry.deploymentTransaction()?.hash);
  
  // Verify contract deployment by calling a simple function
  console.log("🔍 Verifying deployment...");
  try {
    // Try to call a view function to verify the contract is working
    const contractCode = await ethers.provider.getCode(contractAddress);
    if (contractCode === '0x') {
      throw new Error("Contract deployment failed - no code at address");
    }
    console.log("✅ Contract code verified at address");
  } catch (error) {
    console.error("❌ Contract verification failed:", error);
    process.exit(1);
  }
  console.log("✅ Verification complete!");
  
  // Save deployment info to a file
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress,
    deployerAddress: deployer.address,
    transactionHash: didRegistry.deploymentTransaction()?.hash,
    blockNumber: didRegistry.deploymentTransaction()?.blockNumber,
    timestamp: new Date().toISOString(),
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
Network: ${hre.network.name}
Contract Address: ${contractAddress}
Deployer: ${deployer.address}
Transaction: ${didRegistry.deploymentTransaction()?.hash}

📝 Environment Variables to Update:
DID_REGISTRY_ADDRESS=${contractAddress}

📁 Deployment info saved to: ${deploymentFile}
  `);
  
  // Return deployment info for use in other scripts
  return {
    didRegistry,
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
