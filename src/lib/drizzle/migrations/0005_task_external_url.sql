-- The link a user has to visit to actually do the task.
--
-- Most tasks live on someone else's site — follow an account, sign up, leave a
-- review — so the instructions were being asked to carry a URL as prose. A
-- column instead, so the task page can render it as the one obvious button and
-- the admin panel can tell a task that points somewhere from one that does not.
--
-- Nullable: a task that is entirely on-site (a survey answered in our own form)
-- has nowhere to send anyone.
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "external_url" text;
