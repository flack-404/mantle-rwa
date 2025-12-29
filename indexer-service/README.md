# Mantle RWA Indexer Service

Event indexer and analytics API for the Mantle RWA Invoice Factoring Protocol.

## Features

- Real-time event monitoring from all smart contracts
- Supabase PostgreSQL with Prisma ORM
- RESTful API for frontend queries
- Historical data aggregation
- Platform-wide statistics

## Prerequisites

- Node.js 18+
- Supabase account (already configured)

## Installation

```bash
cd indexer-service
npm install
```

## Database Setup

The indexer uses **Supabase PostgreSQL** with **Prisma ORM**. No local database installation required!

### Initialize Database Schema

```bash
npm run db:push
```

This will:
1. Connect to Supabase
2. Create all necessary tables
3. Generate Prisma Client

### View Database (Optional)

```bash
npm run db:studio
```

Opens Prisma Studio at `http://localhost:5555` for visual database inspection.

## Configuration

Environment variables are already configured in `.env`:

```env
DATABASE_URL="postgresql://postgres:Kaustubh2003@db.mxbmbkifjdofvveyunii.supabase.co:5432/postgres"
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
API_PORT=3001
LOG_LEVEL=info
```

## Running the Service

### Production Mode

```bash
npm start
```

### Development Mode (with auto-reload)

```bash
npm run dev
```

The service will:
1. Connect to Mantle Sepolia RPC
2. Initialize contract instances
3. Start listening for blockchain events
4. Start API server on port 3001

## API Endpoints

Base URL: `http://localhost:3001`

### Platform Statistics

**GET /api/stats/platform**

Returns platform-wide statistics.

Example response:
```json
{
  "totalTVL": "700000000",
  "seniorTVL": "500000000",
  "juniorTVL": "200000000",
  "total_invoices": 5,
  "funded_invoices": 3,
  "paid_invoices": 1,
  "defaulted_invoices": 0,
  "total_funded_value": "300000000",
  "total_paid_value": "100000000"
}
```

### Invoices

**GET /api/invoices**

Query parameters:
- `status` - Filter by status (PENDING, VERIFIED, FUNDED, PAID, DEFAULTED)
- `issuer` - Filter by issuer address
- `limit` - Results per page (default: 100)
- `offset` - Pagination offset (default: 0)

**GET /api/invoices/:tokenId**

Get specific invoice by token ID.

### Vault Operations

**GET /api/vaults/:vaultType/deposits**

Get deposit history (`vaultType`: senior or junior).

Query parameters:
- `depositor` - Filter by depositor address
- `limit` - Results per page
- `offset` - Pagination offset

**GET /api/vaults/:vaultType/withdrawals**

Get withdrawal history for a vault.

### Historical Data

**GET /api/stats/tvl-history**

Get historical TVL data.

Query parameters:
- `days` - Number of days to fetch (default: 7)

### KYC Status

**GET /api/kyc/:address**

Get KYC verification status for an address.

## Database Schema (Prisma)

```prisma
model Invoice {
  tokenId          Int      @id
  issuer           String
  debtor           String
  debtorName       String?
  faceValue        String
  discountedValue  String
  discountRate     Int
  maturityDate     String
  invoiceHash      String
  status           String
  verifiedAt       String?
  fundedAt         String?
  paidAt           String?
  mintedAt         String
  mintedTx         String
  blockNumber      String
}

model VaultDeposit {
  id           Int      @id @default(autoincrement())
  vaultAddress String
  vaultType    String   // 'senior' or 'junior'
  depositor    String
  assets       String
  shares       String
  txHash       String
  blockNumber  String
  timestamp    String
}

// ... and 5 more models
```

See `prisma/schema.prisma` for full schema.

## Monitoring

The service logs all events and API requests using Winston logger.

Log levels:
- `info` - Normal operations, events processed
- `warn` - Warnings (e.g., invoice defaults)
- `error` - Errors and exceptions

## Architecture

```
┌─────────────────────────────────────────┐
│         Mantle Sepolia Testnet          │
│  (InvoiceNFT, Vaults, KYC Contracts)    │
└────────────────┬────────────────────────┘
                 │ Events
                 ▼
        ┌────────────────┐
        │ Event Listener │
        │  (eventListener.js)  │
        └────────┬───────┘
                 │ Save (Prisma)
                 ▼
         ┌──────────────┐
         │   Supabase   │
         │  PostgreSQL  │
         └──────┬───────┘
                │ Query (Prisma)
                ▼
         ┌──────────────┐
         │  REST API    │
         │  (api.js)    │
         └──────┬───────┘
                │ HTTP
                ▼
         ┌──────────────┐
         │   Frontend   │
         └──────────────┘
```

## Troubleshooting

### Prisma Connection Errors

Ensure DATABASE_URL is correct in `.env`:
```bash
npx prisma db pull  # Test connection
```

### Event Listener Not Working

Check RPC connectivity:
```bash
curl -X POST https://rpc.sepolia.mantle.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Missing Events

The indexer only tracks events from the moment it starts. Historical events can be indexed by:

1. Implementing a historical sync function
2. Querying past events using `contract.queryFilter()`
3. Processing them in batches

## Production Deployment

### Using PM2

```bash
npm install -g pm2
pm2 start src/index.js --name mantle-rwa-indexer
pm2 logs mantle-rwa-indexer
pm2 save
```

### Environment Variables for Production

Update `.env` with production values:
- Use environment-specific DATABASE_URL
- Set LOG_LEVEL=warn for production
- Configure API_PORT as needed

## License

MIT
