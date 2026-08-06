import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for links in Supabase emails (magic link, password recovery).
 *
 * The emailed-code flow does not come through here — that is handled by the form
 * on /verify. This exists so that clicking the link in the same email also works.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  /* Reject absolute or protocol-relative targets — otherwise `next` is an open
     redirect that an attacker can point at their own domain. */
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "email" | "recovery" | "invite" | "email_change",
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(`${origin}/login?error=link_expired`);
}
