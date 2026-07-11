import "dotenv/config";
import pool from "./config/db.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initDb() {
  try {
    const schemaPath = join(__dirname, "models", "schema.sql");
    const schema = readFileSync(schemaPath, "utf-8");
    await pool.query(schema);
    console.log("Database schema initialized successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  }
}

initDb();
