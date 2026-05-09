-- ═══════════════════════════════════════════════════════════════════════
-- VIRGIL — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- ═══════════════════════════════════════════════════════════════════════

-- Required extensions
create extension if not exists "vector" with schema "extensions";
create extension if not exists "pgcrypto";

-- ─── PROFILES (extends auth.users) ────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  full_name       text,
  plan            text not null default 'free' check (plan in ('free','starter','pro','power','enterprise')),
  stripe_customer_id  text,
  applications_used   int  not null default 0,
  applications_limit  int  not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── RESUMES ──────────────────────────────────────────────────────────
create table if not exists public.resumes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  storage_path    text not null,                   -- supabase storage key
  filename        text not null,
  parsed_profile  jsonb,                           -- AI-extracted structured data
  embedding       vector(1536),                    -- text-embedding-3-small
  created_at      timestamptz not null default now()
);
create index if not exists resumes_user_idx on public.resumes(user_id);

-- ─── JOBS (shared across all users) ───────────────────────────────────
create table if not exists public.jobs (
  id              uuid primary key default gen_random_uuid(),
  source_id       text unique,                      -- e.g. greenhouse_12345
  company         text not null,
  role            text not null,
  location        text,
  remote          boolean default false,
  ats_type        text not null,                    -- greenhouse / ashby / lever / workday / icims / taleo / cornerstone / manual
  url             text not null,
  description     text,
  embedding       vector(1536),
  scraped_at      timestamptz not null default now(),
  active          boolean not null default true
);
create index if not exists jobs_active_idx on public.jobs(active);
create index if not exists jobs_company_idx on public.jobs(lower(company));
create index if not exists jobs_embedding_idx on public.jobs using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ─── RECOMMENDATIONS (per-user matches) ───────────────────────────────
create table if not exists public.recommendations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  job_id          uuid not null references public.jobs(id) on delete cascade,
  resume_id       uuid not null references public.resumes(id) on delete cascade,
  score           numeric(4,2) not null,            -- 0.00 — 1.00 cosine similarity
  ai_rationale    text,
  created_at      timestamptz not null default now(),
  unique(user_id, job_id)
);
create index if not exists recs_user_idx on public.recommendations(user_id, score desc);

-- ─── APPLICATIONS (submission attempts) ───────────────────────────────
create table if not exists public.applications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  job_id          uuid not null references public.jobs(id) on delete cascade,
  resume_id       uuid not null references public.resumes(id),
  status          text not null default 'queued'
    check (status in ('queued','running','auto_submitted','manual_required','failed','skipped')),
  ats_type        text not null,
  worker_log      text,
  error_message   text,
  email_sent_at   timestamptz,
  submitted_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists apps_user_idx     on public.applications(user_id, created_at desc);
create index if not exists apps_status_idx   on public.applications(status) where status in ('queued','running');

-- ─── TAILORED DOCUMENTS (cached PDFs) ─────────────────────────────────
create table if not exists public.tailored_documents (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  doc_type        text not null check (doc_type in ('resume','cover_letter')),
  storage_path    text not null,
  ai_model        text,                              -- e.g. claude-sonnet-4.5
  tokens_in       int,
  tokens_out      int,
  created_at      timestamptz not null default now(),
  unique(application_id, doc_type)                  -- enables upsert caching
);

-- ─── USAGE EVENTS (token + $ tracking, source of truth for billing) ──
create table if not exists public.usage_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  event_type      text not null,                    -- parse_resume / tailor / match / apply / email
  ai_model        text,
  tokens_in       int default 0,
  tokens_out      int default 0,
  cost_cents      numeric(8,4) default 0,
  meta            jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists usage_user_date on public.usage_events(user_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════
alter table public.profiles            enable row level security;
alter table public.resumes             enable row level security;
alter table public.jobs                enable row level security;
alter table public.recommendations     enable row level security;
alter table public.applications        enable row level security;
alter table public.tailored_documents  enable row level security;
alter table public.usage_events        enable row level security;

-- Users see only their own rows
create policy "own profile"        on public.profiles           for all using (auth.uid() = id);
create policy "own resumes"        on public.resumes            for all using (auth.uid() = user_id);
create policy "own recs"           on public.recommendations    for all using (auth.uid() = user_id);
create policy "own applications"   on public.applications       for all using (auth.uid() = user_id);
create policy "own tailored docs"  on public.tailored_documents for all using (auth.uid() = user_id);
create policy "own usage"          on public.usage_events       for all using (auth.uid() = user_id);

-- Jobs are public-readable (everyone matches against the same pool)
create policy "jobs are readable"  on public.jobs               for select using (true);
-- Only service role can insert jobs (scraper uses service key)

-- ═══════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS — create these in Dashboard → Storage:
--   1. "resumes"          (private)
--   2. "tailored-docs"    (private)
-- Then add policy to each: "user can read/write own folder"
-- ═══════════════════════════════════════════════════════════════════════
