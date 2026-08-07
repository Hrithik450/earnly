import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth/actions";
import { getProfile } from "@/lib/auth/guards";
import { getPendingRedemptionCoins } from "@/lib/queries";
import { getPlatformStatus } from "@/lib/maintenance";

export const metadata: Metadata = {
  title: "Under maintenance",
  robots: { index: false, follow: false },
};

/* Never cached. A stale copy of this page would keep telling someone the
   platform is down for as long as the cache lived, which is exactly the moment
   it matters most that the page is current. */
export const dynamic = "force-dynamic";

/**
 * Where every non-admin lands while maintenance is on.
 *
 * `getProfile` rather than `requireUser`: requireUser is the thing that
 * redirects here, so calling it would bounce the page against itself forever.
 *
 * The balance is shown deliberately. The single question someone has when a
 * site holding their money goes dark is whether the money is still there, and
 * answering it on this page is cheaper than answering it in a support inbox.
 */
export default async function MaintenancePage() {
  const [profile, status] = await Promise.all([
    getProfile(),
    getPlatformStatus(),
  ]);

  /* Reopened while they sat here, or they typed the URL on an open platform. */
  if (status.isOpen) redirect(profile ? "/dashboard" : "/");

  const pending = profile ? await getPendingRedemptionCoins(profile.id) : 0;

  return (
    <div className="paper flex min-h-screen items-center justify-center px-5 py-14">
      <div className="ink-card w-full max-w-lg space-y-5 p-7">
        <span
          className="sticker"
          style={{ background: "var(--yellow)", color: "var(--ink)" }}
        >
          Maintenance
        </span>

        <h1 className="text-3xl sm:text-4xl">We&rsquo;ll be back shortly</h1>

        <p className="caption text-sm">
          {status.message ??
            "The platform is paused for maintenance. Tasks and redemptions are unavailable until it reopens. There isn't a fixed time — please check back a little later."}
        </p>

        {profile ? (
          <div className="space-y-3 border-t-2 border-[var(--ink)] pt-5">
            <div>
              <span className="mono block text-[0.6rem] font-bold tracking-[0.16em] uppercase opacity-60">
                Your balance
              </span>
              <span className="text-2xl leading-none font-bold">
                {profile.coinsBalance.toLocaleString("en-IN")} coins
              </span>
            </div>

            <p className="caption text-sm">
              Your coins are safe and untouched. Nothing expires while we&rsquo;re
              down, and you&rsquo;ll be able to redeem the moment the platform is
              live again.
            </p>

            {pending > 0 ? (
              <p className="caption text-sm">
                Your pending request for{" "}
                <strong>{pending.toLocaleString("en-IN")} coins</strong> is still
                queued and will be processed as normal — maintenance
                doesn&rsquo;t cancel it. No need to request it again.
              </p>
            ) : null}
          </div>
        ) : null}

        {profile ? (
          <form action={signOut}>
            <button
              type="submit"
              className="btn-ink px-5 py-2.5 text-sm text-white"
              style={{ background: "var(--ink)" }}
            >
              Sign out
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
