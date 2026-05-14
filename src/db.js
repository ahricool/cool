import pg from "pg";
import { config } from "./config.js";
import { schemaSql, seedSql } from "./schema.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}

export async function migrate() {
  await query(schemaSql);
  await query(seedSql);
}

export async function closePool() {
  await pool.end();
}
