import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Test Script: Mint Invoice
 *
 * This tests the complete invoice minting flow:
 * 1. Grant ISSUER_ROLE to business
 * 2. KYC verify the business
 * 3. Mint an invoice NFT
 * 4. Verify invoice was created correctly
 */

async function main() {
  console.log("🧪 Testing Invoice Minting...\n");

  const [signer] = await ethers.getSigners();
  console.log("👤 Using account:", signer.address);
  console.log("");

  // Load deployed addresses
  const deploymentsPath = path.join(__dirname, "../deployments/deployment-5003.json");
  const addresses = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));

  // Connect to contracts
  const invoiceNFT = await ethers.getContractAt("InvoiceNFT", addresses.invoiceNFT, signer);
  const kycGate = await ethers.getContractAt("KYCGate", addresses.kycGate, signer);

  // Step 1: Verify signer has ISSUER_ROLE
  console.log("🔑 Checking ISSUER_ROLE...");
  const ISSUER_ROLE = await invoiceNFT.ISSUER_ROLE();
  const hasRole = await invoiceNFT.hasRole(ISSUER_ROLE, signer.address);

  if (!hasRole) {
    console.log("   ⚠️  Granting ISSUER_ROLE...");
    const tx = await invoiceNFT.grantRole(ISSUER_ROLE, signer.address);
    await tx.wait();
    console.log("   ✅ ISSUER_ROLE granted");
  } else {
    console.log("   ✅ Already has ISSUER_ROLE");
  }
  console.log("");

  // Step 2: KYC verify the business
  console.log("✅ Verifying business KYC...");
  const countryHash = ethers.keccak256(ethers.toUtf8Bytes("US"));
  const isVerified = await kycGate.isVerified(signer.address);

  if (!isVerified) {
    const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year
    const tx = await kycGate.verifyUser(
      signer.address,
      expiresAt,
      countryHash,
      30, // risk score
      "TEST-BUSINESS-001",
      1  // tier 1
    );
    await tx.wait();
    console.log("   ✅ Business KYC verified");
  } else {
    console.log("   ✅ Already KYC verified");
  }
  console.log("");

  // Step 3: Mint invoice
  console.log("📄 Minting test invoice...");
  const faceValue = ethers.parseUnits("100000", 6); // $100,000 USDC
  const maturityDate = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60; // 90 days
  const debtorAddress = "0x" + "1".repeat(40); // Mock debtor
  const invoiceHash = ethers.keccak256(
    ethers.toUtf8Bytes(`invoice-${Date.now()}`)
  );

  const tx = await invoiceNFT.mintInvoice(
    faceValue,
    maturityDate,
    debtorAddress,
    invoiceHash,
    "Walmart Inc",
    500 // 5% discount
  );

  console.log("   ⏳ Transaction sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("   ✅ Transaction confirmed!");
  console.log("");

  // Get the minted token ID from event
  const event = receipt?.logs.find((log: any) => {
    try {
      const parsed = invoiceNFT.interface.parseLog(log);
      return parsed?.name === "InvoiceMinted";
    } catch {
      return false;
    }
  });

  const parsed = event ? invoiceNFT.interface.parseLog(event) : null;
  const tokenId = parsed?.args?.tokenId;

  if (!tokenId) {
    console.error("❌ Could not find InvoiceMinted event");
    return;
  }

  // Step 4: Verify invoice details
  console.log("📋 Invoice Details:");
  const invoice = await invoiceNFT.getInvoice(tokenId);

  console.log("   Token ID:", tokenId.toString());
  console.log("   Face Value:", ethers.formatUnits(invoice.faceValue, 6), "USDC");
  console.log("   Discounted Value:", ethers.formatUnits(invoice.discountedValue, 6), "USDC");
  console.log("   Yield:", ethers.formatUnits(invoice.faceValue - invoice.discountedValue, 6), "USDC");
  console.log("   Debtor:", invoice.debtorName);
  console.log("   Maturity:", new Date(Number(invoice.maturityDate) * 1000).toISOString());
  console.log("   Status:", ["PENDING", "VERIFIED", "FUNDED", "PAID", "DEFAULTED", "PARTIAL_PAID"][invoice.status]);
  console.log("   Owner:", invoice.issuer);
  console.log("");

  // View on explorer
  console.log("🔍 View on Mantle Sepolia Explorer:");
  console.log(`   https://sepolia.mantlescan.xyz/token/${addresses.invoiceNFT}?a=${tokenId}`);
  console.log("");

  console.log("✅ ✅ ✅ Invoice minting test PASSED! ✅ ✅ ✅");
  console.log("");
  console.log("⏳ Next: Oracle will automatically verify this invoice in ~30 seconds");
  console.log("   Start oracle with: npm run oracle:start");
  console.log("");

  // Get stats
  const stats = await invoiceNFT.getStatistics();
  console.log("📊 Platform Statistics:");
  console.log("   Total Invoices:", stats[4].toString());
  console.log("   Funded Invoices:", stats[0].toString());
  console.log("   Total Value Funded:", ethers.formatUnits(stats[1], 6), "USDC");
  console.log("   Total Value Paid:", ethers.formatUnits(stats[2], 6), "USDC");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:");
    console.error(error);
    process.exit(1);
  });
