-- ═══════════════════════════════════════════════════════════════════════
-- JOBCLAW — Auto-apply waitlist
--
-- Target: the shared Railgun Supabase project (nwdhomxzljairsddcgtp).
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run.
--
-- Auto-apply does not exist yet. Rather than claim it on the marketing
-- site, we collect intent here and measure real demand before building
-- the hardest, most ToS-fraught part of the product.
--
-- ⚠️  ONE DASHBOARD STEP IS REQUIRED AFTER RUNNING THIS.
--     See the note at the bottom — the table will exist but be
--     unreachable from the app until you do it.
--
-- Everything below is additive: it creates a new schema and a new table
-- and touches no existing object. Safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Schema ───────────────────────────────────────────────────────────
-- JobClaw gets its own schema rather than sharing `public`. This project
-- already has several owners (railgun_api, Meet's Prisma tables, raw SQL),
-- and an unqualified table name is how two migrations end up fighting over
-- the same object.
create schema if not exists jobclaw;

-- PostgREST connects as anon/authenticated and cannot see into a schema
-- without USAGE, even with table grants.
grant usage on schema jobclaw to anon, authenticated;

-- ─── Table ────────────────────────────────────────────────────────────
create table if not exists jobclaw.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  -- Which unbuilt capability the person actually wants, so we can rank
  -- what to build rather than guess.
  interest    text not null default 'auto_apply'
                check (interest in ('auto_apply','recruiter_outreach','interview_prep')),
  source      text,
  created_at  timestamptz not null default now()
);

-- One row per address per interest: a second signup is a no-op, not a
-- duplicate. Paired with ON CONFLICT DO NOTHING in the API route, this is
-- also what lets the endpoint answer identically for new and existing
-- addresses, so it cannot be used to probe who is already listed.
--
-- Plain columns, not lower(email), on purpose: PostgREST's on_conflict
-- takes column names and cannot target an expression index, so an index on
-- lower(email) would make every upsert fail. The API lowercases the address
-- before it reaches this table — one writer, one rule.
create unique index if not exists waitlist_email_interest_key
  on jobclaw.waitlist (email, interest);

-- ─── Access ───────────────────────────────────────────────────────────
alter table jobclaw.waitlist enable row level security;

-- Append-only, and nothing else.
--
-- The alternative was to write these rows with the service role key, but
-- that means shipping an RLS-bypassing credential to production so it can
-- store an email address. An insert-only grant is the smallest privilege
-- that does the work.
grant insert on jobclaw.waitlist to anon, authenticated;

-- There is deliberately no select/update/delete policy or grant. RLS denies
-- by default, so the list is readable only from the dashboard or a
-- service-role context — never from a browser holding the publishable key.
drop policy if exists waitlist_anon_insert on jobclaw.waitlist;
create policy waitlist_anon_insert
  on jobclaw.waitlist for insert
  to anon, authenticated
  with check (true);

-- ═══════════════════════════════════════════════════════════════════════
-- REQUIRED DASHBOARD STEP
--
--   Settings → API → "Exposed schemas" → add `jobclaw` → Save.
--
-- PostgREST serves only the schemas on that list. Until `jobclaw` is on it
-- the app gets PGRST106 ("schema must be one of the following") and the
-- waitlist form fails, even though every grant above is correct. This
-- cannot be done in SQL — it is a project setting, not a database object.
--
-- To read the list afterwards:
--   select email, interest, source, created_at
--   from jobclaw.waitlist order by created_at desc;
-- ═══════════════════════════════════════════════════════════════════════
