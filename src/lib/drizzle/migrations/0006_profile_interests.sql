-- What a user tells us about themselves at signup, beyond how to reach them.
--
-- The first four columns exist to match people to tasks: an IT professional in
-- Karnataka and a hospitality worker in Kerala should not be shown the same
-- board, and until now we knew neither fact about either of them.
--
-- Stored as the display strings the user picked, not as codes. Nothing joins on
-- these or reports over them — they are read straight back into the same
-- dropdowns they came from, and a code would only add a lookup table to keep in
-- step with src/lib/reference.
--
-- All nullable, including the ones the signup form marks required. Every
-- account created before this migration has no answer to any of them, and a
-- NOT NULL with a filled-in default would put words in their mouths. The
-- profile page asks existing users for the same details.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "industry" text;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "country" text;
-- Genuinely optional even for new signups: a couple of dozen countries have no
-- subdivisions, so the form has nothing to ask.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "state" text;
-- Free text, comma-separated by convention only. Left unparsed because the
-- value is in what they actually wrote.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "hobbies" text;
