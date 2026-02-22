import { Pool, QueryResult } from "pg";
import { logger } from "../middleware/logger";

/**
 * Database module — PostgreSQL connection pool and typed query helpers.
 */

let pool: Pool;

export function initDB(databaseUrl: string): Pool {
    pool = new Pool({
        connectionString: databaseUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
        logger.error("Unexpected DB pool error", { error: err.message });
    });

    logger.info("Database pool initialized");
    return pool;
}

export function getPool(): Pool {
    if (!pool) throw new Error("Database not initialized. Call initDB() first.");
    return pool;
}

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[]
): Promise<QueryResult<T>> {
    return getPool().query<T>(text, params);
}

// ── Validator queries ──────────────────────────────────────────

export async function upsertValidator(address: string) {
    return query(
        `INSERT INTO validators (address) VALUES ($1)
     ON CONFLICT (address) DO NOTHING
     RETURNING *`,
        [address.toLowerCase()]
    );
}

export async function updateValidatorStats(
    address: string,
    totalBlocks: number,
    missedBlocks: number,
    uptimePct: number
) {
    return query(
        `UPDATE validators
     SET total_blocks = $2, missed_blocks = $3, uptime_percentage = $4
     WHERE address = $1`,
        [address.toLowerCase(), totalBlocks, missedBlocks, uptimePct]
    );
}

export async function getValidators() {
    return query(`SELECT * FROM validators ORDER BY total_blocks DESC`);
}

export async function getValidatorByAddress(address: string) {
    return query(`SELECT * FROM validators WHERE address = $1`, [address.toLowerCase()]);
}

export async function getValidatorStats() {
    return query(`
    SELECT
      COUNT(*) as total_validators,
      COALESCE(AVG(uptime_percentage), 0) as avg_uptime,
      COALESCE(SUM(total_blocks), 0) as total_blocks,
      COALESCE(SUM(missed_blocks), 0) as total_missed
    FROM validators
  `);
}

// ── Block log queries ──────────────────────────────────────────

export async function insertBlockLog(blockNumber: number, validator: string, timestamp: Date) {
    return query(
        `INSERT INTO block_logs (block_number, validator, timestamp)
     VALUES ($1, $2, $3)
     ON CONFLICT (block_number) DO NOTHING`,
        [blockNumber, validator.toLowerCase(), timestamp]
    );
}

export async function getLatestBlockLog() {
    return query(`SELECT * FROM block_logs ORDER BY block_number DESC LIMIT 1`);
}

export async function getBlockCountByValidator(address: string) {
    return query(
        `SELECT COUNT(*) as block_count FROM block_logs WHERE validator = $1`,
        [address.toLowerCase()]
    );
}

// ── Reward queries ─────────────────────────────────────────────

export async function insertReward(validator: string, amount: string, epoch: number) {
    return query(
        `INSERT INTO rewards (validator, amount, epoch) VALUES ($1, $2, $3) RETURNING *`,
        [validator.toLowerCase(), amount, epoch]
    );
}

export async function getRewardsByValidator(address: string, limit = 50) {
    return query(
        `SELECT * FROM rewards WHERE validator = $1 ORDER BY epoch DESC LIMIT $2`,
        [address.toLowerCase(), limit]
    );
}

// ── Deployment queries ─────────────────────────────────────────

export async function insertDeployment(
    contractAddress: string,
    deployer: string,
    contractType: string,
    txHash: string
) {
    return query(
        `INSERT INTO deployments (contract_address, deployer, contract_type, tx_hash)
     VALUES ($1, $2, $3, $4) RETURNING *`,
        [contractAddress.toLowerCase(), deployer.toLowerCase(), contractType, txHash]
    );
}

export async function getDeploymentsByDeployer(deployer: string) {
    return query(
        `SELECT * FROM deployments WHERE deployer = $1 ORDER BY timestamp DESC`,
        [deployer.toLowerCase()]
    );
}

// ── NFT queries ────────────────────────────────────────────────

export async function insertNFT(
    owner: string,
    metadataUri: string,
    tokenId?: string,
    txHash?: string
) {
    return query(
        `INSERT INTO nfts (token_id, owner, metadata_uri, tx_hash)
     VALUES ($1, $2, $3, $4) RETURNING *`,
        [tokenId || null, owner.toLowerCase(), metadataUri, txHash || null]
    );
}

export async function getNFTsByOwner(owner: string) {
    return query(
        `SELECT * FROM nfts WHERE owner = $1 ORDER BY created_at DESC`,
        [owner.toLowerCase()]
    );
}
