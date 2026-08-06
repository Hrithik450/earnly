import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for server components, server actions and route handlers.
 *
 * Must be created per-request (never hoisted to a module-level singleton) —
 * it closes over this request's cookie jar, and sharing one across requests
 * would leak one user's session into another's.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            /* Server components cannot set cookies. Refreshed tokens are
               written by middleware instead, which runs before this and can.
               Swallowing here is the documented pattern, not an oversight. */
          }
        },
      },
    },
  );
}
