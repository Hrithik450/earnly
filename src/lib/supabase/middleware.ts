import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Prefixes that require a signed-in user. */
const PROTECTED = ["/dashboard", "/admin"];

/** Auth pages a signed-in user should be bounced away from. */
const AUTH_PAGES = ["/login", "/signup"];

/**
 * Refreshes the Supabase session on every request and gates protected routes.
 *
 * Two things make this subtle:
 *
 * - The response object must be rebuilt whenever cookies are set, and the SAME
 *   object must be returned, or the refreshed tokens never reach the browser and
 *   the user is silently logged out an hour later.
 *
 * - getUser() is used, not getSession(). getSession() reads the cookie and
 *   trusts it; getUser() verifies the JWT with the auth server. Since this is
 *   the check that decides whether to allow access, it has to be the real one.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && PROTECTED.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    /* Preserve where they were headed so login can send them back. */
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  /* Admin membership is NOT checked here. Middleware runs on the edge without a
     database connection, so the is_admin lookup happens in the /admin layout and
     again in every admin action. */

  return response;
}
