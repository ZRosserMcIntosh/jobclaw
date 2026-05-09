# Virgil Web — SaaS Architecture & Business Plan

> Converting the Jobclaw CLI into a hosted product:
> **virgil.app** (or whatever domain) — AI résumé tailoring + auto-apply, with Stripe billing.

---

## 1. The Product (User-Facing Flow)

```
┌──────────────────────────────────────────────────────────────┐
│  1. SIGN UP (Google / email magic link via Supabase Auth)    │
│  2. UPLOAD résumé (PDF / DOCX / ODT)                         │
│  3. AI parses → structured profile (skills, roles, location) │
│  4. AI surfaces 10 FREE matched jobs from our scrape         │
│  5. User clicks "Apply to all"                               │
│       → Auto-submitted (Greenhouse / Ashby / Lever)          │
│       → Or "Manual link" card with tailored PDFs to download │
│  6. Email + dashboard receipts for every application         │
│  7. Paywall kicks in past free tier                          │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Next.js 15 (App Router, RSC) | Vercel-native, streaming AI responses |
| **Hosting** | Vercel | One-click deploy from GitHub, edge functions |
| **Auth** | Supabase Auth (`@supabase/ssr`) | Free up to 50K MAU, OAuth + magic link |
| **Database** | Supabase Postgres | Row-Level Security, free tier 500MB |
| **Storage** | Supabase Storage | Résumé PDFs/DOCX, generated tailored PDFs |
| **Styling** | Tailwind CSS + shadcn/ui | Fast, themeable |
| **AI orchestration** | Vercel AI SDK | Streaming, multi-provider, token tracking |
| **AI models** | See §5 | Mix tiers for cost control |
| **PDF rendering** | `@react-pdf/renderer` (Vercel-friendly) OR Browserless.io for Playwright | Playwright won't run on Vercel free; use react-pdf |
| **Job scraper** | Existing `scrape-josh-mega.mjs` style scripts run as **Vercel Cron** (daily) → write to Supabase | Don't re-scrape on user request |
| **Auto-apply worker** | **Railway / Fly.io** background worker (Playwright requires headed Chromium) | Vercel can't run Playwright reliably |
| **Queue** | Supabase `application_jobs` table polled by worker | No need for Redis at first |
| **Payments** | Stripe (Checkout + Customer Portal) | Industry standard |
| **Email** | Resend (transactional) | 3K free/mo, dead-simple API |
| **Monitoring** | Vercel Analytics + Sentry free tier | |

### Why Playwright lives on Railway, not Vercel
Vercel functions cap at 60s and don't bundle Chromium. Auto-apply takes ~30s/job × 100 jobs = needs a long-running worker. Architecture:

```
Vercel (Next.js)  ──insert row──▶  Supabase  ◀──poll──  Railway worker
   user clicks                    application_jobs        runs Playwright
   "Apply"                          (status=queued)       updates row + sends email
```

---

## 3. Database Schema (Supabase SQL)

See `web/supabase/schema.sql` — copy/paste into Supabase SQL editor.

Tables:
- `profiles` — extends `auth.users`, stores plan tier + Stripe customer id
- `resumes` — uploaded files + AI-parsed structured JSON
- `jobs` — scraped postings (shared across all users)
- `recommendations` — per-user matched jobs + AI score
- `applications` — submission attempts (status: queued / auto_submitted / manual_required / failed)
- `tailored_documents` — generated résumé + cover letter PDFs per application
- `usage_events` — token + dollar tracking per user (billing source of truth)

All tables use RLS so users only see their own rows.

---

## 4. Repository Structure

```
jobclaw-main/                    ← keep CLI scripts at root
├── web/                         ← NEW: Next.js SaaS lives here
│   ├── app/
│   │   ├── (marketing)/         landing, pricing
│   │   ├── (auth)/              login, signup
│   │   ├── (dashboard)/
│   │   │   ├── upload/          résumé upload
│   │   │   ├── matches/         the 10 free recs
│   │   │   ├── applications/    submission history
│   │   │   └── settings/        billing portal
│   │   └── api/
│   │       ├── parse-resume/    AI extracts structured profile
│   │       ├── match-jobs/      vector search + LLM rerank
│   │       ├── tailor-resume/   AI rewrites for one role
│   │       ├── generate-pdf/    react-pdf render
│   │       ├── apply/           enqueue Playwright job
│   │       ├── stripe-webhook/  plan upgrades
│   │       └── cron/scrape/     daily job board refresh
│   ├── lib/
│   │   ├── supabase/{server,client,middleware}.ts
│   │   ├── ai/{tailor,parse,match}.ts
│   │   ├── stripe.ts
│   │   └── email.ts
│   ├── components/ui/           shadcn
│   ├── supabase/schema.sql
│   ├── package.json
│   └── .env.local               ← GITIGNORED
└── worker/                      ← NEW (Railway): Playwright auto-apply
    ├── index.mjs                polls Supabase, runs blitz-josh logic
    └── package.json
```

---

## 5. AI Model Selection (cost-optimized cascade)

| Job | Model | Input cost | Output cost | Per-call cost (est) |
|---|---|---|---|---|
| **Parse résumé → JSON** (one-shot, 2K tok in / 1K out) | `gemini-2.5-flash` | $0.075/M | $0.30/M | **~$0.0005** |
| **Match jobs → score** (cheap embedding search) | `text-embedding-3-small` | $0.02/M | — | **~$0.00002** per job |
| **Rerank top 50→10** (LLM judge) | `gpt-4o-mini` | $0.15/M | $0.60/M | **~$0.002** total |
| **Tailor résumé** (per application, the expensive one — 4K in / 2K out) | `claude-haiku-4.5` OR `gpt-4o-mini` | $0.80/M / $0.15/M | $4/M / $0.60/M | **$0.011** (Haiku) / **$0.0018** (4o-mini) |
| **Premium tier tailoring** (better writing) | `claude-sonnet-4.5` | $3/M | $15/M | **~$0.042** per app |

**Default cascade:** `gpt-4o-mini` for free + Starter, `claude-sonnet-4.5` for Pro/Enterprise.

### Per-user cost (worst case, 100 applications/mo):
- 1× résumé parse: $0.0005
- 100× embedding match: $0.002
- 100× rerank: $0.05
- 100× tailored docs (4o-mini): $0.18
- 100× PDF rendering: $0 (react-pdf is free)
- 100× emails (Resend): $0 (under 3K free)
- **Total AI cost: ~$0.23/user/month**
- Auto-apply worker: ~$0.04/user/mo (Railway shared instance)
- **All-in cost: ~$0.27/user/mo**

---

## 6. Pricing (with profit margin math)

| Plan | Price | Includes | Our cost | **Margin** |
|---|---|---|---|---|
| **Free** | $0 | Upload résumé, see 10 matches, download PDFs | $0.01 | loss-leader (acquisition) |
| **Starter** | **$19/mo** | 25 auto-applies/mo, GPT-4o-mini tailoring | $0.10 | **99.5% / $18.90** |
| **Pro** | **$49/mo** | 100 auto-applies/mo, Claude Sonnet tailoring, daily new matches | $0.31 | **99.4% / $48.69** |
| **Power** | **$99/mo** | 300 auto-applies/mo, priority queue, interview prep AI | $0.85 | **99.1% / $98.15** |
| **Pay-per-app** | **$3/application** | One-off, no subscription | $0.003 | **99.9% / $2.997** |
| **Enterprise / Coach** | **$299/mo** | 5 candidates, branded PDFs, white-label | $1.50 | **99.5% / $297.50** |

### Why these prices work:
- Indeed/ZipRecruiter resume services are $30–$80/mo with no auto-apply
- LazyApply / Sonara charge $30–$100/mo for similar auto-apply
- We undercut on Starter, match on Pro, beat on quality with Sonnet
- **Even if we 10× our AI usage, margins stay >95%**

### Stripe setup:
4 products (Starter, Pro, Power, Enterprise) + 1 metered product (per-app overages at $1.50 each above plan limit).

---

## 7. Anti-Abuse / Cost Controls

1. **Hard token caps per user per day** enforced in `lib/ai/budget.ts` (kill switch if a single user exceeds $1/day on free tier)
2. **Embeddings cached** in Supabase pgvector — never re-embed the same job
3. **Tailored PDFs cached** by `(user_id, job_id, profile_hash)` — never re-tailor unchanged data
4. **Rate limit:** 5 résumé uploads/day, 1 mass-apply/hour (Upstash Redis free tier)
5. **Captcha on signup:** Cloudflare Turnstile (free)

---

## 8. Build Phases

| Phase | Scope | Duration |
|---|---|---|
| **0 — Scaffold** | Next.js + Supabase auth + landing page | ✅ done in this PR |
| **1 — Core flow** | Upload → AI parse → 10 free matches → download PDFs | 1 week |
| **2 — Stripe + paywall** | Plans, Customer Portal, metered overages | 3 days |
| **3 — Auto-apply worker** | Railway worker polls Supabase, runs Playwright | 1 week |
| **4 — Email + receipts** | Resend integration, dashboard activity feed | 2 days |
| **5 — Daily scraper cron** | Vercel Cron runs `scrape-mega.mjs` → Supabase | 2 days |
| **6 — Polish** | Onboarding, refer-a-friend, SEO landing pages | ongoing |

---

## 9. Immediate Next Steps (you do these)

1. **Supabase:** open SQL editor → paste `web/supabase/schema.sql` → run
2. **Vercel:** "Add New" → import this GitHub repo → set **Root Directory = `web`** → paste env vars
3. **API keys to add to Vercel env later:**
   - `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`)
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, plan price IDs
   - `RESEND_API_KEY`
4. **Domain:** point a domain at Vercel (or use the free `*.vercel.app`)

I'll handle all the code.
