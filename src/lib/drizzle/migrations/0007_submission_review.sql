-- Submissions become a review queue instead of an instant payout.
--
-- Coins used to be credited inside submitTask. Nothing checked that the work was
-- real, so the only thing between an empty form and a gift card was the honesty
-- of whoever filled it in. Now a submission lands as 'pending' and an admin
-- decides — the ledger entry is written at approval, not at submission.

-- How many times one user may do a task. 1 keeps the old behaviour; NULL means
-- unlimited. Existing tasks get 1 because that is what they enforced before.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS max_completions integer DEFAULT 1;

-- Why it was rejected, and when it was decided. Both null while pending.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- New rows are pending. Rows already in the table were credited under the old
-- behaviour, so they keep their 'approved' status and their ledger entries — a
-- default only applies to inserts.
ALTER TABLE submissions ALTER COLUMN status SET DEFAULT 'pending';

-- One submission per user per task was the old anti-double-claim rule. With a
-- per-task completion limit that rule is wrong: a task worth doing three times
-- needs three rows, and a rejected attempt should not lock the user out of
-- trying again. The limit is enforced in the submit action against the count of
-- non-rejected rows.
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS uniq_submission_task_user;

-- The admin queue reads pending-first, and the user's inbox reads by status.
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status);
