import "dotenv/config";
import pool from "../src/config/db.js";

async function test() {
  try {
    const res = await pool.query("SELECT NOW() as now, current_database() as db");
    console.log("PostgreSQL connected successfully.");
    console.log("  Database:", res.rows[0].db);
    console.log("  Time:", res.rows[0].now);
  } catch (err) {
    console.error("Connection failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

test();
