import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for client components. Uses the anon key, which is public by
 * design and gated by the RLS policies in supabase-setup.sql.
 *
 * Only used for two things: submitting credentials during login/signup, and the
 * admin panel's realtime change-ping subscription. All application data is read
 * server-side through Drizzle.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
