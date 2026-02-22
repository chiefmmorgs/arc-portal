import { Router, Request, Response } from "express";
import {
    getValidators,
    getValidatorByAddress,
    getValidatorStats,
    getRewardsByValidator,
} from "../modules/db";
import { logger } from "../middleware/logger";

const router = Router();

/**
 * GET /api/validators
 * List all validators with their stats.
 */
router.get("/", async (_req: Request, res: Response) => {
    try {
        const { rows } = await getValidators();
        res.json({ validators: rows });
    } catch (err) {
        logger.error("Failed to fetch validators", { error: (err as Error).message });
        res.status(500).json({ error: "Failed to fetch validators" });
    }
});

/**
 * GET /api/validators/stats
 * Aggregate network statistics.
 */
router.get("/stats", async (_req: Request, res: Response) => {
    try {
        const { rows } = await getValidatorStats();
        res.json({ stats: rows[0] });
    } catch (err) {
        logger.error("Failed to fetch stats", { error: (err as Error).message });
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

/**
 * GET /api/validators/export
 * CSV export of all validator data.
 */
router.get("/export", async (_req: Request, res: Response) => {
    try {
        const { rows } = await getValidators();
        const headers = "address,total_blocks,missed_blocks,uptime_percentage,created_at\n";
        const csv = rows
            .map((r: any) =>
                `${r.address},${r.total_blocks},${r.missed_blocks},${r.uptime_percentage},${r.created_at}`
            )
            .join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="validators.csv"');
        res.send(headers + csv);
    } catch (err) {
        logger.error("Failed to export", { error: (err as Error).message });
        res.status(500).json({ error: "Export failed" });
    }
});

/**
 * GET /api/validators/:address
 * Single validator detail.
 */
router.get("/:address", async (req: Request, res: Response) => {
    try {
        const { rows } = await getValidatorByAddress(req.params.address);
        if (rows.length === 0) {
            res.status(404).json({ error: "Validator not found" });
            return;
        }
        res.json({ validator: rows[0] });
    } catch (err) {
        logger.error("Failed to fetch validator", { error: (err as Error).message });
        res.status(500).json({ error: "Failed to fetch validator" });
    }
});

/**
 * GET /api/validators/:address/rewards
 * Reward history for a validator.
 */
router.get("/:address/rewards", async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const { rows } = await getRewardsByValidator(req.params.address, limit);
        res.json({ rewards: rows });
    } catch (err) {
        logger.error("Failed to fetch rewards", { error: (err as Error).message });
        res.status(500).json({ error: "Failed to fetch rewards" });
    }
});

export default router;
