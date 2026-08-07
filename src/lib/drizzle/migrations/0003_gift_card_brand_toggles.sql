-- Per-brand gift card switches, stored in the same table as the methods.
--
-- Hand-written and idempotent, like 0002. Safe to re-run.
--
-- A brand row's id is "gift_card:<brand id>" — the method it belongs to, then
-- the brand from src/lib/gift-cards.ts. Reusing this table rather than adding a
-- second one keeps one place to read "what may a user redeem right now", which
-- is the question both the redeem page and the request action ask.

-- "gift_card:google-play" is 21 characters, so the existing varchar(20) will
-- not hold a composite id.
ALTER TABLE "payout_methods" ALTER COLUMN "id" TYPE varchar(64);--> statement-breakpoint

-- Every brand open by default. A brand with no row counts as enabled (see
-- getEnabledGiftCardBrands), so this seed is what makes the admin panel able to
-- show a switch at all — but a database that never runs it still offers the
-- full catalogue rather than an empty grid.
INSERT INTO "payout_methods" ("id", "is_enabled") VALUES
	('gift_card:amazon-pay', true),
	('gift_card:flipkart', true),
	('gift_card:google-play', true),
	('gift_card:swiggy', true),
	('gift_card:myntra', true)
ON CONFLICT ("id") DO NOTHING;
