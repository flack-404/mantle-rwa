import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Granting KYC_PROVIDER_ROLE with account:", deployer.address);

  // Load deployment addresses
  const network = await ethers.provider.getNetwork();
  const deploymentPath = path.join(
    __dirname,
    `../deployments/deployment-${network.chainId}.json`
  );
  const addresses = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get KYCGate contract
  const KYCGate = await ethers.getContractAt("KYCGate", addresses.kycGate);

  // Get KYC_PROVIDER_ROLE
  const KYC_PROVIDER_ROLE = await KYCGate.KYC_PROVIDER_ROLE();

  console.log("\n📋 Target Address (will get KYC role):", deployer.address);
  console.log("🔐 KYC_PROVIDER_ROLE:", KYC_PROVIDER_ROLE);

  // Check if already has role
  const hasRole = await KYCGate.hasRole(KYC_PROVIDER_ROLE, deployer.address);

  if (hasRole) {
    console.log("\n✅ Address already has KYC_PROVIDER_ROLE!");
    return;
  }

  // Grant role
  console.log("\n⏳ Granting KYC_PROVIDER_ROLE...");
  const tx = await KYCGate.grantRole(KYC_PROVIDER_ROLE, deployer.address);
  await tx.wait();

  console.log("✅ KYC_PROVIDER_ROLE granted!");
  console.log("📝 Transaction:", tx.hash);

  // Verify
  const hasRoleNow = await KYCGate.hasRole(KYC_PROVIDER_ROLE, deployer.address);
  console.log("\n🎉 Verification:", hasRoleNow ? "SUCCESS" : "FAILED");

  console.log("\n✨ You can now verify KYC for users in the frontend!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
