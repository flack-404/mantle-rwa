# 🚀 START ALL SERVICES - Quick Reference

## ✅ BOTH SERVICES NOW WORKING!

### Issues Fixed:
- ✅ Oracle: Installed winston dependency
- ✅ Indexer: Fixed event name (InvoiceRepaid instead of InvoicePaid)

---

## 📋 OPEN 3 TERMINALS

### Terminal 1: Oracle Service
```bash
cd /downloads/mantle-rwa
npm run oracle:start
```

**Expected Output:**
```
🚀 Initializing Oracle Service...
📋 Loaded deployment: deployment-5003.json
🔑 Oracle wallet: 0xb660CcCc75e92Dc5d8bCB73e00C138438e042cFb
📝 Connected to InvoiceNFT: 0x8CF8e5Ffe2DC4FD0b2a5ae491Be6fa38E5e641BD
📊 Mock Data Source initialized
✅ Oracle Service initialized successfully
▶️  Starting Oracle Service...
✅ Oracle Service is now running
📊 Monitoring invoice events...
⏱️  Verification check every 30s
⏱️  Payment check every 60s
```

✅ **KEEP THIS RUNNING!**

---

### Terminal 2: Indexer Service
```bash
cd /downloads/mantle-rwa/indexer-service
npm start
```

**Expected Output:**
```
🚀 Initializing Indexer Service...
📡 Connected to Mantle Sepolia: https://rpc.sepolia.mantle.xyz
✅ Contracts initialized
   InvoiceNFT: 0x8CF8e5Ffe2DC4FD0b2a5ae491Be6fa38E5e641BD
   KYCGate: 0x94D60d03e1BC733352f071D25326a023f496Dac0
   Senior Vault: 0xCE75bc6E94363f1c3756d769871aBE7428202001
   Junior Vault: 0x48Ba5Cd4692f34b68949A22074Cc7c6b41b5Ad28
🎧 Starting event listener...
✅ All event listeners started successfully
🚀 API server running on http://localhost:3001
✅ Indexer Service started successfully!
📊 API available at http://localhost:3001
```

✅ **KEEP THIS RUNNING!**

---

### Terminal 3: Frontend
```bash
cd /downloads/mantle-rwa/frontend
npm run dev
```

**Expected Output:**
```
▲ Next.js 16.1.1 (Turbopack)
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000
✓ Starting...
✓ Ready in 500ms
```

✅ **KEEP THIS RUNNING!**

---

## 🌐 OPEN BROWSER

**Main URL:** http://localhost:3000

**Test:**
1. ✅ Home page loads
2. ✅ Connect wallet (MetaMask)
3. ✅ Switch to Mantle Sepolia
4. ✅ Navigate to /business
5. ✅ Navigate to /investor
6. ✅ Navigate to /dashboard

**API Test:**
```bash
curl http://localhost:3001/api/stats/platform
```

---

## 🧪 QUICK TEST FLOW (5 minutes)

### 1. Business Flow (3 min)
- Go to http://localhost:3000/business
- Complete KYC → Confirm in MetaMask
- Fill invoice form:
  - Face Value: `100000`
  - Maturity Days: `90`
  - Debtor: `0x742d35Cc6634C0532925a3b844Bc454e4438f44e`
  - Debtor Name: `Acme Corp`
  - Discount: `5`
- Mint invoice → Confirm
- **Watch Terminal 1:** Oracle auto-verifies in ~30s!

### 2. Investor Flow (2 min)
- Go to http://localhost:3000/investor
- Claim 1000 USDC
- Deposit 100 to Senior Vault
- **Watch Terminal 2:** Indexer logs deposit!

### 3. Dashboard
- Go to http://localhost:3000/dashboard
- See charts with your data!

---

## 🎬 FOR DEMO VIDEO

**Record all 3 terminals side-by-side showing:**
1. Oracle auto-verifying invoices
2. Indexer logging all events
3. Frontend UI updates in real-time

---

## 🆘 TROUBLESHOOTING

### Oracle won't start
```bash
cd /downloads/mantle-rwa
npm install  # Re-install dependencies
npm run oracle:start
```

### Indexer error
```bash
cd /downloads/mantle-rwa/indexer-service
npm install
npm start
```

### Frontend error
```bash
cd /downloads/mantle-rwa/frontend
rm -rf .next
npm run dev
```

### MetaMask issues
- Ensure you're on Mantle Sepolia (Chain ID: 5003)
- Get test MNT: https://faucet.sepolia.mantle.xyz

---

## 📞 QUICK COMMANDS

```bash
# Stop all services: Ctrl+C in each terminal

# View logs in real-time:
# Terminal 1: Oracle auto-verification logs
# Terminal 2: Indexer event logs
# Terminal 3: Frontend build logs

# Test API:
curl http://localhost:3001/api/invoices
curl http://localhost:3001/api/stats/platform
curl http://localhost:3001/api/vaults/senior/deposits
```

---

**🎉 ALL SERVICES READY FOR TESTING!**
