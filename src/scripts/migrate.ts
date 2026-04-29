import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { loadConfig } from "../config.js";

async function main(): Promise<void> {
  const config = loadConfig();
  if (!config.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const sqlPath = resolve(process.cwd(), "db/sql/001_init.sql");
  const sql = await readFile(sqlPath, "utf8");
  const client = new pg.Client({
    connectionString: config.DATABASE_URL
  });

  await client.connect();
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log(`Applied migration: ${sqlPath}`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
