# 🧪 Complete UI Testing Guide - Mantle RWA

## 🚀 STEP 1: Start All Services

Open **3 terminals** and run these commands:

### Terminal 1: Oracle Service
```bash
cd /downloads/mantle-rwa
npm run oracle:start
```

**Expected Output:**
```
🚀 Oracle Service Started
📡 Connected to Mantle Sepolia
🎧 Listening for events...
⏰ Invoice verification: every 30s
⏰ Payment monitoring: every 60s
```

**Keep this running!** The oracle will auto-verify invoices.

---

### Terminal 2: Indexer Service
```bash
cd /downloads/mantle-rwa/indexer-service
npm install  # First time only
npm start
```

**Expected Output:**
```
🚀 Initializing Indexer Service...
📡 Connected to Mantle Sepolia
✅ Contracts initialized
🎧 Starting event listener...
✅ All event listeners started
🚀 API server running on http://localhost:3001
```

**Keep this running!** The indexer tracks all blockchain events.

---

### Terminal 3: Frontend
```bash
cd /downloads/mantle-rwa/frontend
npm install  # First time only
npm run dev
```

**Expected Output:**
```
▲ Next.js 16.1.1 (Turbopack)
- Local:        http://localhost:3000
✓ Ready in 500ms
```

**Keep this running!** This is your main UI.

---

## 🌐 STEP 2: Open Browser & Connect Wallet

1. **Open:** http://localhost:3000
2. **You should see:**
   - Hero section: "Tokenize Invoices, Unlock Liquidity"
   - Stats cards showing TVL, Invoices, APY
   - "For Businesses" and "For Investors" buttons
   - Navigation bar with RainbowKit "Connect Wallet" button

3. **Connect Wallet:**
   - Click **"Connect Wallet"** (top-right)
   - Select **MetaMask** (or your preferred wallet)
   - Approve connection

4. **Switch to Mantle Sepolia:**
   - If not already on Mantle Sepolia, RainbowKit will prompt you
   - Click **"Switch Network"**
   - Approve in MetaMask

5. **Get Test MNT (if needed):**
   - Go to: https://faucet.sepolia.mantle.xyz
   - Paste your wallet address
   - Request test MNT for gas fees

---

## 📊 STEP 3: Test Home Page

### What to Test:

1. **Stats Cards:**
   - Total Value Locked (should show ~$700 if you did test deposits)
   - Invoices Minted (should show 1+)
   - Senior APY (8%)
   - Junior APY (20%)

2. **Navigation:**
   - Click **"For Businesses"** → Should go to `/business`
   - Click **"For Investors"** → Should go to `/investor`
   - Click **"Dashboard"** (nav bar) → Should go to `/dashboard`
   - Click **"Mantle RWA"** logo → Returns to home

3. **Features Section:**
   - Verify all 3 feature cards display
   - Read "How It Works" for both businesses and investors

**✅ Pass if:** All cards show, navigation works, no errors in console

---

## 💼 STEP 4: Test Business Interface

Navigate to: http://localhost:3000/business

### 4.1 Test KYC Verification

1. **Find KYC Section:**
   - You should see: "KYC Status: Not Verified" (if first time)

2. **Verify KYC:**
   - Click **"Complete KYC Verification"** button
   - Wait for transaction confirmation
   - MetaMask will popup → Click **"Confirm"**

3. **Expected Result:**
   ```
   ✅ KYC verified successfully!
   Status: Verified
   Tier: 1
   ```

**✅ Pass if:** Status changes to "Verified" with green checkmark

---

### 4.2 Test Invoice Minting (WITHOUT PDF first)

**Fill out the form:**

1. **Face Value:** `100000` (= $100,000 USDC)
2. **Maturity Days:** `90` (Net 90 terms)
3. **Debtor Address:** Use any valid Ethereum address (e.g., `0x742d35Cc6634C0532925a3b844Bc454e4438f44e`)
4. **Debtor Name:** `Acme Corporation`
5. **Discount Rate:** `5` (= 5% discount)
6. **Leave PDF upload empty for now**

**Click "Calculate Preview":**

You should see:
```
Face Value: $100,000.00
Discount: 5%
You Receive: $95,000.00 (instantly)
Maturity: [Date 90 days from now]
```

**Click "Mint Invoice NFT":**

1. MetaMask popup → **Confirm**
2. Wait for transaction (5-10 seconds)
3. Expected success message:
   ```
   ✅ Invoice minted successfully!
   Token ID: #2
   Transaction: 0x123...
   ```

**✅ Pass if:** Invoice mints, you see token ID, no errors

---

### 4.3 Test Oracle Auto-Verification

**After minting invoice (wait 30-60 seconds):**

1. **Check Terminal 1 (Oracle):**
   ```
   📄 Invoice minted: Token ID 2
   ⏰ Verifying pending invoices...
   📊 Mock verification for invoice #2...
   ✅ Invoice verified: Token ID 2
   ```

2. **Check "My Invoices" section:**
   - Should show your invoice
   - Status should change: **PENDING** → **VERIFIED**
   - Watch it update in real-time!

**✅ Pass if:** Oracle automatically verifies invoice within 30-60 seconds

---

### 4.4 Test IPFS PDF Upload

**Now test with a PDF file:**

1. **Prepare a PDF:**
   - Create/download any PDF file
   - Name it something like `invoice-acme-001.pdf`
   - Max size: 10MB

2. **Fill Invoice Form Again:**
   - Face Value: `50000`
   - Maturity Days: `60`
   - Debtor Address: `0x742d35Cc6634C0532925a3b844Bc454e4438f44e`
   - Debtor Name: `Tech Solutions Inc`
   - Discount Rate: `4`

3. **Upload PDF:**
   - Click **"Choose File"** in "Invoice PDF" section
   - Select your PDF
   - You should see upload progress

4. **Expected Output:**
   ```
   ✅ Uploaded to IPFS: QmXx...
   Gateway URL: https://gateway.pinata.cloud/ipfs/QmXx...
   ```

5. **Click the IPFS link** → Opens in new tab showing your PDF!

6. **Mint the invoice** with IPFS hash attached

**✅ Pass if:**
- PDF uploads successfully
- IPFS hash displayed
- Link works and shows PDF
- Invoice mints with IPFS reference

---

### 4.5 Test My Invoices List

**Scroll to "My Invoices" section:**

You should see a table with:
- Token ID
- Debtor Name
- Face Value
- Discounted Amount
- Maturity Date
- Status (color-coded)
- IPFS link (if uploaded)

**Test:**
- Click on Token ID → Should show details
- Click IPFS link → Opens PDF
- Watch status change as Oracle verifies

**✅ Pass if:** All invoices display correctly with accurate data

---

## 💰 STEP 5: Test Investor Interface

Navigate to: http://localhost:3000/investor

### 5.1 Test KYC Verification

If you already verified KYC as a business, it should show:
```
✅ KYC Status: Verified
Tier: 1
```

If not, click **"Complete KYC"** and verify.

**✅ Pass if:** KYC verified (can be same as business)

---

### 5.2 Test USDC Faucet

**Get test USDC:**

1. **Find "Get Test USDC" section**
2. **Click "Claim 1000 USDC" button**
3. MetaMask popup → **Confirm**
4. Wait for transaction

**Expected Result:**
```
✅ Claimed 1000 USDC!
Your Balance: 1000 USDC
```

**Verify balance updates in the UI**

**✅ Pass if:** Balance increases by 1000 USDC

---

### 5.3 Test Senior Vault Deposit

**Select Senior Vault:**

1. **Vault Stats Display:**
   ```
   Senior Vault (8% APY)
   TVL: $500
   Your Position: $0
   ```

2. **Enter Deposit Amount:** `100`

3. **Click "Approve USDC":**
   - MetaMask popup → **Confirm**
   - Wait for approval transaction
   - Button changes to "Deposit"

4. **Click "Deposit":**
   - MetaMask popup → **Confirm**
   - Wait for deposit transaction

**Expected Result:**
```
✅ Deposited 100 USDC to Senior Vault!
Your Position: $100 (X shares)
```

**Check Terminal 2 (Indexer):**
```
💵 senior vault deposit: 100.0 USDC by 0xYourAddress
```

**✅ Pass if:**
- Deposit successful
- Balance updates
- Position shows in UI
- Indexer logs event

---

### 5.4 Test Junior Vault Deposit

**Switch to Junior Vault:**

1. **Click "Junior Vault" tab**
2. **Stats Display:**
   ```
   Junior Vault (20% APY)
   TVL: $200
   Your Position: $0
   ```

3. **Enter Amount:** `50`
4. **Approve USDC** (if not already approved)
5. **Deposit**

**Expected Result:**
```
✅ Deposited 50 USDC to Junior Vault!
Your Position: $50 (X shares)
```

**✅ Pass if:** Deposit works, position updates

---

### 5.5 Test Vault Withdrawal

**Withdraw from Senior Vault:**

1. **Switch to "Withdraw" tab**
2. **Your Position shows:** e.g., `$100`
3. **Enter Amount:** `25`
4. **Click "Withdraw":**
   - MetaMask popup → **Confirm**
   - Wait for transaction

**Expected Result:**
```
✅ Withdrawn 25 USDC from Senior Vault!
New Position: $75
USDC Balance: [increased by 25]
```

**Check Indexer logs:**
```
💸 senior vault withdrawal: 25.0 USDC by 0xYourAddress
```

**✅ Pass if:**
- Withdrawal successful
- Position decreases
- USDC balance increases
- Indexer tracks event

---

### 5.6 Test Real-Time Balance Updates

**Test live updates:**

1. **Keep investor page open**
2. **Open Terminal 2 (Indexer)** - watch logs
3. **Make a deposit from another wallet** (optional)
4. **Refresh page** → TVL should update
5. **Check your position** → Should persist

**✅ Pass if:** All data stays consistent across refreshes

---

## 📊 STEP 6: Test Dashboard

Navigate to: http://localhost:3000/dashboard

### 6.1 Test Key Metrics Cards

**Top row should show:**

1. **Total Value Locked:** Sum of both vaults (e.g., `$625`)
2. **Total Invoices:** Number minted (e.g., `2`)
3. **Funded Value:** Total funded amount
4. **Default Rate:** % of defaulted invoices (should be `0%` initially)

**✅ Pass if:** All metrics display accurate numbers

---

### 6.2 Test TVL Chart

**Line chart showing TVL over time:**

- X-axis: Dates (last 5 days)
- Y-axis: TVL in dollars
- Line should trend upward if you made deposits

**Hover over data points** → Should show tooltip with exact value

**✅ Pass if:** Chart renders, shows data, tooltip works

---

### 6.3 Test APY Chart

**Dual-line chart:**

- Green line: Senior Vault APY (8%)
- Purple line: Junior Vault APY (20%)
- Should be relatively flat (target APYs)

**✅ Pass if:** Both lines display correctly

---

### 6.4 Test Invoice Distribution Pie Chart

**Shows invoices by status:**

- PENDING (orange)
- VERIFIED (blue)
- FUNDED (purple)
- PAID (green)
- DEFAULTED (red)

**Each slice shows:** `STATUS: count`

**✅ Pass if:**
- Pie chart renders
- Shows correct distribution
- Colors match statuses

---

### 6.5 Test Vault Statistics Panel

**Shows for each vault:**

- TVL amount
- APY percentage
- Total shares issued

**Example:**
```
Senior Vault
├─ TVL: $500
├─ APY: 8%
└─ Shares: 500

Junior Vault
├─ TVL: $200
├─ APY: 20%
└─ Shares: 200
```

**✅ Pass if:** All stats match actual contract data

---

### 6.6 Test Invoice List with Filters

**Invoice table shows:**

- Token ID
- Debtor Name
- Face Value
- Discounted Value
- Maturity Date
- Status (color badge)

**Test Filters:**

1. **Click "All Statuses" dropdown**
2. **Select "PENDING"** → Only pending invoices show
3. **Select "VERIFIED"** → Only verified invoices show
4. **Select "ALL"** → Shows all again

**Test Table:**
- Click column headers → No errors (sorting not implemented yet, but should not break)
- Hover over rows → Should highlight
- All data should be formatted correctly

**✅ Pass if:**
- Table displays all invoices
- Filters work correctly
- No console errors

---

## 🔗 STEP 7: Test API Endpoints

Open a new terminal and test the indexer API:

### 7.1 Test Platform Stats
```bash
curl http://localhost:3001/api/stats/platform | jq
```

**Expected Response:**
```json
{
  "totalTVL": "700000000",
  "seniorTVL": "500000000",
  "juniorTVL": "200000000",
  "total_invoices": 2,
  "funded_invoices": 0,
  "paid_invoices": 0,
  "defaulted_invoices": 0,
  "total_funded_value": "0",
  "total_paid_value": "0"
}
```

---

### 7.2 Test Invoice Query
```bash
curl http://localhost:3001/api/invoices | jq
```

**Expected Response:**
```json
{
  "invoices": [
    {
      "tokenId": 1,
      "issuer": "0x...",
      "debtor": "0x...",
      "debtorName": "Acme Corporation",
      "faceValue": "100000000000",
      "status": "VERIFIED",
      ...
    }
  ],
  "total": 1
}
```

---

### 7.3 Test Vault Deposits
```bash
curl http://localhost:3001/api/vaults/senior/deposits | jq
```

**Expected Response:**
```json
{
  "deposits": [
    {
      "id": 1,
      "vaultType": "senior",
      "depositor": "0x...",
      "assets": "100000000",
      "shares": "100000000000000000000",
      ...
    }
  ],
  "total": 1
}
```

**✅ Pass if:** All API endpoints return correct data

---

## 🎯 STEP 8: End-to-End Test Flow

**Complete business-to-investor flow:**

### Scenario: Business needs $50k for 60-day invoice

1. **As Business (Tab 1):**
   - Go to `/business`
   - Verify KYC
   - Upload invoice PDF
   - Mint invoice: $50k, 60 days, 5% discount
   - Receive $47.5k worth of USDC (simulated)
   - **Wait for Oracle to verify**

2. **Check Oracle (Terminal 1):**
   ```
   📄 Invoice minted: Token ID 3
   ⏰ Verifying...
   ✅ Invoice verified: Token ID 3
   ```

3. **As Investor (Tab 2):**
   - Go to `/investor`
   - Verify KYC
   - Claim 1000 test USDC
   - Deposit $50 to Junior Vault (higher risk, 20% APY)
   - View position

4. **Check Dashboard (Tab 3):**
   - Go to `/dashboard`
   - See TVL increased by $50
   - See new invoice in list (status: VERIFIED)
   - Charts updated

5. **Check Indexer (Terminal 2):**
   ```
   📄 Invoice minted: Token ID 3
   💵 junior vault deposit: 50.0 USDC
   ```

6. **Check Database (Optional):**
   ```bash
   cd indexer-service
   npm run db:studio
   ```
   - Opens Prisma Studio at http://localhost:5555
   - Browse `invoices` table → See new invoice
   - Browse `vault_deposits` → See deposit record

**✅ Pass if:** Entire flow completes without errors

---

## 🐛 STEP 9: Error Handling Tests

### Test Network Errors

1. **Disconnect wallet** while on any page
   - Should show "Connect Wallet" prompt
   - No crash

2. **Switch to wrong network** (e.g., Ethereum Mainnet)
   - Should show "Wrong Network" warning
   - Prompt to switch back

3. **Try to mint without KYC**
   - Should show error: "KYC required"
   - Prompt to complete KYC first

4. **Try to deposit without approval**
   - Should show "Approve USDC" button first
   - Only show "Deposit" after approval

5. **Try to withdraw more than balance**
   - Should show error
   - Transaction should fail gracefully

**✅ Pass if:** All errors handled gracefully, no crashes

---

## 📱 STEP 10: Responsive Design Test

**Test on different screen sizes:**

1. **Desktop (1920x1080):**
   - Full navigation bar
   - 4-column stats grid
   - Side-by-side charts
   - Full table visible

2. **Tablet (768px):**
   - Press F12 → Toggle device toolbar
   - Set to iPad
   - Should stack into 2 columns
   - Navigation should work

3. **Mobile (375px):**
   - Set to iPhone SE
   - Should stack into 1 column
   - Hamburger menu (if implemented)
   - Tables should scroll horizontally

**✅ Pass if:** UI adapts to different screen sizes

---

## ✅ FINAL CHECKLIST

After testing everything, verify:

- [ ] All 3 services running (Oracle, Indexer, Frontend)
- [ ] Wallet connected to Mantle Sepolia
- [ ] Home page loads and displays stats
- [ ] Business KYC verification works
- [ ] Invoice minting works (with and without PDF)
- [ ] Oracle auto-verifies invoices (check Terminal 1)
- [ ] IPFS upload works and PDF accessible
- [ ] My Invoices list displays correctly
- [ ] Investor KYC verification works
- [ ] USDC faucet works
- [ ] Senior vault deposit/withdraw works
- [ ] Junior vault deposit/withdraw works
- [ ] Dashboard displays all charts
- [ ] Invoice list filters work
- [ ] Indexer API endpoints respond
- [ ] Indexer logs all events (check Terminal 2)
- [ ] Database stores data (check Prisma Studio)
- [ ] Error handling works (try edge cases)
- [ ] No console errors in browser
- [ ] Responsive on mobile/tablet

---

## 🎬 RECORDING DEMO VIDEO

**When recording, show:**

1. **Intro (30 sec):**
   - Show Mantle Explorer with deployed contracts
   - Explain the problem (invoice factoring)

2. **Smart Contracts (1 min):**
   - Show contract addresses
   - Show verified code on explorer
   - Mention real ZK proofs

3. **Business Flow (2 min):**
   - Connect wallet
   - Complete KYC
   - Upload invoice PDF (show IPFS)
   - Mint invoice
   - Show Oracle auto-verify (Terminal)

4. **Investor Flow (1.5 min):**
   - Get test USDC
   - Deposit to vaults
   - Show real-time position

5. **Dashboard (1 min):**
   - Show TVL chart
   - Show invoice distribution
   - Filter invoices

6. **Backend (30 sec):**
   - Show Indexer logs
   - Show API response
   - Show Prisma Studio (database)

7. **Outro (30 sec):**
   - Recap features
   - Mention tech stack
   - Show GitHub repo

**Total: 6-7 minutes**

---

## 🆘 TROUBLESHOOTING

### Frontend won't start
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run dev
```

### Indexer won't connect to Supabase
```bash
cd indexer-service
cat .env  # Verify DATABASE_URL
npx prisma db push  # Re-push schema
```

### Oracle not verifying
- Check Terminal 1 for errors
- Verify RPC connection
- Restart: `npm run oracle:start`

### MetaMask transaction fails
- Check you have test MNT for gas
- Verify you're on Mantle Sepolia (Chain ID: 5003)
- Try increasing gas limit

### IPFS upload fails
- Check .env.local has PINATA_JWT
- Verify JWT token is valid
- Check file size < 10MB

---

**🎉 TESTING COMPLETE!**

If all tests pass, your project is ready for:
- ✅ Hackathon demo
- ✅ Video recording
- ✅ Live presentation
- ✅ Submission

Good luck! 🚀
