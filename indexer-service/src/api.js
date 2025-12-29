const express = require('express');
const cors = require('cors');
const prisma = require('./prisma');
const logger = require('../config/logger');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mantle-rwa-indexer' });
});

// Get all invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const { status, issuer, limit = 100, offset = 0 } = req.query;

    const where = {};
    if (status) where.status = status.toUpperCase();
    if (issuer) where.issuer = issuer;

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { mintedAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    res.json({
      invoices,
      total: invoices.length,
    });
  } catch (error) {
    logger.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single invoice by token ID
app.get('/api/invoices/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { tokenId: parseInt(tokenId) },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    logger.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get vault deposits
app.get('/api/vaults/:vaultType/deposits', async (req, res) => {
  try {
    const { vaultType } = req.params;
    const { depositor, limit = 100, offset = 0 } = req.query;

    const where = { vaultType };
    if (depositor) where.depositor = depositor;

    const deposits = await prisma.vaultDeposit.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    res.json({
      deposits,
      total: deposits.length,
    });
  } catch (error) {
    logger.error('Error fetching deposits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get vault withdrawals
app.get('/api/vaults/:vaultType/withdrawals', async (req, res) => {
  try {
    const { vaultType } = req.params;
    const { withdrawer, limit = 100, offset = 0 } = req.query;

    const where = { vaultType };
    if (withdrawer) where.withdrawer = withdrawer;

    const withdrawals = await prisma.vaultWithdrawal.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    res.json({
      withdrawals,
      total: withdrawals.length,
    });
  } catch (error) {
    logger.error('Error fetching withdrawals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get platform statistics
app.get('/api/stats/platform', async (req, res) => {
  try {
    const [invoices, seniorDeposits, juniorDeposits] = await Promise.all([
      prisma.invoice.findMany(),
      prisma.vaultDeposit.findMany({ where: { vaultType: 'senior' } }),
      prisma.vaultDeposit.findMany({ where: { vaultType: 'junior' } }),
    ]);

    const totalInvoices = invoices.length;
    const fundedInvoices = invoices.filter(i => i.status === 'FUNDED').length;
    const paidInvoices = invoices.filter(i => i.status === 'PAID').length;
    const defaultedInvoices = invoices.filter(i => i.status === 'DEFAULTED').length;

    const totalFundedValue = invoices
      .filter(i => i.status === 'FUNDED')
      .reduce((sum, i) => sum + BigInt(i.faceValue), 0n);

    const totalPaidValue = invoices
      .filter(i => i.status === 'PAID')
      .reduce((sum, i) => sum + BigInt(i.faceValue), 0n);

    const seniorTVL = seniorDeposits.reduce((sum, d) => sum + BigInt(d.assets), 0n);
    const juniorTVL = juniorDeposits.reduce((sum, d) => sum + BigInt(d.assets), 0n);
    const totalTVL = seniorTVL + juniorTVL;

    res.json({
      totalTVL: totalTVL.toString(),
      seniorTVL: seniorTVL.toString(),
      juniorTVL: juniorTVL.toString(),
      total_invoices: totalInvoices,
      funded_invoices: fundedInvoices,
      paid_invoices: paidInvoices,
      defaulted_invoices: defaultedInvoices,
      total_funded_value: totalFundedValue.toString(),
      total_paid_value: totalPaidValue.toString(),
    });
  } catch (error) {
    logger.error('Error fetching platform stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get historical TVL data
app.get('/api/stats/tvl-history', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const cutoffTime = Math.floor(Date.now() / 1000) - parseInt(days) * 24 * 60 * 60;

    const history = await prisma.platformStat.findMany({
      where: {
        timestamp: {
          gte: cutoffTime.toString(),
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    res.json({ history });
  } catch (error) {
    logger.error('Error fetching TVL history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's KYC status
app.get('/api/kyc/:address', async (req, res) => {
  try {
    const { address } = req.params;

    const kyc = await prisma.kycVerification.findUnique({
      where: { userAddress: address },
    });

    if (!kyc) {
      return res.json({ verified: false });
    }

    const isExpired = BigInt(kyc.expiresAt) < BigInt(Math.floor(Date.now() / 1000));

    res.json({
      verified: !isExpired,
      ...kyc,
      isExpired,
    });
  } catch (error) {
    logger.error('Error fetching KYC status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invoice statistics by status
app.get('/api/stats/invoices', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany();

    const byStatus = {};
    invoices.forEach(invoice => {
      if (!byStatus[invoice.status]) {
        byStatus[invoice.status] = { status: invoice.status, count: 0, total_value: 0n };
      }
      byStatus[invoice.status].count++;
      byStatus[invoice.status].total_value += BigInt(invoice.faceValue);
    });

    res.json({
      byStatus: Object.values(byStatus).map(s => ({
        ...s,
        total_value: s.total_value.toString(),
      })),
    });
  } catch (error) {
    logger.error('Error fetching invoice stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function startAPI(port = 3001) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info(`🚀 API server running on http://localhost:${port}`);
      resolve(server);
    }).on('error', reject);
  });
}

module.exports = { app, startAPI };
