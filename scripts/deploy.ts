import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Comprehensive Deployment Script for Mantle Testnet
 *
 * Deploys all contracts in the correct order:
 * 1. MockUSDC (test stablecoin)
 * 2. InvoiceNFT
 * 3. KYCGate
 * 4. Groth16Verifier (ZK verifier)
 * 5. ZKKYCVerifier
 * 6. TrancheVault (Senior)
 * 7. TrancheVault (Junior)
 */

interface DeploymentAddresses {
  mockUSDC: string;
  invoiceNFT: string;
  kycGate: string;
  groth16Verifier: string;
  zkKYCVerifier: string;
  seniorVault: string;
  juniorVault: string;
  deployer: string;
  network: string;
  timestamp: string;
}

async function main() {
  console.log("🚀 Starting deployment to Mantle Testnet...\n");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("📋 Deployment Details:");
  console.log("  Deployer:", deployer.address);
  console.log("  Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("  Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const addresses: Partial<DeploymentAddresses> = {
    deployer: deployer.address,
    network: network.name,
    timestamp: new Date().toISOString(),
  };

  // ============================================
  // 1. Deploy MockUSDC
  // ============================================
  console.log("📦 [1/7] Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  addresses.mockUSDC = await mockUSDC.getAddress();
  console.log("  ✅ MockUSDC deployed to:", addresses.mockUSDC);
  console.log("");

  // ============================================
  // 2. Deploy InvoiceNFT
  // ============================================
  console.log("📦 [2/7] Deploying InvoiceNFT...");
  const InvoiceNFT = await ethers.getContractFactory("InvoiceNFT");
  const invoiceNFT = await InvoiceNFT.deploy();
  await invoiceNFT.waitForDeployment();
  addresses.invoiceNFT = await invoiceNFT.getAddress();
  console.log("  ✅ InvoiceNFT deployed to:", addresses.invoiceNFT);
  console.log("");

  // ============================================
  // 3. Deploy KYCGate
  // ============================================
  console.log("📦 [3/7] Deploying KYCGate...");
  const KYCGate = await ethers.getContractFactory("KYCGate");
  const kycGate = await KYCGate.deploy();
  await kycGate.waitForDeployment();
  addresses.kycGate = await kycGate.getAddress();
  console.log("  ✅ KYCGate deployed to:", addresses.kycGate);
  console.log("");

  // ============================================
  // 4. Deploy Groth16Verifier (ZK Verifier)
  // ============================================
  console.log("📦 [4/7] Deploying Groth16Verifier...");
  const Groth16Verifier = await ethers.getContractFactory("Groth16Verifier");
  const groth16Verifier = await Groth16Verifier.deploy();
  await groth16Verifier.waitForDeployment();
  addresses.groth16Verifier = await groth16Verifier.getAddress();
  console.log("  ✅ Groth16Verifier deployed to:", addresses.groth16Verifier);
  console.log("");

  // ============================================
  // 5. Deploy ZKKYCVerifier
  // ============================================
  console.log("📦 [5/7] Deploying ZKKYCVerifier...");
  const ZKKYCVerifier = await ethers.getContractFactory("ZKKYCVerifier");
  const zkKYCVerifier = await ZKKYCVerifier.deploy(addresses.groth16Verifier);
  await zkKYCVerifier.waitForDeployment();
  addresses.zkKYCVerifier = await zkKYCVerifier.getAddress();
  console.log("  ✅ ZKKYCVerifier deployed to:", addresses.zkKYCVerifier);
  console.log("");

  // ============================================
  // 6. Deploy Senior Tranche Vault
  // ============================================
  console.log("📦 [6/7] Deploying Senior Tranche Vault...");
  const TrancheVault = await ethers.getContractFactory("TrancheVault");
  const seniorVault = await TrancheVault.deploy(
    addresses.invoiceNFT,
    addresses.kycGate,
    addresses.mockUSDC,
    true,  // isSenior = true
    800,   // targetAPY = 8% (800 basis points)
    "Senior Invoice Vault",
    "siVault"
  );
  await seniorVault.waitForDeployment();
  addresses.seniorVault = await seniorVault.getAddress();
  console.log("  ✅ Senior Vault deployed to:", addresses.seniorVault);
  console.log("     Target APY: 8%");
  console.log("");

  // ============================================
  // 7. Deploy Junior Tranche Vault
  // ============================================
  console.log("📦 [7/7] Deploying Junior Tranche Vault...");
  const juniorVault = await TrancheVault.deploy(
    addresses.invoiceNFT,
    addresses.kycGate,
    addresses.mockUSDC,
    false, // isSenior = false (junior)
    2000,  // targetAPY = 20% (2000 basis points)
    "Junior Invoice Vault",
    "jiVault"
  );
  await juniorVault.waitForDeployment();
  addresses.juniorVault = await juniorVault.getAddress();
  console.log("  ✅ Junior Vault deployed to:", addresses.juniorVault);
  console.log("     Target APY: 20%");
  console.log("");

  // ============================================
  // Post-Deployment Configuration
  // ============================================
  console.log("⚙️  Configuring contracts...\n");

  // Grant roles in InvoiceNFT
  console.log("  🔑 Granting ISSUER_ROLE to deployer...");
  await invoiceNFT.grantRole(await invoiceNFT.ISSUER_ROLE(), deployer.address);

  console.log("  🔑 Granting ORACLE_ROLE to deployer...");
  await invoiceNFT.grantRole(await invoiceNFT.ORACLE_ROLE(), deployer.address);

  console.log("  🔑 Granting VAULT_ROLE to Senior Vault...");
  await invoiceNFT.grantRole(await invoiceNFT.VAULT_ROLE(), addresses.seniorVault);

  console.log("  🔑 Granting VAULT_ROLE to Junior Vault...");
  await invoiceNFT.grantRole(await invoiceNFT.VAULT_ROLE(), addresses.juniorVault);

  // Grant roles in KYCGate
  console.log("  🔑 Granting KYC_PROVIDER_ROLE to deployer...");
  await kycGate.grantRole(await kycGate.KYC_PROVIDER_ROLE(), deployer.address);

  // Mint test USDC to deployer
  console.log("  💰 Minting test USDC to deployer...");
  await mockUSDC.mint(deployer.address, ethers.parseUnits("1000000", 6)); // 1M USDC

  console.log("\n✅ Configuration complete!\n");

  // ============================================
  // Save deployment addresses
  // ============================================
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `deployment-${network.chainId}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(addresses, null, 2));

  console.log("📝 Deployment addresses saved to:", deploymentFile);
  console.log("");

  // ============================================
  // Summary
  // ============================================
  console.log("=" .repeat(60));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(60));
  console.log("");
  console.log("📋 Contract Addresses:");
  console.log("  MockUSDC:          ", addresses.mockUSDC);
  console.log("  InvoiceNFT:        ", addresses.invoiceNFT);
  console.log("  KYCGate:           ", addresses.kycGate);
  console.log("  Groth16Verifier:   ", addresses.groth16Verifier);
  console.log("  ZKKYCVerifier:     ", addresses.zkKYCVerifier);
  console.log("  Senior Vault:      ", addresses.seniorVault, "(8% APY)");
  console.log("  Junior Vault:      ", addresses.juniorVault, "(20% APY)");
  console.log("");
  console.log("🔑 Roles Granted:");
  console.log("  Deployer has ISSUER_ROLE and ORACLE_ROLE");
  console.log("  Vaults have VAULT_ROLE for invoice management");
  console.log("");
  console.log("💰 Test Funds:");
  console.log("  Deployer has 1,000,000 USDC for testing");
  console.log("");
  console.log("📚 Next Steps:");
  console.log("  1. Update .env with contract addresses");
  console.log("  2. Run oracle service: npm run oracle:start");
  console.log("  3. Run indexer: npm run indexer:start");
  console.log("  4. Start frontend: npm run frontend:dev");
  console.log("");
  console.log("=" .repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
