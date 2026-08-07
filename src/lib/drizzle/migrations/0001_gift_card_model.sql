-- Gift card model: points → coins, withdrawals → redemptions.
--
-- Hand-written rather than generated. drizzle-kit sees a rename as a drop plus
-- a create, which would zero every live balance — RENAME COLUMN preserves the
-- data instead.

-- 1. profiles.points_balance -> coins_balance, and drop the payout columns.
ALTER TABLE "profiles" RENAME COLUMN "points_balance" TO "coins_balance";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "upi_id";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "paytm_number";--> statement-breakpoint

-- The check constraint stores its expression against the old column name, so it
-- has to be rebuilt rather than renamed.
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "balance_non_negative";--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "balance_non_negative" CHECK ("profiles"."coins_balance" >= 0);--> statement-breakpoint

-- 2. tasks.points -> coins, submissions.points_awarded -> coins_awarded.
ALTER TABLE "tasks" RENAME COLUMN "points" TO "coins";--> statement-breakpoint
ALTER TABLE "submissions" RENAME COLUMN "points_awarded" TO "coins_awarded";--> statement-breakpoint

-- 3. points_ledger -> coins_ledger. The ledger is the source of truth for every
-- balance, so it is renamed in place and never recreated.
ALTER TABLE "points_ledger" RENAME TO "coins_ledger";--> statement-breakpoint
ALTER TABLE "coins_ledger" RENAME CONSTRAINT "points_ledger_user_id_profiles_id_fk" TO "coins_ledger_user_id_profiles_id_fk";--> statement-breakpoint

-- 4. withdrawals -> redemptions.
--
-- Dropped and recreated rather than renamed: a withdrawal row records a UPI
-- handle and a rupee payout, and there is no honest mapping from that to a gift
-- card brand. Settle any pending request before running this. Coins are only
-- debited on fulfilment, so a pending row that disappears leaves the user's
-- balance untouched — they can just request a card instead.
DROP TABLE IF EXISTS "withdrawals";--> statement-breakpoint

CREATE TABLE "redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"brand_id" varchar(40) NOT NULL,
	"brand_name" text NOT NULL,
	"amount_coins" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"card_code" text,
	"card_pin" text,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_redemptions_user" ON "redemptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_redemptions_status" ON "redemptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_redemptions_created" ON "redemptions" USING btree ("created_at");
