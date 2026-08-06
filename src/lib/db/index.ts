import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../drizzle/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in environment variables.");
}

/**
 * Drizzle connects with the Supabase Postgres connection string, which
 * authenticates as the table owner and therefore BYPASSES row-level security.
 * Every query made through this client is fully privileged.
 *
 * That is deliberate — RLS is defence-in-depth for the anon key, not our
 * authorisation model — but it means this module must never be imported into a
 * client component. Authorisation lives in src/lib/auth/guards.ts and every
 * data-access function is expected to have gone through it first.
 *
 * The Pool is cached on globalThis because Next's dev server re-evaluates
 * modules on every hot reload; without this each edit leaks a pool and the
 * Supabase connection limit is reached within a few minutes of editing.
 */
const globalForDb = globalThis as unknown as {
  __earnPool?: Pool;
};

const pool =
  globalForDb.__earnPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    /* The session pooler already multiplexes; a large client-side pool on top
       of it just holds connections open for no gain. */
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__earnPool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
