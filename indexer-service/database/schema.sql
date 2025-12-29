-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    token_id INTEGER PRIMARY KEY,
    issuer VARCHAR(42) NOT NULL,
    debtor VARCHAR(42) NOT NULL,
    debtor_name VARCHAR(255),
    face_value BIGINT NOT NULL,
    discounted_value BIGINT NOT NULL,
    discount_rate INTEGER NOT NULL,
    maturity_date BIGINT NOT NULL,
    invoice_hash VARCHAR(66) NOT NULL,
    status VARCHAR(20) NOT NULL,
    verified_at BIGINT,
    funded_at BIGINT,
    paid_at BIGINT,
    minted_at BIGINT NOT NULL,
    minted_tx VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vault deposits table
CREATE TABLE IF NOT EXISTS vault_deposits (
    id SERIAL PRIMARY KEY,
    vault_address VARCHAR(42) NOT NULL,
    vault_type VARCHAR(20) NOT NULL, -- 'senior' or 'junior'
    depositor VARCHAR(42) NOT NULL,
    assets BIGINT NOT NULL,
    shares BIGINT NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vault withdrawals table
CREATE TABLE IF NOT EXISTS vault_withdrawals (
    id SERIAL PRIMARY KEY,
    vault_address VARCHAR(42) NOT NULL,
    vault_type VARCHAR(20) NOT NULL,
    withdrawer VARCHAR(42) NOT NULL,
    assets BIGINT NOT NULL,
    shares BIGINT NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KYC verifications table
CREATE TABLE IF NOT EXISTS kyc_verifications (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL UNIQUE,
    verified_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    country_hash VARCHAR(66),
    risk_score INTEGER,
    kyc_id VARCHAR(255),
    tier INTEGER,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ZK-KYC proofs table
CREATE TABLE IF NOT EXISTS zk_kyc_proofs (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    nullifier VARCHAR(66) NOT NULL UNIQUE,
    commitment VARCHAR(66) NOT NULL,
    provider_hash VARCHAR(66) NOT NULL,
    expires_at BIGINT NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Platform statistics (time-series data)
CREATE TABLE IF NOT EXISTS platform_stats (
    id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    total_tvl BIGINT NOT NULL,
    senior_tvl BIGINT NOT NULL,
    junior_tvl BIGINT NOT NULL,
    total_invoices INTEGER NOT NULL,
    funded_invoices INTEGER NOT NULL,
    paid_invoices INTEGER NOT NULL,
    defaulted_invoices INTEGER NOT NULL,
    total_funded_value BIGINT NOT NULL,
    total_paid_value BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_invoices_issuer ON invoices(issuer);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_vault_deposits_depositor ON vault_deposits(depositor);
CREATE INDEX IF NOT EXISTS idx_vault_deposits_vault ON vault_deposits(vault_address);
CREATE INDEX IF NOT EXISTS idx_vault_withdrawals_withdrawer ON vault_withdrawals(withdrawer);
CREATE INDEX IF NOT EXISTS idx_platform_stats_timestamp ON platform_stats(timestamp);
