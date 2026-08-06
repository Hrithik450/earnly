import type { Metadata } from "next";
import { signOut } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Account suspended", robots: { index: false, follow: false } };

export default function BlockedPage() {
  return (
    <div className="paper flex min-h-screen items-center justify-center px-5 py-14">
      <div className="ink-card w-full max-w-md space-y-4 p-7">
        <span className="sticker" style={{ background: "var(--red)", color: "#fff" }}>
          Account on hold
        </span>
        <h1 className="text-3xl sm:text-4xl">Your account is suspended</h1>
        <p className="caption text-sm">
          Task activity on this account has been paused pending a review. Any
          points already earned are safe. Reply to your signup email if you think
          this is a mistake.
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="btn-ink px-5 py-2.5 text-sm text-white"
            style={{ background: "var(--ink)" }}
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
