import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Run database migrations from schema.sql
 */
async function migrate() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error("❌ DATABASE_URL not set in .env");
        process.exit(1);
    }

    const pool = new Pool({ connectionString: databaseUrl });

    try {
        const schemaPath = path.resolve(__dirname, "schema.sql");
        const sql = fs.readFileSync(schemaPath, "utf-8");

        console.log("🔄 Running migrations...");
        await pool.query(sql);
        console.log("✅ Migrations complete.");
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
