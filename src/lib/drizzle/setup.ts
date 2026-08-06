import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

/**
 * Applies supabase-setup.sql — the auth trigger, RLS policies and realtime
 * publication that Drizzle's schema cannot express.
 *
 * Run after `npm run db:push`. Safe to re-run; the SQL is idempotent.
 *
 * Uses a single Client rather than the app's Pool because the file contains
 * `do $$ ... $$` blocks and CREATE FUNCTION bodies that must reach the server as
 * one script, not be split into separate statements.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  const sql = readFileSync(
    join(process.cwd(), "src", "lib", "drizzle", "supabase-setup.sql"),
    "utf8",
  );

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    await client.query(sql);
    console.log("✓ Supabase setup applied: auth trigger, RLS, realtime.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("✗ Setup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
