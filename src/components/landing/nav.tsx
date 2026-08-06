import Link from "next/link";

export function Nav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="nav-pill px-6 py-5 sm:px-10">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center">
        <Link
          href="/"
          className="display inline-flex items-baseline gap-1.5 justify-self-start text-2xl"
        >
          Earnly
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "var(--red)" }}
          />
        </Link>

        <nav className="caption hidden items-center gap-8 text-sm sm:flex">
          <a href="#tasks" className="hover:text-[var(--ink)]">
            Tasks
          </a>
          <a href="#how" className="hover:text-[var(--ink)]">
            How it works
          </a>
          <a href="#payouts" className="hover:text-[var(--ink)]">
            Payouts
          </a>
          <a href="#faq" className="hover:text-[var(--ink)]">
            FAQ
          </a>
        </nav>

        <div className="col-start-3 justify-self-end">
          {signedIn ? (
            <Link
              href="/dashboard"
              className="btn-ink px-5 py-2 text-sm text-white"
              style={{ background: "var(--blue)" }}
            >
              My dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="btn-ink hidden bg-white px-5 py-2 text-sm sm:block"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="btn-ink px-5 py-2 text-sm text-white"
                style={{ background: "var(--blue)" }}
              >
                Start earning
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
