import dotenv from "dotenv";
import path from "path";

// Load env before anything else
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import express from "express";
import cors from "cors";
import cron from "node-cron";

import { initDB } from "./modules/db";
import { initRPC } from "./modules/rpc";
import { preloadArtifacts } from "./modules/artifacts";
import { initIndexer, runIndexCycle } from "./workers/indexer";
import { generalLimiter } from "./middleware/rateLimit";
import { logger } from "./middleware/logger";

import healthRoutes from "./routes/health";
import validatorRoutes from "./routes/validators";
import deployRoutes from "./routes/deploy";
import verifyRouter from "./routes/verify";
import uploadRoutes from "./routes/upload";

const PORT = parseInt(process.env.PORT || "4000", 10);

async function main() {
    // ── Initialize core modules ───────────────────────────────
    const databaseUrl = process.env.DATABASE_URL;
    const rpcUrl = process.env.ALCHEMY_RPC;

    if (!databaseUrl) {
        logger.error("DATABASE_URL not set");
        process.exit(1);
    }
    if (!rpcUrl) {
        logger.error("ALCHEMY_RPC not set");
        process.exit(1);
    }

    initDB(databaseUrl);
    initRPC(rpcUrl);
    preloadArtifacts();

    // ── Initialize indexer ────────────────────────────────────
    try {
        await initIndexer();
        logger.info("Indexer initialized");
    } catch (err) {
        logger.warn("Indexer init failed (DB may not be migrated yet)", {
            error: (err as Error).message,
        });
    }

    // ── Express app ───────────────────────────────────────────
    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json({ limit: "5mb" }));
    app.use(generalLimiter);

    // Request logging
    app.use((req, _res, next) => {
        logger.info(`${req.method} ${req.path}`, {
            ip: req.ip,
            userAgent: req.headers["user-agent"],
        });
        next();
    });

    // ── Routes ────────────────────────────────────────────────
    app.use("/health", healthRoutes);
    app.use("/api/validators", validatorRoutes);
    app.use("/api/deploy", deployRoutes);
app.use("/api/deploy", verifyRouter);
    app.use("/api/upload", uploadRoutes);

    // 404 handler
    app.use((_req, res) => {
        res.status(404).json({ error: "Not found" });
    });

    // Error handler
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        logger.error("Unhandled error", { error: err.message, stack: err.stack });
        res.status(500).json({ error: "Internal server error" });
    });

    // ── Start server ──────────────────────────────────────────
    app.listen(PORT, () => {
        logger.info(`🚀 ARC Portal backend running on port ${PORT}`);
        logger.info(`   Health:     http://localhost:${PORT}/health`);
        logger.info(`   Validators: http://localhost:${PORT}/api/validators`);
        logger.info(`   Deploy:     http://localhost:${PORT}/api/deploy`);
        logger.info(`   Upload:     http://localhost:${PORT}/api/upload`);
    });

    // ── Cron job: indexer every 2 minutes ─────────────────────
    cron.schedule("*/2 * * * *", async () => {
        logger.info("⏰ Running indexer cycle (cron)");
        await runIndexCycle();
    });

    // Run initial indexing cycle
    logger.info("Running initial indexer cycle...");
    runIndexCycle().catch((err) => {
        logger.warn("Initial indexer cycle failed", { error: (err as Error).message });
    });
}

main().catch((err) => {
    logger.error("Fatal startup error", { error: err.message });
    process.exit(1);
});
