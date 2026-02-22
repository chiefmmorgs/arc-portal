import { getLatestBlockNumber, getBlock } from "../modules/rpc";
import {
    upsertValidator,
    insertBlockLog,
    getLatestBlockLog,
    getBlockCountByValidator,
    updateValidatorStats,
    getValidators,
} from "../modules/db";
import { logger } from "../middleware/logger";

/**
 * Indexer Worker — polls the ARC testnet for new blocks,
 * tracks block producers (validators), calculates uptime.
 * Designed as a standalone worker suitable for Render background worker.
 */

let isRunning = false;
let lastProcessedBlock = 0;
let indexStartBlock = 0; // Track where we started indexing from

/**
 * Initialize the indexer. Fetches the last processed block from DB.
 */
export async function initIndexer(): Promise<void> {
    const result = await getLatestBlockLog();
    if (result.rows.length > 0) {
        lastProcessedBlock = Number(result.rows[0].block_number);
        // Estimate start from the earliest block in our logs
        indexStartBlock = lastProcessedBlock - 100; // approximate
        logger.info(`Indexer resuming from block ${lastProcessedBlock}`);
    } else {
        // Start from recent blocks (last 100)
        const latest = await getLatestBlockNumber();
        lastProcessedBlock = Math.max(0, latest - 100);
        indexStartBlock = lastProcessedBlock;
        logger.info(`Indexer starting fresh from block ${lastProcessedBlock}`);
    }
}

/**
 * Process a single block — extract the miner/validator, store it.
 */
async function processBlock(blockNumber: number): Promise<void> {
    const block = await getBlock(blockNumber);
    if (!block) {
        logger.warn(`Block ${blockNumber} not found, skipping`);
        return;
    }

    const validator = block.miner;
    if (!validator) {
        logger.warn(`Block ${blockNumber} has no miner field`);
        return;
    }

    // Upsert the validator
    await upsertValidator(validator);

    // Log the block
    const blockTime = new Date(block.timestamp * 1000);
    await insertBlockLog(blockNumber, validator, blockTime);

    logger.debug(`Indexed block ${blockNumber} → validator ${validator}`);
}

/**
 * Update uptime statistics for all known validators.
 */
async function updateAllUptimeStats(): Promise<void> {
    const { rows: validators } = await getValidators();
    if (validators.length === 0) return;

    // Total blocks we've actually indexed (NOT the absolute block number)
    const totalIndexedBlocks = Math.max(1, lastProcessedBlock - indexStartBlock);

    for (const v of validators) {
        const address = (v as any).address as string;
        const { rows } = await getBlockCountByValidator(address);
        const producedBlocks = Number((rows[0] as any).block_count);

        // Expected blocks per validator = total indexed / number of validators
        const expectedBlocks = Math.max(1, Math.floor(totalIndexedBlocks / validators.length));
        const missedBlocks = Math.max(0, expectedBlocks - producedBlocks);
        const uptimePct = expectedBlocks > 0
            ? Math.min(100, (producedBlocks / expectedBlocks) * 100)
            : 100;

        await updateValidatorStats(
            address,
            producedBlocks,
            missedBlocks,
            parseFloat(uptimePct.toFixed(2))
        );
    }

    logger.info(`Updated uptime stats for ${validators.length} validators (indexed range: ${totalIndexedBlocks} blocks)`);
}

/**
 * Main indexing cycle — fetch new blocks since last processed.
 */
export async function runIndexCycle(): Promise<void> {
    if (isRunning) {
        logger.debug("Indexer cycle already running, skipping");
        return;
    }

    isRunning = true;

    try {
        const latestBlock = await getLatestBlockNumber();

        if (latestBlock <= lastProcessedBlock) {
            logger.debug("No new blocks to process");
            return;
        }

        const startBlock = lastProcessedBlock + 1;
        // Process in batches of 10 to avoid overwhelming RPC
        const batchSize = 10;
        const endBlock = Math.min(latestBlock, startBlock + batchSize - 1);

        logger.info(`Indexing blocks ${startBlock}–${endBlock} (latest: ${latestBlock})`);

        for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
            try {
                await processBlock(blockNum);
                lastProcessedBlock = blockNum;
            } catch (err) {
                logger.error(`Failed to process block ${blockNum}`, {
                    error: err instanceof Error ? err.message : String(err),
                });
                // Don't advance past failed blocks
                break;
            }
        }

        // Update uptime stats after processing batch
        await updateAllUptimeStats();
    } catch (err) {
        logger.error("Indexer cycle failed", {
            error: err instanceof Error ? err.message : String(err),
        });
    } finally {
        isRunning = false;
    }
}

/**
 * Get current indexer status.
 */
export function getIndexerStatus() {
    return {
        isRunning,
        lastProcessedBlock,
    };
}
