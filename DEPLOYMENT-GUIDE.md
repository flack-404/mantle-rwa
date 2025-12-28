# 🚀 Deployment Guide - Mantle RWA Invoice Factoring Protocol

Complete guide to deploy and run the entire system on Mantle testnet.

## ✅ What's Been Built

### Smart Contracts (100% Complete)
- ✅ **InvoiceNFT.sol** - ERC-721 invoice tokenization with lifecycle management
- ✅ **KYCGate.sol** - Compliance layer with country restrictions & risk scoring
- ✅ **TrancheVault.sol** - ERC-4626 vaults for senior/junior tranches
- ✅ **ZKKYCVerifier.sol** - Privacy-preserving KYC verification
- ✅ **Groth16Verifier.sol** - Real ZK proof verification (NOT mock)
- ✅ **MockUSDC.sol** - Test stablecoin for testnet

### ZK Proof System (100% Complete)
- ✅ **kycVerification.circom** - Circom circuit for KYC proofs
- ✅ **compile-circuits.sh** - Circuit compilation script
- ✅ **generate-proof.js** - Proof generation tool
- ✅ Real Groth16 implementation (snarkjs)

### Oracle Service (100% Complete)
- ✅ **Modular architecture** - Easy to swap mock → real APIs
- ✅ **Event-driven** - Listens for invoice mints
- ✅ **Auto-verification** - Verifies invoices every 30s
- ✅ **Payment monitoring** - Checks payments every 60s
- ✅ **Default detection** - Marks defaulted invoices
- ✅ **Mock data source** - Simulates QuickBooks/Xero

### Deployment Scripts (100% Complete)
- ✅ **deploy.ts** - Complete deployment pipeline
- ✅ **verify-contracts.ts** - Contract verification on explorer
- ✅ Role configuration
- ✅ Test USDC minting

## 📋 Prerequisites

### 1. Install Dependencies

```bash
# Root dependencies
npm install

# Install circom (for ZK circuits)
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom
cd ..

# Oracle dependencies
cd oracle-service
npm install
cd ..
```

### 2. Configure Environment

Create `.env` file:

```bash
# Deployment account (must have MNT for gas)
PRIVATE_KEY=your_private_key_here

# Mantle Testnet RPC
MANTLE_RPC_URL=https://rpc.testnet.mantle.xyz

# Oracle account (can be same as PRIVATE_KEY)
ORACLE_PRIVATE_KEY=your_oracle_private_key

# Explorer API (optional, for verification)
ETHERSCAN_API_KEY=your_mantle_explorer_api_key
```

### 3. Get Testnet MNT

- Visit Mantle testnet faucet: https://faucet.testnet.mantle.xyz
- Get MNT tokens for gas fees

## 🔧 Step-by-Step Deployment

### Step 1: Compile Contracts

```bash
npx hardhat compile
```

**Expected output:**
```
Compiled 36 Solidity files successfully
```

### Step 2: (Optional) Compile ZK Circuits

```bash
npm run compile:circuits
```

**Note:** This downloads ~200MB Powers of Tau file. Skip if you want to test without ZK first.

### Step 3: Deploy to Mantle Testnet

```bash
npm run deploy:testnet
```

**This will:**
1. Deploy all 7 contracts
2. Grant necessary roles
3. Mint test USDC
4. Save addresses to `deployments/deployment-5003.json`

**Expected output:**
```
🚀 Starting deployment to Mantle Testnet...
📦 [1/7] Deploying MockUSDC...
  ✅ MockUSDC deployed to: 0x...
📦 [2/7] Deploying InvoiceNFT...
  ✅ InvoiceNFT deployed to: 0x...
...
🎉 DEPLOYMENT SUCCESSFUL!
```

### Step 4: Verify Contracts (Optional)

```bash
npx hardhat run scripts/verify-contracts.ts --network mantleTestnet
```

### Step 5: Start Oracle Service

```bash
npm run oracle:start
```

**Expected output:**
```
🚀 Initializing Oracle Service...
✅ Oracle Service initialized successfully
▶️  Starting Oracle Service...
📊 Monitoring invoice events...
```

**Keep this running in a separate terminal!**

## 🧪 Testing the System

### Test Scenario 1: Mint an Invoice

Create `scripts/test-mint-invoice.ts`:

```typescript
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [signer] = await ethers.getSigners();

  // Load deployed addresses
  const addresses = JSON.parse(
    fs.readFileSync("deployments/deployment-5003.json", "utf-8")
  );

  const invoiceNFT = await ethers.getContractAt("InvoiceNFT", addresses.invoiceNFT, signer);
  const kycGate = await ethers.getContractAt("KYCGate", addresses.kycGate, signer);

  // 1. Grant ISSUER_ROLE to signer (if not already)
  const ISSUER_ROLE = await invoiceNFT.ISSUER_ROLE();
  await invoiceNFT.grantRole(ISSUER_ROLE, signer.address);
  console.log("✅ ISSUER_ROLE granted");

  // 2. KYC verify the business
  const countryHash = ethers.keccak256(ethers.toUtf8Bytes("US"));
  const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year
  await kycGate.quickVerifyUser(signer.address, countryHash, 30, "KYC-TEST-001");
  console.log("✅ Business KYC verified");

  // 3. Mint invoice
  const faceValue = ethers.parseUnits("100000", 6); // $100,000 USDC
  const maturityDate = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60; // 90 days
  const debtorAddress = "0x" + "1".repeat(40); // Mock debtor
  const invoiceHash = ethers.keccak256(ethers.toUtf8Bytes("invoice-pdf-hash-001"));

  const tx = await invoiceNFT.mintInvoice(
    faceValue,
    maturityDate,
    debtorAddress,
    invoiceHash,
    "Walmart Inc",
    500 // 5% discount
  );

  const receipt = await tx.wait();
  console.log("✅ Invoice minted!");
  console.log("   TX:", receipt?.hash);

  // Get invoice details
  const invoice = await invoiceNFT.getInvoice(1);
  console.log("\n📋 Invoice Details:");
  console.log("   Token ID:", invoice.tokenId.toString());
  console.log("   Face Value:", ethers.formatUnits(invoice.faceValue, 6), "USDC");
  console.log("   Discounted:", ethers.formatUnits(invoice.discountedValue, 6), "USDC");
  console.log("   Debtor:", invoice.debtorName);
  console.log("   Status:", invoice.status); // 0 = PENDING

  console.log("\n⏳ Oracle will verify this invoice in ~30 seconds...");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Run:
```bash
npx hardhat run scripts/test-mint-invoice.ts --network mantleTestnet
```

**Watch the Oracle terminal** - it should automatically verify the invoice!

### Test Scenario 2: Investor Deposits into Vault

```typescript
import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [investor] = await ethers.getSigners();
  const addresses = JSON.parse(fs.readFileSync("deployments/deployment-5003.json", "utf-8"));

  const mockUSDC = await ethers.getContractAt("MockUSDC", addresses.mockUSDC, investor);
  const kycGate = await ethers.getContractAt("KYCGate", addresses.kycGate, investor);
  const seniorVault = await ethers.getContractAt("TrancheVault", addresses.seniorVault, investor);

  // 1. Get test USDC
  await mockUSDC.faucet();
  console.log("✅ Claimed 1,000 USDC from faucet");

  // 2. KYC verify
  const countryHash = ethers.keccak256(ethers.toUtf8Bytes("US"));
  await kycGate.quickVerifyUser(investor.address, countryHash, 25, "INV-001");
  console.log("✅ Investor KYC verified");

  // 3. Approve vault
  await mockUSDC.approve(addresses.seniorVault, ethers.parseUnits("500", 6));
  console.log("✅ Approved vault");

  // 4. Deposit
  const tx = await seniorVault.deposit(
    ethers.parseUnits("500", 6),
    investor.address
  );
  await tx.wait();
  console.log("✅ Deposited 500 USDC into Senior Vault");

  // Check position
  const position = await seniorVault.getUserPosition(investor.address);
  console.log("\n💰 Position:");
  console.log("   Shares:", ethers.formatUnits(position.shares, 18));
  console.log("   Value:", ethers.formatUnits(position.assets, 6), "USDC");
}

main().then(() => process.exit(0)).catch(console.error);
```

## 📊 What Happens Automatically

With the Oracle running:

1. **New Invoice Minted** → Oracle detects event
2. **Wait ~30s** → Oracle verification check runs
3. **Oracle Verifies** → Calls `verifyInvoice()` on-chain
4. **Status Updates** → Invoice status → VERIFIED
5. **Payment Simulation** → Mock data source schedules payment (10s-2min)
6. **Oracle Detects Payment** → Calls `recordPayment()` on-chain
7. **Status Updates** → Invoice status → PAID
8. **Yield Distribution** → Vault owner can distribute yield

## 🎯 Expected Behavior

### Timeline for Single Invoice:

```
T+0s:    Mint invoice (status: PENDING)
T+30s:   Oracle verifies (status: VERIFIED)
T+45s:   Vault owner adds to vault (status: FUNDED)
T+90s:   Mock payment arrives (75% probability)
T+120s:  Oracle records payment (status: PAID)
T+130s:  Vault owner distributes yield to investors
```

### Mock Data Source Behavior:

- **95%** of invoices verify successfully
- **70%** of invoices get paid
- **30%** default (past maturity without payment)
- **10%** partial payments
- Payment delay: **10-120 seconds** (random)

## 🔄 Full System Architecture

```
┌──────────────┐
│   Frontend   │ (Next.js - TO BE BUILT)
│              │
│ - Business   │
│ - Investor   │
│ - Dashboard  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────┐
│         Smart Contracts (Mantle)          │
├──────────────────────────────────────────┤
│  InvoiceNFT  │  KYCGate  │  TrancheVault │
│  ZKVerifier  │  USDC     │               │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────┐         ┌──────────────┐
│    Oracle    │────────▶│  Mock Data   │
│   Service    │         │    Source    │
│              │         │              │
│ - Verify     │         │ (Replace w/  │
│ - Payments   │         │  real APIs)  │
│ - Defaults   │         │              │
└──────────────┘         └──────────────┘
```

## 🚨 Troubleshooting

### "Insufficient funds"
- Get more MNT from faucet
- Check balance: `npx hardhat run scripts/check-balance.ts`

### "Invoice does not exist"
- Mint an invoice first
- Check invoice count: `await invoiceNFT.getStatistics()`

### Oracle not verifying
- Check Oracle is running: `npm run oracle:start`
- Check Oracle wallet has ORACLE_ROLE
- Wait 30+ seconds after minting

### "KYC required"
- Call `kycGate.quickVerifyUser()` first
- Check: `await kycGate.isVerified(address)`

## 📚 Next Steps

1. ✅ **Deploy to testnet** (follow this guide)
2. ⏳ **Build frontend** (Next.js + wagmi)
3. ⏳ **Build indexer** (event monitoring + analytics)
4. ⏳ **Create demo video** (3-5 minutes)
5. ⏳ **Write pitch deck** (problem, solution, traction)
6. ✅ **Submit to hackathon**

## 🏆 Hackathon Submission Checklist

- ✅ GitHub repository with all code
- ✅ README with project description
- ✅ Deployed contracts on Mantle testnet
- ✅ Working demo (Oracle + smart contracts)
- ⏳ Demo video showing full flow
- ⏳ Pitch deck (1-pager)
- ⏳ Architecture diagram
- ⏳ Team bios

## 🔗 Resources

- Mantle Testnet Explorer: https://explorer.testnet.mantle.xyz
- Mantle Faucet: https://faucet.testnet.mantle.xyz
- Mantle Docs: https://docs.mantle.xyz
- ZK Proofs Guide: `scripts/generate-proof.js`
- Oracle Guide: `oracle-service/README.md`

---

**Built for Mantle Global Hackathon 2025** 🚀
