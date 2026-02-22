import { Router, Request, Response } from "express";
import { getIndexerStatus } from "../workers/indexer";
import { logger } from "../middleware/logger";

const router = Router();

/**
 * GET /health
 * Basic health check + indexer status.
 */
router.get("/", (_req: Request, res: Response) => {
    const indexer = getIndexerStatus();
    res.json({
        status: "ok",
        service: "arc-portal-backend",
        timestamp: new Date().toISOString(),
        indexer: {
            running: indexer.isRunning,
            lastBlock: indexer.lastProcessedBlock,
        },
    });
});

export default router;
