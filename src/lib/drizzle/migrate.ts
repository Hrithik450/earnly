import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

/**
 * Applies the hand-written SQL in migrations/, in filename order.
 *
 * drizzle-kit generate writes those files but nothing here ran them, so a
 * database could sit several migrations behind a schema.ts that had moved on.
 * Re-running the whole set is the intended way to use this rather than tracking
 * which have been applied.
 *
 * The 0000/0001 files are drizzle-generated or contain renames, and are not
 * idempotent — on a database that already has them applied they fail with
 * "already exists" or, for a completed rename, "does not exist". Both are the
 * expected result rather than a problem, so those codes are skipped and
 * everything else still throws.
 *
 * A single Client, not the app's Pool: the files contain `do $$ ... $$` blocks
 * that must reach the server as one script rather than be split per statement.
 * That also means each file runs in one implicit transaction, so a file that
 * trips one of these codes rolls back whole rather than half-applying.
 */

/* duplicate_table, duplicate_object, duplicate_column — already created.
   undefined_column, undefined_table — a rename that already happened. */
const ALREADY_APPLIED = new Set([
  "42P07",
  "42710",
  "42701",
  "42703",
  "42P01",
]);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  const dir = join(process.cwd(), "src", "lib", "drizzle", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    for (const file of files) {
      try {
        await client.query(readFileSync(join(dir, file), "utf8"));
        console.log(`✓ ${file}`);
      } catch (error) {
        const code =
          typeof error === "object" && error !== null && "code" in error
            ? String(error.code)
            : "";

        if (!ALREADY_APPLIED.has(code)) throw error;
        console.log(`· ${file} (already applied)`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(
    "✗ Migration failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
