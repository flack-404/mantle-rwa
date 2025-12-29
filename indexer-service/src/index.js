require('dotenv').config();
const { ethers } = require('ethers');
const EventListener = require('./eventListener');
const { startAPI } = require('./api');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

// Contract addresses and ABIs
const deploymentPath = path.join(__dirname, '../../deployments/deployment-5003.json');
const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

const InvoiceNFTABI = require('../../artifacts/contracts/InvoiceNFT.sol/InvoiceNFT.json').abi;
const KYCGateABI = require('../../artifacts/contracts/KYCGate.sol/KYCGate.json').abi;
const TrancheVaultABI = require('../../artifacts/contracts/TrancheVault.sol/TrancheVault.json').abi;
const ZKKYCVerifierABI = require('../../artifacts/contracts/ZKKYCVerifier.sol/ZKKYCVerifier.json').abi;

class IndexerService {
  constructor() {
    this.provider = null;
    this.contracts = {};
    this.eventListener = null;
    this.apiServer = null;
  }

  async initialize() {
    try {
      logger.info('🚀 Initializing Indexer Service...');

      // Connect to Mantle Sepolia
      const rpcUrl = process.env.MANTLE_RPC_URL || 'https://rpc.sepolia.mantle.xyz';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      logger.info(`📡 Connected to Mantle Sepolia: ${rpcUrl}`);

      // Initialize contracts
      this.contracts = {
        invoiceNFT: new ethers.Contract(
          deployment.invoiceNFT,
          InvoiceNFTABI,
          this.provider
        ),
        kycGate: new ethers.Contract(
          deployment.kycGate,
          KYCGateABI,
          this.provider
        ),
        seniorVault: new ethers.Contract(
          deployment.seniorVault,
          TrancheVaultABI,
          this.provider
        ),
        juniorVault: new ethers.Contract(
          deployment.juniorVault,
          TrancheVaultABI,
          this.provider
        ),
        zkKYCVerifier: new ethers.Contract(
          deployment.zkKYCVerifier,
          ZKKYCVerifierABI,
          this.provider
        ),
      };

      logger.info('✅ Contracts initialized');
      logger.info(`   InvoiceNFT: ${deployment.invoiceNFT}`);
      logger.info(`   KYCGate: ${deployment.kycGate}`);
      logger.info(`   Senior Vault: ${deployment.seniorVault}`);
      logger.info(`   Junior Vault: ${deployment.juniorVault}`);

      // Start event listener
      this.eventListener = new EventListener(this.provider, this.contracts);
      await this.eventListener.start();

      // Start API server
      const apiPort = process.env.API_PORT || 3001;
      this.apiServer = await startAPI(apiPort);

      logger.info('✅ Indexer Service started successfully!');
      logger.info(`📊 API available at http://localhost:${apiPort}`);
      logger.info('\n🎯 Available endpoints:');
      logger.info('   GET /api/invoices - Get all invoices');
      logger.info('   GET /api/invoices/:tokenId - Get specific invoice');
      logger.info('   GET /api/vaults/:type/deposits - Get vault deposits');
      logger.info('   GET /api/vaults/:type/withdrawals - Get vault withdrawals');
      logger.info('   GET /api/stats/platform - Get platform statistics');
      logger.info('   GET /api/stats/tvl-history - Get TVL history');
      logger.info('   GET /api/kyc/:address - Get KYC status');
    } catch (error) {
      logger.error('❌ Failed to initialize indexer service:', error);
      throw error;
    }
  }

  async shutdown() {
    logger.info('🛑 Shutting down Indexer Service...');

    if (this.eventListener) {
      await this.eventListener.stop();
    }

    if (this.apiServer) {
      this.apiServer.close(() => {
        logger.info('API server closed');
      });
    }

    logger.info('Indexer Service shut down');
    process.exit(0);
  }
}

// Main execution
async function main() {
  const service = new IndexerService();

  try {
    await service.initialize();

    // Graceful shutdown handlers
    process.on('SIGINT', () => service.shutdown());
    process.on('SIGTERM', () => service.shutdown());
  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
