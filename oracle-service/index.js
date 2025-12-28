/**
 * Oracle Service for Mantle RWA Invoice Factoring
 *
 * This service:
 * - Listens for new invoice mints
 * - Verifies invoices (mock verification for hackathon)
 * - Monitors payment statuses
 * - Records payments on-chain
 *
 * Architecture:
 * - Modular data source (mock for now, can swap to real APIs)
 * - Event-driven processing
 * - Automatic retry logic
 */

require('dotenv').config({ path: '../.env' });
const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const MockDataSource = require('./dataSources/mockDataSource');

// Load contract ABIs
const InvoiceNFT_ABI = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../artifacts/contracts/InvoiceNFT.sol/InvoiceNFT.json')
  )
).abi;

class OracleService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.invoiceNFT = null;
    this.dataSource = null;
    this.isRunning = false;
    this.verificationInterval = 30000; // 30 seconds
    this.paymentCheckInterval = 60000;  // 60 seconds
  }

  async initialize() {
    logger.info('🚀 Initializing Oracle Service...');

    // Load deployment addresses
    const deploymentsDir = path.join(__dirname, '../deployments');
    const files = fs.readdirSync(deploymentsDir);

    if (files.length === 0) {
      throw new Error('No deployment files found. Deploy contracts first.');
    }

    const latestDeployment = files.sort().reverse()[0];
    const deploymentPath = path.join(deploymentsDir, latestDeployment);
    const addresses = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));

    logger.info(`📋 Loaded deployment: ${latestDeployment}`);

    // Setup provider and wallet
    const rpcUrl = process.env.MANTLE_RPC_URL || 'https://rpc.testnet.mantle.xyz';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    const privateKey = process.env.ORACLE_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('ORACLE_PRIVATE_KEY or PRIVATE_KEY not found in .env');
    }

    this.wallet = new ethers.Wallet(privateKey, this.provider);
    logger.info(`🔑 Oracle wallet: ${this.wallet.address}`);

    // Connect to contracts
    this.invoiceNFT = new ethers.Contract(
      addresses.invoiceNFT,
      InvoiceNFT_ABI,
      this.wallet
    );

    logger.info(`📝 Connected to InvoiceNFT: ${addresses.invoiceNFT}`);

    // Initialize data source (mock for hackathon)
    this.dataSource = new MockDataSource();
    logger.info('📊 Using Mock Data Source (replaceable with real APIs)');

    logger.info('✅ Oracle Service initialized successfully\n');
  }

  async start() {
    if (this.isRunning) {
      logger.warn('⚠️  Oracle service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('▶️  Starting Oracle Service...\n');

    // Start event listeners
    this.listenForNewInvoices();

    // Start periodic tasks
    this.startPeriodicVerification();
    this.startPeriodicPaymentChecks();

    logger.info('✅ Oracle Service is now running\n');
    logger.info('📊 Monitoring invoice events...');
    logger.info('⏱️  Verification check every 30s');
    logger.info('⏱️  Payment check every 60s\n');
  }

  /**
   * Listen for new invoice mints
   */
  listenForNewInvoices() {
    this.invoiceNFT.on('InvoiceMinted', async (tokenId, issuer, faceValue, discountedValue, maturityDate, invoiceHash) => {
      logger.info(`\n🔔 NEW INVOICE MINTED`);
      logger.info(`   Token ID: ${tokenId}`);
      logger.info(`   Issuer: ${issuer}`);
      logger.info(`   Face Value: ${ethers.formatUnits(faceValue, 6)} USDC`);
      logger.info(`   Discounted: ${ethers.formatUnits(discountedValue, 6)} USDC`);
      logger.info(`   Maturity: ${new Date(Number(maturityDate) * 1000).toISOString()}`);

      // Queue for verification (will be picked up by periodic task)
      logger.info(`   ⏳ Queued for verification...\n`);
    });
  }

  /**
   * Periodic verification of pending invoices
   */
  async startPeriodicVerification() {
    setInterval(async () => {
      try {
        await this.verifyPendingInvoices();
      } catch (error) {
        logger.error('Error in periodic verification:', error);
      }
    }, this.verificationInterval);
  }

  /**
   * Verify all pending invoices
   */
  async verifyPendingInvoices() {
    try {
      const totalSupply = await this.invoiceNFT.getStatistics();
      const total = Number(totalSupply[4]); // totalSupply is 5th return value

      for (let tokenId = 1; tokenId <= total; tokenId++) {
        const invoice = await this.invoiceNFT.getInvoice(tokenId);

        // Status 0 = PENDING
        if (Number(invoice.status) === 0) {
          logger.info(`\n🔍 Verifying invoice #${tokenId}...`);

          // Check with data source (mock)
          const isValid = await this.dataSource.verifyInvoice({
            tokenId: tokenId.toString(),
            faceValue: invoice.faceValue.toString(),
            debtor: invoice.debtor,
            invoiceHash: invoice.invoiceHash,
          });

          if (isValid) {
            logger.info(`   ✅ Invoice verified by data source`);
            logger.info(`   📝 Recording verification on-chain...`);

            const tx = await this.invoiceNFT.verifyInvoice(tokenId);
            await tx.wait();

            logger.info(`   ✅ Verification recorded!`);
            logger.info(`   TX: ${tx.hash}\n`);
          } else {
            logger.warn(`   ❌ Invoice failed verification\n`);
          }
        }
      }
    } catch (error) {
      if (!error.message.includes('Invoice does not exist')) {
        logger.error('Error verifying invoices:', error.message);
      }
    }
  }

  /**
   * Periodic payment status checks
   */
  async startPeriodicPaymentChecks() {
    setInterval(async () => {
      try {
        await this.checkPaymentStatuses();
      } catch (error) {
        logger.error('Error in periodic payment checks:', error);
      }
    }, this.paymentCheckInterval);
  }

  /**
   * Check payment status for funded invoices
   */
  async checkPaymentStatuses() {
    try {
      const totalSupply = await this.invoiceNFT.getStatistics();
      const total = Number(totalSupply[4]);

      for (let tokenId = 1; tokenId <= total; tokenId++) {
        const invoice = await this.invoiceNFT.getInvoice(tokenId);

        // Status 2 = FUNDED or 5 = PARTIAL_PAID
        const status = Number(invoice.status);
        if (status === 2 || status === 5) {
          // Check payment status with data source (mock)
          const paymentInfo = await this.dataSource.checkPaymentStatus({
            tokenId: tokenId.toString(),
            debtor: invoice.debtor,
            faceValue: invoice.faceValue.toString(),
          });

          if (paymentInfo.hasPaid && paymentInfo.amount > 0) {
            logger.info(`\n💰 PAYMENT DETECTED for invoice #${tokenId}`);
            logger.info(`   Amount: ${ethers.formatUnits(paymentInfo.amount, 6)} USDC`);
            logger.info(`   📝 Recording payment on-chain...`);

            const tx = await this.invoiceNFT.recordPayment(tokenId, paymentInfo.amount);
            await tx.wait();

            logger.info(`   ✅ Payment recorded!`);
            logger.info(`   TX: ${tx.hash}\n`);
          }

          // Check if defaulted (past maturity without payment)
          const now = Math.floor(Date.now() / 1000);
          const maturity = Number(invoice.maturityDate);

          if (now > maturity && Number(invoice.paidAmount) < Number(invoice.faceValue)) {
            logger.warn(`\n⚠️  INVOICE DEFAULTED: #${tokenId}`);
            logger.warn(`   Maturity date passed without full payment`);
            logger.warn(`   📝 Marking as defaulted...`);

            const tx = await this.invoiceNFT.markAsDefaulted(tokenId);
            await tx.wait();

            logger.warn(`   ❌ Marked as DEFAULTED`);
            logger.warn(`   TX: ${tx.hash}\n`);
          }
        }
      }
    } catch (error) {
      if (!error.message.includes('Invoice does not exist')) {
        logger.error('Error checking payments:', error.message);
      }
    }
  }

  stop() {
    this.isRunning = false;
    logger.info('⏹️  Oracle Service stopped');
  }
}

// Main execution
async function main() {
  const oracle = new OracleService();

  try {
    await oracle.initialize();
    await oracle.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
      logger.info('\n\n🛑 Shutting down Oracle Service...');
      oracle.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('\n\n🛑 Shutting down Oracle Service...');
      oracle.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('❌ Failed to start Oracle Service:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = OracleService;
