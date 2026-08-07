# Earnly

Earnly is a simple rewards app where people complete small online tasks, earn coins, and redeem those coins for gift cards.

`1 coin = Rs. 1 of gift card value`

No money ever moves to a user — the reward is always a gift card code.

The product is designed to feel straightforward:

- Users sign up, browse live tasks, submit proof, and track earnings.
- Admins create tasks, review activity, and manually issue gift cards.
- The app is built to stay lightweight and affordable to run.

## What Earnly does

Earnly is meant for task-based earning communities, promo campaigns, or private reward programs where you want a clean flow:

1. Publish a task.
2. Let users complete it and submit proof.
3. Reward them with coins.
4. Let them redeem coins for a gift card.
5. Buy the card and paste its code into the admin panel.

It is especially useful when you want a working product without building a large operations system around it.

## How it works

### For users

- Create an account
- Verify email
- Complete available tasks
- Submit proof using a link
- Earn coins instantly after submission
- Redeem coins for a gift card when ready
- Get the card code on the Redeem page after admin approval

### For admins

- Add and manage tasks
- View user submissions
- Watch new activity update in near real time
- Review redemption requests
- Buy each card by hand and paste in its code

## Main product rules

- Coins are the earning unit, and `1 coin = Rs. 1` of gift card value
- Coins have no cash value and are never paid out as money
- Tasks are closed instead of deleted, so past reward history stays intact
- Proof is submitted as a URL, not as uploaded files
- Redemption requests are fulfilled manually by an admin
- Coins are debited when the card is issued, not when it is requested, so a
  rejected request costs the user nothing

## Gift cards

The catalogue lives in `src/lib/gift-cards.ts`, not in the database — adding a
brand is a code change and a deploy.

| Brand | Notes |
| --- | --- |
| Amazon Pay | The most cash-like: covers bills, recharges and UPI payments |
| Flipkart | General shopping |
| Google Play | Apps, games, subscriptions |
| Swiggy Money | Food delivery |
| Myntra | Fashion |

## Why the project is lightweight

Earnly is intentionally kept minimal:

- No cashflow, no payment gateway, no KYC
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

> **Migrating an existing database from the points/withdrawals model?** Do not
> run `db:push` — drizzle-kit reads the rename as a drop plus a create and will
> zero every live balance. Apply
> `src/lib/drizzle/migrations/0001_gift_card_model.sql` by hand first (it uses
> `ALTER TABLE ... RENAME`, which preserves the data), settle any pending
> withdrawal before you do, then run `db:setup`.

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
- redemptions
- admin controls

## Project areas

- `src/app` - pages and routes
- `src/components` - UI pieces for landing, dashboard, and admin
- `src/lib/actions` - server actions for tasks, redemptions, and admin flows
- `src/lib/drizzle` - database schema, setup, and seed scripts
- `src/lib/auth` - auth helpers and route guards

## Important note for maintainers

This README keeps the technical explanation intentionally short.

If you are changing the product logic, the most important business rules to preserve are:

- balances must remain trustworthy
- task history should not disappear
- redemption requests should stay reviewable
- admin-only actions must stay protected

## In one line

Earnly is a low-cost task-and-rewards product where users finish small jobs and redeem their coins for gift cards.
