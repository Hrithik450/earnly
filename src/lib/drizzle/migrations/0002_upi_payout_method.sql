-- UPI as a second payout method, switchable from the admin panel.
--
-- Hand-written and idempotent so it can be applied to a live database without
-- drizzle-kit reading the additive columns as anything destructive. Safe to
-- re-run.
--
-- Note: 0001 dropped profiles.upi_id. The handle is deliberately NOT coming
-- back to the profile — it lives on the redemption row instead, so that editing
-- a profile can never rewrite the destination a past payment was sent to.

-- 1. Which payout methods are open. One row per PayoutMethod in
-- src/lib/payout-methods.ts.
CREATE TABLE IF NOT EXISTS "payout_methods" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Both methods on. The landing page names both in static copy, so the panel
-- switch decides only what the redeem form will accept.
--
-- The UPDATE is here because an earlier draft of this file seeded upi as
-- disabled, and ON CONFLICT DO NOTHING would leave that row alone. Re-running
-- this migration therefore re-opens UPI — if you have deliberately switched it
-- off from the panel, turn it off again after running this.
INSERT INTO "payout_methods" ("id", "is_enabled") VALUES
	('gift_card', true),
	('upi', true)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

UPDATE "payout_methods" SET "is_enabled" = true WHERE "id" IN ('gift_card', 'upi');--> statement-breakpoint

-- 2. Tell the two request shapes apart. Existing rows are all gift cards, and
-- the default makes that true without a backfill guess.
ALTER TABLE "redemptions" ADD COLUMN IF NOT EXISTS "method" varchar(20) DEFAULT 'gift_card' NOT NULL;--> statement-breakpoint

-- 3. Where a UPI payout goes, and the reference it came back with. Both NULL for
-- gift card rows.
ALTER TABLE "redemptions" ADD COLUMN IF NOT EXISTS "upi_id" text;--> statement-breakpoint
ALTER TABLE "redemptions" ADD COLUMN IF NOT EXISTS "payout_ref" text;--> statement-breakpoint

-- A UPI request with no destination cannot be paid. The server action rejects
-- one first; this stops a crafted post from writing an unpayable row.
ALTER TABLE "redemptions" DROP CONSTRAINT IF EXISTS "upi_needs_destination";--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "upi_needs_destination" CHECK ("redemptions"."method" <> 'upi' OR "redemptions"."upi_id" IS NOT NULL);
