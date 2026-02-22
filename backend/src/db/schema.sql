-- ARC Portal Database Schema
-- Run via: npm run migrate

CREATE TABLE IF NOT EXISTS validators (
    id                  SERIAL PRIMARY KEY,
    address             VARCHAR(42) UNIQUE NOT NULL,
    total_blocks        INT DEFAULT 0,
    missed_blocks       INT DEFAULT 0,
    uptime_percentage   NUMERIC(5,2) DEFAULT 100.00,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS block_logs (
    id              SERIAL PRIMARY KEY,
    block_number    BIGINT UNIQUE NOT NULL,
    validator       VARCHAR(42) NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS rewards (
    id          SERIAL PRIMARY KEY,
    validator   VARCHAR(42) NOT NULL,
    amount      NUMERIC(78,0) NOT NULL,
    epoch       INT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deployments (
    id                  SERIAL PRIMARY KEY,
    contract_address    VARCHAR(42) NOT NULL,
    deployer            VARCHAR(42) NOT NULL,
    contract_type       VARCHAR(50) NOT NULL,
    tx_hash             VARCHAR(66) NOT NULL,
    timestamp           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfts (
    id              SERIAL PRIMARY KEY,
    token_id        VARCHAR(100),
    owner           VARCHAR(42) NOT NULL,
    metadata_uri    TEXT NOT NULL,
    tx_hash         VARCHAR(66),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_block_logs_validator ON block_logs(validator);
CREATE INDEX IF NOT EXISTS idx_block_logs_number ON block_logs(block_number);
CREATE INDEX IF NOT EXISTS idx_rewards_validator ON rewards(validator);
CREATE INDEX IF NOT EXISTS idx_rewards_epoch ON rewards(epoch);
CREATE INDEX IF NOT EXISTS idx_deployments_deployer ON deployments(deployer);
CREATE INDEX IF NOT EXISTS idx_deployments_type ON deployments(contract_type);
CREATE INDEX IF NOT EXISTS idx_nfts_owner ON nfts(owner);
