import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { profiles, type Profile } from "@/lib/drizzle/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * Authorisation for the whole app.
 *
 * Drizzle connects as the table owner and bypasses row-level security, so RLS
 * cannot be relied on to keep one user out of another's data. These functions
 * are the only thing that does. Every server action and protected page is
 * expected to start with a call to one of them, and to use the returned
 * profile's id rather than any id supplied by the client.
 *
 * Middleware already redirects anonymous users away from /dashboard and /admin,
 * but middleware does not run for server actions — so an unguarded action is
 * directly callable by anyone who can POST. Hence the checks here are repeated
 * rather than assumed.
 *
 * Both lookups are wrapped in React's `cache`, which dedupes per request rather
 * than across requests. A page that guards itself and then renders three
 * components that each want the profile costs one token verification and one
 * query, not four of each — and the next visitor still gets their own.
 */

/** The verified auth user, or null. Verifies the JWT with the auth server. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** The signed-in user's profile, or null if not signed in. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  return profile ?? null;
});

/**
 * Requires a signed-in, non-blocked user. Redirects otherwise.
 * Use at the top of every user-facing page and action.
 */
export async function requireUser(): Promise<Profile> {
  const profile = await getProfile();

  if (!profile) redirect("/login");

  /* A blocked user keeps a valid session until it expires, so the block has to
     be enforced on read rather than only at sign-in. */
  if (profile.isBlocked) redirect("/blocked");

  return profile;
}

/**
 * Requires an admin. Redirects non-admins to the user dashboard rather than to
 * login — they are authenticated, just not authorised, and bouncing them to a
 * login form they've already passed is confusing.
 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireUser();
  if (!profile.isAdmin) redirect("/dashboard");
  return profile;
}
