import { ethers } from "ethers";
import hre from "hardhat";

async function main() {
  console.log("🚀 Starting DIDRegistry deployment...");
  
  // Get the deployer account using hardhat's network provider
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const deployer = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
  
  console.log("📋 Deploying contracts with account:", deployer.address);
  
  // Get account balance
  const balance = await provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy the DIDRegistry contract
  console.log("📄 Deploying DIDRegistry contract...");
  
  // Read the compiled contract
  const contractArtifact = await hre.artifacts.readArtifact("DIDRegistry");
  const contractFactory = new ethers.ContractFactory(
    contractArtifact.abi,
    contractArtifact.bytecode,
    deployer
  );
  
  const didRegistry = await contractFactory.deploy();
  await didRegistry.waitForDeployment();
  const contractAddress = await didRegistry.getAddress();
  
  console.log("✅ DIDRegistry deployed successfully!");
  console.log("📍 Contract address:", contractAddress);
  
  // Verify contract deployment by calling a read function
  console.log("🔍 Verifying deployment...");
  const didRegistryWithTypes = didRegistry as any; // Type assertion for deployed contract
  const owner = await didRegistryWithTypes.owner();
  console.log("👤 Contract owner:", owner);
  console.log("✅ Verification complete!");
  
  console.log(`
📊 Add this to your .env file:
DID_REGISTRY_ADDRESS=${contractAddress}
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
