import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Verify all deployed contracts on Mantle Explorer
 */

async function main() {
  console.log("🔍 Verifying contracts on Mantle Explorer...\n");

  // Load deployment addresses
  const deploymentsDir = path.join(__dirname, "../deployments");
  const files = fs.readdirSync(deploymentsDir);

  if (files.length === 0) {
    console.error("❌ No deployment files found. Deploy contracts first.");
    process.exit(1);
  }

  const latestDeployment = files.sort().reverse()[0];
  const deploymentPath = path.join(deploymentsDir, latestDeployment);
  const addresses = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));

  console.log("📋 Using deployment file:", latestDeployment);
  console.log("");

  // Verify MockUSDC
  console.log("🔍 [1/7] Verifying MockUSDC...");
  try {
    await run("verify:verify", {
      address: addresses.mockUSDC,
      constructorArguments: [],
    });
    console.log("  ✅ Verified\n");
  } catch (error: any) {
    console.log("  ℹ️ ", error.message, "\n");
  }

  // Verify InvoiceNFT
  console.log("🔍 [2/7] Verifying InvoiceNFT...");
  try {
    await run("verify:verify", {
      address: addresses.invoiceNFT,
      constructorArguments: [],
    });
    console.log("  ✅ Verified\n");
  } catch (error: any) {
    console.log("  ℹ️ ", error.message, "\n");
  }

  // Verify KYCGate
  console.log("🔍 [3/7] Verifying KYCGate...");
  try {
    await run("verify:verify", {
      address: addresses.kycGate,
      constructorArguments: [],
    });
    console.log("  ✅ Verified\n");
  } catch (error: any) {
    console.log("  ℹ️ ", error.message, "\n");
  }

  // Verify Groth16Verifier
  console.log("🔍 [4/7] Verifying Groth16Verifier...");
  try {
    await run("verify:verify", {
      address: addresses.groth16Verifier,
      constructorArguments: [],
    });
    console.log("  ✅ Verified\n");
  } catch (error: any) {
    console.log("  ℹ️ ", error.message, "\n");
  }

  // Verify ZKKYCVerifier
  console.log("🔍 [5/7] Verifying ZKKYCVerifier...");
  try {
    await run("verify:verify", {
      address: addresses.zkKYCVerifier,
      constructorArguments: [addresses.groth16Verifier],
    });
    console.log("  ✅ Verified\n");
  } catch (error: any) {
    console.log("  ℹ️ ", error.message, "\n");
  }

  // Verify Senior Vault
  console.log("🔍 [6/7] Verifying Senior Vault...");
  try {
    await run("verify:verify", {
      address: addresses.seniorVault,
      constructorArguments: [
        addresses.invoiceNFT,
        addresses.kycGate,
        addresses.mockUSDC,
        true,
        800,
        "Senior Invoice Vault",
        "siVault",
      ],
    });
    console.log("  ✅ Verified\n");
  } catch (error: any) {
    console.log("  ℹ️ ", error.message, "\n");
  }

  // Verify Junior Vault
  console.log("🔍 [7/7] Verifying Junior Vault...");
  try {
    await run("verify:verify", {
      address: addresses.juniorVault,
      constructorArguments: [
        addresses.invoiceNFT,
        addresses.kycGate,
        addresses.mockUSDC,
        false,
        2000,
        "Junior Invoice Vault",
        "jiVault",
      ],
    });
    console.log("  ✅ Verified\n");
  } catch (error: any) {
    console.log("  ℹ️ ", error.message, "\n");
  }

  console.log("✅ Verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:");
    console.error(error);
    process.exit(1);
  });
