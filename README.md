# Earnly

A task-and-rewards app. Users complete tasks, earn points, and withdraw them to
Paytm or UPI. **1 point = ₹1.** Admins add tasks, watch submissions arrive live,
and settle payout requests by hand.

Built on Next.js 15 (App Router), Supabase, Drizzle, Tailwind v4 and shadcn/ui.
Everything used here is on a free tier.

---

## How it fits together

| Concern | Owner |
| --- | --- |
| Identity, sessions, email OTP | Supabase Auth (`@supabase/ssr`) |
| All application data | Drizzle over `DATABASE_URL` |
| "Something changed" pings for the admin panel | Supabase Realtime |

Two things worth knowing before changing anything:

**Drizzle connects as the table owner, so it bypasses RLS.** Every query it
makes is fully privileged. Authorisation lives in `src/lib/auth/guards.ts`
(`requireUser` / `requireAdmin`), and every data-access function is expected to
have gone through it. The RLS policies in `supabase-setup.sql` are
defence-in-depth for the public anon key, not the app's authorisation model.

**`points_ledger` is the authority on balances, not `profiles.points_balance`.**
The ledger is append-only; the balance column is a cache written in the same
transaction as the ledger row, always via a SQL-side increment
(`sql\`${col} + ${n}\``) and never a read-then-write. If they ever disagree, the
ledger is right.

Points are credited the instant a task form is submitted. They are **debited
when an admin marks a withdrawal paid**, not when the user requests it — so a
rejected request needs no reversal. What stops a user requesting the same points
twice is `getPendingWithdrawalPoints`, which is subtracted from the spendable
balance.

---

## Setting up Supabase

Node 22 or later is required — `@supabase/supabase-js` warns on Node 20 and will
drop support for it. The repo has a `.nvmrc`, so:

```bash
nvm use     # picks up Node 22 from .nvmrc
```

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
   Save the database password it shows you — it is not recoverable.

2. Copy the env template and fill it in:

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Where to find it |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → Data API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page — the publishable/anon key |
   | `DATABASE_URL` | Project Settings → Database → Connection string. Use port **6543** |
   | `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` in dev, your real origin in prod |

   URL-encode any special characters in the database password. `.env.local` is
   gitignored — never commit it.

   Use port **6543**, not 5432. Free-tier projects often refuse connections on
   5432, and the failure looks like a timeout rather than anything naming the
   port.

3. Under **Authentication → URL Configuration**, add
   `http://localhost:3000/auth/callback` (and the production equivalent) to the
   redirect allow-list, or verification links will bounce.

4. Create the tables, then run the Supabase-side wiring:

   ```bash
   npm run db:push    # creates the 5 tables from src/lib/drizzle/schema.ts
   npm run db:setup   # trigger + RLS + realtime publication (idempotent)
   ```

   `db:setup` runs `src/lib/drizzle/supabase-setup.sql`, which does three things
   Drizzle can't express: ties `profiles.id` to `auth.users` with a
   cascade-delete FK and a signup trigger, enables RLS with deny-all defaults,
   and publishes `submissions`/`withdrawals` to the realtime publication.

5. Optionally load some example tasks:

   ```bash
   npm run db:seed    # idempotent by slug
   ```

6. Start the app, sign up, then promote yourself:

   ```bash
   npm run dev
   npm run make:admin -- you@example.com
   ```

   The account must already exist — this flips a flag on an existing profile.
   There is deliberately no way to self-promote from inside the app.

---

## Auth model

The signup form takes name, email, phone and password. **Only the email is
verified**, via a 6-digit Supabase OTP.

The phone number is an ordinary `profiles` column: never verified, never a login
credential, captioned in the form as being used only to send withdrawals. Login
still *accepts* a phone number in the single identifier field — it is resolved
to the account's email server-side before the password check. Unknown account
and wrong password return the same message, and password reset always reports
success, so neither can be used to enumerate accounts.

---

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Write a migration from schema changes |
| `npm run db:push` | Push the schema straight to the database |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:setup` | Apply `supabase-setup.sql` |
| `npm run db:seed` | Insert example tasks |
| `npm run make:admin -- <email>` | Grant admin rights |

---

## Layout

```
src/
  app/
    (auth)/            login, signup, verify, forgot-password
    auth/callback/     handler for Supabase email links
    dashboard/         the user app — tasks, earnings, withdraw, profile
    admin/             tasks, submissions, users, withdrawals
    page.tsx           landing page
  components/
    landing/           hero, how-it-works, payouts, faq …
    paper/             neo-brutalist form primitives
    dashboard/         nav, dynamic task-form renderer
    admin/             nav, form builder, realtime refresher …
    ui/                shadcn
  lib/
    actions/           server actions (tasks, payouts, admin)
    auth/              guards + auth actions
    db/                the privileged Drizzle client
    drizzle/           schema, migrations, setup + seed scripts
    supabase/          browser and server SSR clients
    queries.ts         user-scoped reads (deliberately NOT server actions)
    admin-queries.ts   admin reads
    validations.ts     zod schemas
```

Note that reads live in `queries.ts` / `admin-queries.ts` rather than in the
`"use server"` action modules. Every export of a `"use server"` module is a
publicly callable HTTP endpoint, so a read helper that takes a `userId` argument
would let anyone fetch anyone's data.

---

## Two design decisions that look like omissions

**Tasks close, they never delete.** Deleting a task would cascade to its
submissions, which are the evidence for points already paid out. The admin panel
has no hard delete.

**Screenshot/proof fields collect a link, not a file.** No storage bucket is
needed, which keeps the whole thing inside the free tier. Submitted URLs must
parse as `http:` or `https:` — `javascript:` and `data:` are rejected — and
admin-rendered links carry `rel="noopener noreferrer"`.

---

## Fonts

`src/components/landing/font-faces.tsx` checks `public/fonts/` at request time
and emits `@font-face` rules only for files that are actually present. The two
display faces are commercial and nothing is committed, so the app currently
renders in free stand-ins (Anton, Instrument Sans).

To upgrade the type with no code change, create `public/fonts/` and drop in
`Palo-CompressedBold.woff2` and/or `BandaNova-Book.woff2` (`.otf` and `.ttf` are
also picked up). Declaring these unconditionally in `globals.css` instead would
make the browser 404 on every page load of a fresh checkout.
