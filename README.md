# Tokenized Invoice Factoring Protocol

A production-grade RWA protocol built on Mantle Network that tokenizes B2B invoices into NFTs and yield-bearing vault shares.

## Overview

This protocol enables:
- **Businesses**: Get instant liquidity by selling unpaid invoices at a discount
- **Investors**: Earn 8-25% APY backed by real-world receivables
- **Compliance**: KYC gates with optional ZK-KYC for privacy-preserving verification

## Features

- 🎫 **Invoice NFTs (ERC-721)**: Each invoice becomes a unique, tradeable token
- 🏦 **Tranche Vaults (ERC-4626)**: Senior and junior tranches for different risk profiles
- ✅ **KYC Compliance**: Built-in compliance layer with country restrictions
- 🔒 **ZK Privacy**: Optional zero-knowledge proofs for anonymous compliance
- 📊 **Monitoring Dashboard**: Real-time analytics for TVL, APY, defaults, and risk metrics

## Architecture

### Smart Contracts
- `InvoiceNFT.sol` - ERC-721 tokenization of invoices
- `KYCGate.sol` - Compliance and access control
- `TrancheVault.sol` - ERC-4626 vaults for pooled investments
- `ZKKYCVerifier.sol` - Zero-knowledge proof verification

### Off-Chain Services
- Oracle service for invoice verification and payment tracking
- Indexer for monitoring events and analytics
- IPFS integration for document storage

### Frontend
- Business interface for minting and managing invoices
- Investor interface for vault deposits and yield tracking
- Admin dashboard with comprehensive analytics

## Hackathon Tracks

This project targets three Mantle Global Hackathon 2025 tracks:

1. **RWA / RealFi** (Primary) - Invoice tokenization with compliant yield distribution
2. **ZK & Privacy** - Privacy-preserving KYC verification
3. **Infrastructure & Tooling** - Monitoring dashboard and developer tools

## Getting Started

### Prerequisites
- Node.js >= 18
- npm or yarn
- Mantle testnet RPC access

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file:

```env
PRIVATE_KEY=your_private_key
MANTLE_RPC_URL=https://rpc.testnet.mantle.xyz
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Deploy to Mantle Testnet

```bash
npm run deploy:testnet
```

### Run Tests

```bash
npm test
```

## Project Structure

```
mantle-rwa/
├── contracts/          # Solidity smart contracts
├── scripts/           # Deployment and automation scripts
├── test/              # Contract tests
├── oracle-service/    # Off-chain oracle service
├── indexer/           # Event indexing service
├── frontend/          # Next.js web application
└── docs/              # Documentation
```

## Tech Stack

- **Smart Contracts**: Solidity 0.8.24, OpenZeppelin, Hardhat
- **ZK Proofs**: Noir/circom
- **Frontend**: Next.js 14, TypeScript, viem, wagmi
- **Backend**: Node.js, Express
- **Storage**: IPFS
- **Network**: Mantle L2

## License

MIT

## Team

Built for Mantle Global Hackathon 2025
