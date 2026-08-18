-- ═══════════════════════════════════════════════════════════════════════
-- JOBCLAW — Auto-apply waitlist
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- Auto-apply does not exist yet. Rather than claim it on the marketing
-- site, we collect intent here and measure real demand before building
-- the hardest, most ToS-fraught part of the product.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  -- Which unbuilt capability the person actually wants. Lets us rank
  -- what to build rather than guess.
  interest    text not null default 'auto_apply'
                check (interest in ('auto_apply','recruiter_outreach','interview_prep')),
  source      text,
  created_at  timestamptz not null default now()
);

-- One row per address per interest: a second signup is a no-op, not a
-- duplicate. Paired with ON CONFLICT DO NOTHING in the API route, this
-- also means the endpoint cannot be used to probe who is already listed.
--
-- Plain columns, not lower(email), on purpose: PostgREST's on_conflict
-- takes column names and cannot target an expression index, so an index
-- on lower(email) would make every upsert fail. The API lowercases the
-- address before it ever reaches this table, which is where case folding
-- belongs — one writer, one rule.
create unique index if not exists waitlist_email_interest_key
  on public.waitlist (email, interest);

alter table public.waitlist enable row level security;

-- Insert-only, and nothing else.
--
-- The alternative was to write these rows with the service role key, but
-- that would mean shipping a key that bypasses RLS on every table to a
-- deployment whose only job here is appending an email. An append-only
-- grant is the smallest privilege that does the work.
--
-- There is deliberately no select/update/delete policy: RLS denies by
-- default, so the list can be read only from the Supabase dashboard or a
-- service-role context — never from a browser holding the publishable key.
create policy "waitlist_anon_insert"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);
