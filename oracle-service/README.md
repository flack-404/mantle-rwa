# Oracle Service

Production-ready Oracle service for invoice verification and payment tracking.

## Features

- ✅ Event-driven invoice verification
- ✅ Automatic payment monitoring
- ✅ Default detection
- ✅ Modular data source architecture
- ✅ Comprehensive logging
- ✅ Automatic retry logic

## Architecture

```
oracle-service/
├── index.js                    # Main oracle service
├── logger.js                   # Winston logger
├── dataSources/
│   ├── mockDataSource.js       # Mock data (HACKATHON)
│   ├── quickbooksSource.js     # QuickBooks API (TODO)
│   ├── xeroSource.js           # Xero API (TODO)
│   └── sapSource.js            # SAP integration (TODO)
└── logs/                       # Log files
```

## Mock Data Source (Current)

For the hackathon, we use a **mock data source** that simulates real-world behavior:

### What it simulates:
- Invoice verification (95% success rate)
- Payment delays (10s - 2min)
- Partial payments (10% of cases)
- Defaults (30% of invoices)

### Configuration:
```javascript
// oracle-service/dataSources/mockDataSource.js
this.verificationSuccessRate = 0.95; // 95% success
this.paymentProbability = 0.7;       // 70% get paid
this.minPaymentDelay = 10000;        // 10 seconds
this.maxPaymentDelay = 120000;       // 2 minutes
```

## Replacing with Real Data Source

To use real APIs (QuickBooks, Xero, banking APIs), create a new data source:

### 1. Create new data source file

```javascript
// oracle-service/dataSources/quickbooksSource.js
const QuickBooks = require('node-quickbooks');

class QuickBooksDataSource {
  constructor(config) {
    this.qb = new QuickBooks(config);
  }

  async verifyInvoice(invoice) {
    // Real API call to QuickBooks
    const qbInvoice = await this.qb.findInvoices({
      Id: invoice.invoiceHash
    });

    if (!qbInvoice) return false;

    // Verify amounts match
    return qbInvoice.TotalAmt === parseFloat(invoice.faceValue);
  }

  async checkPaymentStatus(invoice) {
    // Check payment in QuickBooks
    const payments = await this.qb.findPayments({
      InvoiceId: invoice.invoiceHash
    });

    if (payments.length === 0) {
      return { hasPaid: false, amount: 0 };
    }

    const totalPaid = payments.reduce((sum, p) => sum + p.TotalAmt, 0);

    return {
      hasPaid: true,
      amount: BigInt(Math.floor(totalPaid * 1e6)).toString(), // Convert to USDC units
      paidAt: payments[0].TxnDate
    };
  }
}

module.exports = QuickBooksDataSource;
```

### 2. Update oracle service

```javascript
// oracle-service/index.js

// Change this line:
const MockDataSource = require('./dataSources/mockDataSource');

// To this:
const QuickBooksDataSource = require('./dataSources/quickbooksSource');

// And in initialize():
this.dataSource = new QuickBooksDataSource({
  consumerKey: process.env.QB_CONSUMER_KEY,
  consumerSecret: process.env.QB_CONSUMER_SECRET,
  // ... other config
});
```

### 3. Add API credentials to .env

```bash
QB_CONSUMER_KEY=your_key
QB_CONSUMER_SECRET=your_secret
QB_ACCESS_TOKEN=your_token
```

That's it! The interface stays the same, only the data source changes.

## Running the Oracle

### Development
```bash
cd oracle-service
npm install
npm run dev
```

### Production
```bash
npm start
```

### Environment Variables
```bash
# Required
MANTLE_RPC_URL=https://rpc.testnet.mantle.xyz
ORACLE_PRIVATE_KEY=your_oracle_private_key

# Optional
VERIFICATION_INTERVAL=30000   # 30s
PAYMENT_CHECK_INTERVAL=60000  # 60s
```

## Logs

Logs are written to:
- Console (with colors)
- `oracle-service/logs/oracle.log` (JSON format)

## Event Flow

1. **Invoice Minted** → Oracle listens via event
2. **Verification Check** → Every 30s, check pending invoices
3. **Verify with Data Source** → Call verifyInvoice()
4. **Record Verification** → Call contract.verifyInvoice()
5. **Payment Monitoring** → Every 60s, check funded invoices
6. **Check Payment Status** → Call checkPaymentStatus()
7. **Record Payment** → Call contract.recordPayment()
8. **Default Detection** → If past maturity, mark as defaulted

## Testing

To test with different scenarios:

```javascript
// Modify mockDataSource.js
this.verificationSuccessRate = 1.0;  // All invoices verify
this.paymentProbability = 1.0;       // All get paid
this.minPaymentDelay = 5000;         // Fast payments
```

## Production Considerations

For production deployment:

1. **Use real data sources** (QuickBooks, Xero, banking APIs)
2. **Add retry logic** for failed API calls
3. **Implement rate limiting** to avoid API throttling
4. **Add monitoring** (Datadog, New Relic)
5. **Use message queue** for high-volume processing
6. **Implement circuit breakers** for external API failures
7. **Add health check endpoint** for load balancer
8. **Enable auto-scaling** based on event volume
