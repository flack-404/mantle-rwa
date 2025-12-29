const { ethers } = require('ethers');
const prisma = require('./prisma');
const logger = require('../config/logger');

class EventListener {
  constructor(provider, contracts) {
    this.provider = provider;
    this.contracts = contracts;
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Event listener already running');
      return;
    }

    this.isRunning = true;
    logger.info('🎧 Starting event listener...');

    try {
      // Listen to InvoiceNFT events
      await this.listenToInvoiceEvents();

      // Listen to Vault events
      await this.listenToVaultEvents();

      // Listen to KYC events
      await this.listenToKYCEvents();

      logger.info('✅ All event listeners started successfully');
    } catch (error) {
      logger.error('Error starting event listeners:', error);
      this.isRunning = false;
    }
  }

  async listenToInvoiceEvents() {
    const { invoiceNFT } = this.contracts;

    // InvoiceMinted event
    invoiceNFT.on('InvoiceMinted', async (tokenId, issuer, faceValue, debtor, event) => {
      try {
        const block = await event.getBlock();
        const invoice = await invoiceNFT.getInvoice(tokenId);

        await prisma.invoice.upsert({
          where: { tokenId: Number(tokenId) },
          update: {},
          create: {
            tokenId: Number(tokenId),
            issuer,
            debtor,
            debtorName: invoice.debtorName,
            faceValue: invoice.faceValue.toString(),
            discountedValue: invoice.discountedValue.toString(),
            discountRate: Number(invoice.discountRate),
            maturityDate: invoice.maturityDate.toString(),
            invoiceHash: invoice.invoiceHash,
            status: this.getStatusString(invoice.status),
            mintedAt: block.timestamp.toString(),
            mintedTx: event.transactionHash,
            blockNumber: event.blockNumber.toString(),
          },
        });

        logger.info(`📄 Invoice minted: Token ID ${tokenId}`);
      } catch (error) {
        logger.error('Error handling InvoiceMinted event:', error);
      }
    });

    // InvoiceVerified event
    invoiceNFT.on('InvoiceVerified', async (tokenId, event) => {
      try {
        const block = await event.getBlock();

        await prisma.invoice.update({
          where: { tokenId: Number(tokenId) },
          data: {
            status: 'VERIFIED',
            verifiedAt: block.timestamp.toString(),
          },
        });

        logger.info(`✅ Invoice verified: Token ID ${tokenId}`);
      } catch (error) {
        logger.error('Error handling InvoiceVerified event:', error);
      }
    });

    // InvoiceFunded event
    invoiceNFT.on('InvoiceFunded', async (tokenId, vault, amount, event) => {
      try {
        const block = await event.getBlock();

        await prisma.invoice.update({
          where: { tokenId: Number(tokenId) },
          data: {
            status: 'FUNDED',
            fundedAt: block.timestamp.toString(),
          },
        });

        logger.info(`💰 Invoice funded: Token ID ${tokenId}, Amount: ${ethers.formatUnits(amount, 6)} USDC`);
      } catch (error) {
        logger.error('Error handling InvoiceFunded event:', error);
      }
    });

    // InvoiceRepaid event
    invoiceNFT.on('InvoiceRepaid', async (tokenId, payer, amount, event) => {
      try {
        const block = await event.getBlock();

        await prisma.invoice.update({
          where: { tokenId: Number(tokenId) },
          data: {
            status: 'PAID',
            paidAt: block.timestamp.toString(),
          },
        });

        logger.info(`✅ Invoice repaid: Token ID ${tokenId}`);
      } catch (error) {
        logger.error('Error handling InvoiceRepaid event:', error);
      }
    });

    // InvoiceDefaulted event
    invoiceNFT.on('InvoiceDefaulted', async (tokenId, event) => {
      try {
        await prisma.invoice.update({
          where: { tokenId: Number(tokenId) },
          data: { status: 'DEFAULTED' },
        });

        logger.warn(`⚠️ Invoice defaulted: Token ID ${tokenId}`);
      } catch (error) {
        logger.error('Error handling InvoiceDefaulted event:', error);
      }
    });
  }

  async listenToVaultEvents() {
    const { seniorVault, juniorVault } = this.contracts;

    const handleDeposit = (vault, vaultType) => {
      return async (caller, owner, assets, shares, event) => {
        try {
          const block = await event.getBlock();

          await prisma.vaultDeposit.create({
            data: {
              vaultAddress: vault.target,
              vaultType,
              depositor: owner,
              assets: assets.toString(),
              shares: shares.toString(),
              txHash: event.transactionHash,
              blockNumber: event.blockNumber.toString(),
              timestamp: block.timestamp.toString(),
            },
          });

          logger.info(`💵 ${vaultType} vault deposit: ${ethers.formatUnits(assets, 6)} USDC by ${owner}`);
        } catch (error) {
          logger.error(`Error handling ${vaultType} Deposit event:`, error);
        }
      };
    };

    const handleWithdraw = (vault, vaultType) => {
      return async (caller, receiver, owner, assets, shares, event) => {
        try {
          const block = await event.getBlock();

          await prisma.vaultWithdrawal.create({
            data: {
              vaultAddress: vault.target,
              vaultType,
              withdrawer: owner,
              assets: assets.toString(),
              shares: shares.toString(),
              txHash: event.transactionHash,
              blockNumber: event.blockNumber.toString(),
              timestamp: block.timestamp.toString(),
            },
          });

          logger.info(`💸 ${vaultType} vault withdrawal: ${ethers.formatUnits(assets, 6)} USDC by ${owner}`);
        } catch (error) {
          logger.error(`Error handling ${vaultType} Withdraw event:`, error);
        }
      };
    };

    seniorVault.on('Deposit', handleDeposit(seniorVault, 'senior'));
    seniorVault.on('Withdraw', handleWithdraw(seniorVault, 'senior'));
    juniorVault.on('Deposit', handleDeposit(juniorVault, 'junior'));
    juniorVault.on('Withdraw', handleWithdraw(juniorVault, 'junior'));
  }

  async listenToKYCEvents() {
    const { kycGate, zkKYCVerifier } = this.contracts;

    // KYCVerified event (standard KYC)
    kycGate.on('KYCVerified', async (user, verifiedAt, expiresAt, tier, riskScore, event) => {
      try {
        const kycData = await kycGate.getUserKYC(user);

        await prisma.kycVerification.upsert({
          where: { userAddress: user },
          update: {
            verifiedAt: verifiedAt.toString(),
            expiresAt: expiresAt.toString(),
            tier: Number(tier),
            riskScore: Number(riskScore),
          },
          create: {
            userAddress: user,
            verifiedAt: verifiedAt.toString(),
            expiresAt: expiresAt.toString(),
            countryHash: kycData.countryHash || '',
            riskScore: Number(riskScore),
            kycId: kycData.kycId || '',
            tier: Number(tier),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber.toString(),
          },
        });

        logger.info(`🔐 User KYC verified: ${user}`);
      } catch (error) {
        logger.error('Error handling KYCVerified event:', error);
      }
    });

    // ZKProofVerified event (ZK-KYC)
    if (zkKYCVerifier) {
      zkKYCVerifier.on('ZKProofVerified', async (user, nullifier, commitment, verifiedAt, expiresAt, event) => {
        try {
          await prisma.zkKycProof.create({
            data: {
              userAddress: user,
              nullifier,
              commitment,
              providerHash: '',
              expiresAt: expiresAt.toString(),
              txHash: event.transactionHash,
              blockNumber: event.blockNumber.toString(),
              timestamp: verifiedAt.toString(),
            },
          });

          logger.info(`🔒 ZK-KYC proof verified: ${user}`);
        } catch (error) {
          logger.error('Error handling ZKProofVerified event:', error);
        }
      });
    }
  }

  getStatusString(status) {
    const statuses = ['PENDING', 'VERIFIED', 'FUNDED', 'PAID', 'DEFAULTED'];
    return statuses[Number(status)] || 'UNKNOWN';
  }

  async stop() {
    if (!this.isRunning) return;

    logger.info('Stopping event listener...');

    // Remove all listeners
    Object.values(this.contracts).forEach(contract => {
      if (contract) contract.removeAllListeners();
    });

    this.isRunning = false;
    logger.info('Event listener stopped');
  }
}

module.exports = EventListener;
