-- ---------------------------------------------------------------------------
-- Supabase-side wiring that Drizzle cannot express.
--
-- Run this ONCE, after `npm run db:push`, via `npm run db:setup` (or by pasting
-- it into the Supabase SQL editor). It is written to be idempotent, so running
-- it twice is harmless.
--
-- Three jobs:
--   1. Tie public.profiles to auth.users, auto-create a row on signup, and
--      backstop the phone/balance constraints.
--   2. Enable RLS on every table with deny-all defaults.
--   3. Let admins read submissions/redemptions over the anon key, which is what
--      makes the realtime subscription in the admin panel possible.
-- ---------------------------------------------------------------------------

-- 1. PROFILES <-> AUTH.USERS ------------------------------------------------

-- profiles.id must BE the auth user id, not merely resemble one. Without this
-- FK a deleted auth user leaves an orphaned profile that still owns coins.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;

-- Copies the new auth user into public.profiles. The phone and full name are
-- passed through raw_user_meta_data by the signup action; both are optional and
-- neither is verified.
--
-- SECURITY DEFINER because the trigger runs as the authenticating role, which
-- has no rights on public.profiles. search_path is pinned empty and every name
-- schema-qualified: a SECURITY DEFINER function with a mutable search_path can
-- be hijacked by a caller who creates a shadowing object earlier in the path.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, phone, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed up before this script was run.
insert into public.profiles (id, email, phone, full_name)
select
  u.id,
  u.email,
  nullif(u.raw_user_meta_data ->> 'phone', ''),
  nullif(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
on conflict (id) do nothing;

-- Both constraints are in schema.ts and so already exist on a database created
-- by `db:push`. They are repeated here for projects pushed before they were
-- added — a missing unique index on phone is silent until someone exploits it.
-- This runs after the backfill so the rows being constrained exist first.
--
-- If either ALTER fails, you have real duplicate phone numbers or a negative
-- balance already in the table. Neither is safe to ignore: find them with
--   select phone from public.profiles
--     where phone is not null group by phone having count(*) > 1;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uniq_profile_phone'
  ) then
    alter table public.profiles
      add constraint uniq_profile_phone unique (phone);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'balance_non_negative'
  ) then
    alter table public.profiles
      add constraint balance_non_negative check (coins_balance >= 0);
  end if;
end $$;


-- 2. ROW LEVEL SECURITY -----------------------------------------------------

-- Drizzle connects as the table owner and bypasses all of this; authorisation
-- for the app lives in server code (src/lib/auth/guards.ts). RLS here is
-- defence-in-depth for the anon key, which is public by design: without it,
-- anyone with the key could read every user's gift card codes straight from the
-- browser.
alter table public.profiles     enable row level security;
alter table public.tasks        enable row level security;
alter table public.submissions  enable row level security;
alter table public.coins_ledger enable row level security;
alter table public.redemptions  enable row level security;

-- payout_methods may not exist yet on a database that predates 0002. Guarded so
-- this file stays runnable in either order.
do $$
begin
  if to_regclass('public.payout_methods') is not null then
    execute 'alter table public.payout_methods enable row level security';

    -- Which methods are open is public information — it is written on the
    -- landing page. Readable by anyone; still writable only by server code.
    execute 'drop policy if exists "payout methods are public" on public.payout_methods';
    execute 'create policy "payout methods are public" on public.payout_methods for select using (true)';
  end if;
end $$;

-- platform_settings likewise postdates the first databases.
do $$
begin
  if to_regclass('public.platform_settings') is not null then
    execute 'alter table public.platform_settings enable row level security';

    -- Deliberately no select policy. RLS on with no policy means the anon key
    -- reads nothing, which is what we want: the submission count and the limit
    -- are operational numbers, and whether we are in maintenance already
    -- reaches the browser as a redirect. Server code bypasses RLS.
  end if;
end $$;

-- No policy on coins_ledger at all: nothing outside server code may read it.

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "active tasks are public" on public.tasks;
create policy "active tasks are public" on public.tasks
  for select using (is_active = true);

drop policy if exists "own submissions" on public.submissions;
create policy "own submissions" on public.submissions
  for select using (auth.uid() = user_id);

-- A redemption row carries the gift card code once issued, which is a bearer
-- credential — this policy is what keeps it scoped to the one account that
-- earned it.
drop policy if exists "own redemptions" on public.redemptions;
create policy "own redemptions" on public.redemptions
  for select using (auth.uid() = user_id);

-- Note the absence of insert/update/delete policies. Every write goes through a
-- server action on the privileged Drizzle connection, so the anon key is
-- read-only no matter what a client tries to send.


-- 3. ADMIN READ + REALTIME --------------------------------------------------

-- Answers "is the caller an admin?" without the recursion a subquery against
-- public.profiles inside a policy ON public.profiles would cause.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

drop policy if exists "admins read submissions" on public.submissions;
create policy "admins read submissions" on public.submissions
  for select using (public.is_admin());

drop policy if exists "admins read redemptions" on public.redemptions;
create policy "admins read redemptions" on public.redemptions
  for select using (public.is_admin());

drop policy if exists "admins read profiles" on public.profiles;
create policy "admins read profiles" on public.profiles
  for select using (public.is_admin());

-- Publish the two tables the admin panel watches. The client subscribes only to
-- get a "something changed" ping and then calls router.refresh(), so the actual
-- data is still refetched server-side through Drizzle.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'submissions'
  ) then
    alter publication supabase_realtime add table public.submissions;
  end if;

  -- The old `withdrawals` table is gone; drop it from the publication if this
  -- database predates the gift card model, or the publication references a
  -- table that no longer exists.
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'withdrawals'
  ) then
    alter publication supabase_realtime drop table public.withdrawals;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'redemptions'
  ) then
    alter publication supabase_realtime add table public.redemptions;
  end if;
end $$;
