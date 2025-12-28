import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Test Script: Vault Deposit
 *
 * This tests the complete investor flow:
 * 1. Get test USDC
 * 2. KYC verify investor
 * 3. Deposit into Senior Vault
 * 4. Check position and share price
 */

async function main() {
  console.log("🧪 Testing Vault Deposit...\n");

  const [investor] = await ethers.getSigners();
  console.log("👤 Investor account:", investor.address);
  console.log("");

  // Load deployed addresses
  const deploymentsPath = path.join(__dirname, "../deployments/deployment-5003.json");
  const addresses = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));

  // Connect to contracts
  const mockUSDC = await ethers.getContractAt("MockUSDC", addresses.mockUSDC, investor);
  const kycGate = await ethers.getContractAt("KYCGate", addresses.kycGate, investor);
  const seniorVault = await ethers.getContractAt("TrancheVault", addresses.seniorVault, investor);
  const juniorVault = await ethers.getContractAt("TrancheVault", addresses.juniorVault, investor);

  // Step 1: Get test USDC
  console.log("💰 Getting test USDC from faucet...");
  const initialBalance = await mockUSDC.balanceOf(investor.address);
  console.log("   Current balance:", ethers.formatUnits(initialBalance, 6), "USDC");

  if (initialBalance < ethers.parseUnits("1000", 6)) {
    const tx = await mockUSDC.faucet();
    await tx.wait();
    console.log("   ✅ Claimed 1,000 USDC from faucet");
  } else {
    console.log("   ✅ Already have sufficient USDC");
  }

  const newBalance = await mockUSDC.balanceOf(investor.address);
  console.log("   New balance:", ethers.formatUnits(newBalance, 6), "USDC");
  console.log("");

  // Step 2: KYC verify investor
  console.log("✅ Verifying investor KYC...");
  const countryHash = ethers.keccak256(ethers.toUtf8Bytes("US"));
  const isVerified = await kycGate.isVerified(investor.address);

  if (!isVerified) {
    const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year
    const tx = await kycGate.verifyUser(
      investor.address,
      expiresAt,
      countryHash,
      25, // risk score
      "TEST-INVESTOR-001",
      1  // tier 1
    );
    await tx.wait();
    console.log("   ✅ Investor KYC verified");
  } else {
    console.log("   ✅ Already KYC verified");
  }
  console.log("");

  // Step 3: Deposit into Senior Vault
  console.log("🏦 Depositing into Senior Vault (8% APY target)...");
  const depositAmount = ethers.parseUnits("500", 6); // $500

  console.log("   Amount to deposit:", ethers.formatUnits(depositAmount, 6), "USDC");

  // Approve vault
  console.log("   📝 Approving vault...");
  let tx = await mockUSDC.approve(addresses.seniorVault, depositAmount);
  await tx.wait();
  console.log("   ✅ Approved");

  // Deposit
  console.log("   📥 Depositing...");
  tx = await seniorVault.deposit(depositAmount, investor.address);
  const receipt = await tx.wait();
  console.log("   ✅ Deposited!");
  console.log("   TX:", receipt?.hash);
  console.log("");

  // Step 4: Check position
  console.log("📊 Investor Position in Senior Vault:");
  const position = await seniorVault.getUserPosition(investor.address);
  console.log("   Shares owned:", ethers.formatUnits(position.shares, 18));
  console.log("   Value:", ethers.formatUnits(position.assets, 6), "USDC");
  console.log("   % of vault:", (Number(position.percentageOfVault) / 100).toFixed(2), "%");
  console.log("");

  // Get vault stats
  console.log("📈 Senior Vault Statistics:");
  const stats = await seniorVault.getVaultStats();
  console.log("   TVL:", ethers.formatUnits(stats.tvl, 6), "USDC");
  console.log("   Invoice count:", stats.invoiceCount.toString());
  console.log("   Active invoice value:", ethers.formatUnits(stats.activeInvoiceValue, 6), "USDC");
  console.log("   Total yield distributed:", ethers.formatUnits(stats.totalYield, 6), "USDC");
  console.log("   Share price:", ethers.formatUnits(stats.sharePrice, 18));
  console.log("   Expected APY:", (Number(stats.expectedAPY) / 100).toFixed(2), "%");
  console.log("");

  // Test Junior Vault too
  console.log("🏦 Testing Junior Vault (20% APY target)...");
  const juniorDeposit = ethers.parseUnits("200", 6);

  tx = await mockUSDC.approve(addresses.juniorVault, juniorDeposit);
  await tx.wait();

  tx = await juniorVault.deposit(juniorDeposit, investor.address);
  await tx.wait();
  console.log("   ✅ Deposited 200 USDC into Junior Vault");
  console.log("");

  const juniorPosition = await juniorVault.getUserPosition(investor.address);
  console.log("📊 Junior Vault Position:");
  console.log("   Shares:", ethers.formatUnits(juniorPosition.shares, 18));
  console.log("   Value:", ethers.formatUnits(juniorPosition.assets, 6), "USDC");
  console.log("");

  console.log("✅ ✅ ✅ Vault deposit test PASSED! ✅ ✅ ✅");
  console.log("");
  console.log("🔍 View on Explorer:");
  console.log(`   Senior Vault: https://sepolia.mantlescan.xyz/address/${addresses.seniorVault}`);
  console.log(`   Junior Vault: https://sepolia.mantlescan.xyz/address/${addresses.juniorVault}`);
  console.log("");
  console.log("💡 Next Steps:");
  console.log("   1. Vault owner adds verified invoices to vaults");
  console.log("   2. Oracle monitors payments");
  console.log("   3. Yield gets distributed to vault shares");
  console.log("   4. Investors redeem shares + yield");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:");
    console.error(error);
    process.exit(1);
  });
