# Earnly

Earnly is a simple rewards app where people complete small online tasks, earn points, and withdraw their earnings to UPI or Paytm.

`1 point = Rs. 1`

The product is designed to feel straightforward:

- Users sign up, browse live tasks, submit proof, and track earnings.
- Admins create tasks, review activity, and manually approve withdrawals.
- The app is built to stay lightweight and affordable to run.

## What Earnly does

Earnly is meant for task-based earning communities, promo campaigns, or private reward programs where you want a clean flow:

1. Publish a task.
2. Let users complete it and submit proof.
3. Reward them with points.
4. Let them request withdrawals.
5. Settle payouts through UPI or Paytm.

It is especially useful when you want a working product without building a large operations system around it.

## How it works

### For users

- Create an account
- Verify email
- Complete available tasks
- Submit proof using a link
- Earn points instantly after submission
- Request payout when ready
- Receive money through UPI or Paytm after admin approval

### For admins

- Add and manage tasks
- View user submissions
- Watch new activity update in near real time
- Review withdrawal requests
- Mark payouts as paid manually

## Main product rules

- Points are the earning unit, and `1 point = Rs. 1`
- Tasks are closed instead of deleted, so past reward history stays intact
- Proof is submitted as a URL, not as uploaded files
- Withdrawal requests are handled manually by an admin

## Why the project is lightweight

Earnly is intentionally kept minimal:

- No complex payout automation
- No file storage for screenshots or proof
- No large admin backoffice setup
- No paid infrastructure required to get started

That makes it a good fit for small teams, early-stage launches, and low-cost experiments.

## Quick start

### 1. Requirements

- Node.js 22+
- A Supabase project

### 2. Add environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Fill in these values in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `NEXT_PUBLIC_SITE_URL`

Notes:

- Use the Supabase database connection string on port `6543`
- Keep `.env.local` private and never commit it

### 3. Set up the database

```bash
npm run db:push
npm run db:setup
```

Optional sample data:

```bash
npm run db:seed
```

### 4. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`

### 5. Create an admin

After signing up with your own account:

```bash
npm run make:admin -- you@example.com
```

### 6. Email delivery

Auth emails (the signup code, resends, password resets) are sent by Supabase, not
by this app, so there is nothing to configure in the repo and no SMTP credentials
belong in `.env.local`.

Supabase's built-in mailer only delivers to your own organization members and is
capped at 2 messages per hour, so production needs custom SMTP. This project uses
Brevo, configured under Authentication → Emails → SMTP Settings in the Supabase
dashboard, sending as `Earnly <no-reply@mhrithik.com>` over `smtp-relay.brevo.com:587`.

Two things to preserve when touching that screen:

- The Confirm signup template must keep `{{ .Token }}`. The app verifies an emailed
  code at `/verify`; a template with only the link will break signup. The code's
  length is set under Authentication → Emails and must match `OTP_LENGTH` in
  `src/lib/validations.ts` (currently 8).
- After enabling custom SMTP the auth rate limit resets to 30 emails/hour. Raise it
  under Authentication → Rate Limits.

## Common scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run db:push
npm run db:setup
npm run db:seed
npm run make:admin -- <email>
```

## Minimal tech overview

The stack is intentionally small:

- Next.js for the web app
- Supabase for auth
- PostgreSQL with Drizzle for application data

That is enough to support:

- user accounts
- tasks
- submissions
- earnings
- withdrawals
- admin controls

## Project areas

- `src/app` - pages and routes
- `src/components` - UI pieces for landing, dashboard, and admin
- `src/lib/actions` - server actions for tasks, payouts, and admin flows
- `src/lib/drizzle` - database schema, setup, and seed scripts
- `src/lib/auth` - auth helpers and route guards

## Important note for maintainers

This README keeps the technical explanation intentionally short.

If you are changing the product logic, the most important business rules to preserve are:

- balances must remain trustworthy
- task history should not disappear
- payout requests should stay reviewable
- admin-only actions must stay protected

## In one line

Earnly is a low-cost task-and-rewards product where users finish small jobs and cash out earnings through UPI or Paytm.
