import { eq } from "drizzle-orm";
import { db, pool } from "../db";
import { profiles } from "./schema";

/**
 * Grants admin rights to an existing user, by email.
 *
 *   npm run make:admin -- you@example.com
 *
 * The account must already have signed up — this flips a flag on the profile,
 * it does not create one. There is deliberately no way to self-promote from
 * inside the app.
 */
async function main() {
  /* npm consumes the `--` separator itself; pnpm forwards it verbatim, so it
     arrives as a literal argument. Dropping it makes both invocations work. */
  const email = process.argv
    .slice(2)
    .find((arg) => arg !== "--")
    ?.trim()
    .toLowerCase();

  if (!email) {
    console.error("Usage: npm run make:admin -- you@example.com");
    process.exit(1);
  }

  const [updated] = await db
    .update(profiles)
    .set({ isAdmin: true, updatedAt: new Date() })
    .where(eq(profiles.email, email))
    .returning({ id: profiles.id, email: profiles.email });

  if (!updated) {
    console.error(
      `✗ No profile found for ${email}. Sign up in the app first, then re-run.`,
    );
    process.exit(1);
  }

  console.log(`✓ ${updated.email} is now an admin.`);
}

main()
  .catch((error) => {
    console.error("✗ Failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => pool.end());
