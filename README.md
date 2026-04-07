# 🦀 JobClaw

### Virgil — Your AI Job Search Agent

> Virgil scrapes 250+ company boards, scores roles by relevance, auto-fills ATS applications, generates tailored CVs and cover letters, and tracks your entire pipeline — all from the terminal.

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

## What Virgil Does

**Virgil is an autonomous job-hunting agent.** You configure your profile once, and Virgil handles the rest:

1. **Scrapes jobs** from Greenhouse, Ashby, and Lever API boards (250+ companies, 4000+ raw listings per run)
2. **Scores every role** for relevance to your profile (full-stack, frontend, React, Node, etc.)
3. **Picks 1 best job per company** — no spam, no repeats
4. **Auto-fills ATS forms** via Playwright browser automation (name, email, phone, resume upload, cover letter)
5. **Generates tailored PDFs** — ATS-optimized CVs and cover letters with custom fonts and embedded signatures
6. **Tracks everything** — submitted/manual/warning/error status for every application
7. **Maintains a company blocklist** — never applies twice to the same company across runs

### Battle-Tested Results

| Wave | Jobs | Submitted | Rate | Time |
|------|------|-----------|------|------|
| Wave 1 | 5 | 5 | 100% | Manual |
| Wave 2 | 5 | 5 | 100% | Manual |
| Wave 3 | 100 | 62 | 62% | 23 min |
| Wave 4 | 284 | 210 | 74% | 83 min |
| Wave 5 | 97 | 64 | 66% | ~40 min |
| **Total** | **491** | **346** | **70%** | **~2.5 hrs** |

> 346 applications across 100+ unique companies in one afternoon.

## How It Works

```
┌─────────────────────────────────────────────────────┐
│  1. SCRAPE                                          │
│  scrape-jobs-v3.mjs                                 │
│  ├── Greenhouse boards-api (150+ companies)         │
│  ├── Ashby posting-api (60+ companies)              │
│  ├── Lever postings API (40+ companies)             │
│  ├── Jobicy remote API                              │
│  └── Filters: blocklist, 1-per-company, relevance   │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  2. SCORE & SELECT                                  │
│  roleScore() → ranks by keyword relevance           │
│  pickBestPerCompany() → 1 highest-scoring per co    │
│  Output: /tmp/wave-jobs.json                        │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  3. AUTO-APPLY                                      │
│  mega-blitz-v3.mjs                                  │
│  ├── Launches Playwright Chromium                   │
│  ├── Fills name/email/phone/resume/cover letter     │
│  ├── Handles Greenhouse, Ashby, Lever forms         │
│  ├── Logs: ✅ submitted / ⚠️ manual / ❌ error      │
│  └── Updates blocklist after each submission        │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│  4. TRACK                                           │
│  output/blitz-log-{date}.md                         │
│  data/applications.md                               │
│  /tmp/applied-companies.json (blocklist)            │
└─────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/ZRosserMcIntosh/jobclaw.git
cd jobclaw && npm install
npx playwright install chromium

# 2. Configure your profile
cp config/profile.example.yml config/profile.yml   # Edit with your details

# 3. Add your CV
# Create cv.md in the project root (markdown format)

# 4. Run with Claude Code
claude   # Opens Claude Code in this directory
# Then: "Scrape jobs and apply to everything that matches my profile"
```

## Core Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `scrape-jobs-v3.mjs` | Smart scraper: 250+ boards, 1-per-company, role scoring, blocklist | `npm run scrape` |
| `mega-blitz-v3.mjs` | Auto-apply engine: Playwright ATS form-filling | `npm run blitz` |
| `generate-cv-pdf.mjs` | CV markdown → ATS-optimized PDF | `npm run cv` |
| `generate-cover-letter-pdf.mjs` | Cover letter → PDF with embedded signature | `npm run cover-letter` |
| `generate-pdf.mjs` | Core HTML→PDF renderer (Playwright) | `npm run pdf` |
| `verify-pipeline.mjs` | Pipeline health check | `npm run verify` |
| `merge-tracker.mjs` | Merge batch tracker additions | `npm run merge` |
| `normalize-statuses.mjs` | Normalize application statuses | `npm run normalize` |
| `dedup-tracker.mjs` | Deduplicate tracker entries | `npm run dedup` |

## Evaluation Pipeline (Original career-ops)

Virgil also retains the full **offer evaluation pipeline** from career-ops:

- **Auto-Pipeline** — Paste a URL → structured A-F evaluation + tailored PDF + tracker entry
- **6-Block Evaluation** — Role summary, CV match, level strategy, comp research, personalization, STAR+R interview prep
- **Interview Story Bank** — Accumulates STAR+Reflection stories across evaluations
- **Portal Scanner** — 45+ companies pre-configured across Greenhouse, Ashby, Lever, Wellfound
- **Batch Processing** — Parallel evaluation with `claude -p` workers
- **Dashboard TUI** — Terminal UI to browse, filter, and sort your pipeline (Go + Bubble Tea)

## ATS Compatibility

| Platform | Auto-Apply | Notes |
|----------|-----------|-------|
| **Greenhouse** | ✅ | Highest success rate. Standard form fields. |
| **Ashby** | ✅ | JSON posting API + standard forms. |
| **Lever** | ✅ | Needs `/apply` suffix on URL. |
| **Workable** | ✅ | Works with standard forms. |
| **Custom portals** | ⚠️ Manual | Coinbase, Stripe, Brex, Datadog, MongoDB — flagged for manual review. |

## Project Structure

```
jobclaw/
├── CLAUDE.md                        # Virgil agent instructions
├── cv.md                            # Your CV (create this)
├── config/
│   └── profile.example.yml          # Profile template
├── modes/                           # 14 skill modes for Claude Code
│   ├── _shared.md                   # Shared context (customize)
│   └── ...
├── scrape-jobs-v3.mjs               # Smart job scraper
├── mega-blitz-v3.mjs                # Auto-apply engine
├── generate-pdf.mjs                 # Core PDF renderer
├── generate-cv-pdf.mjs              # CV → PDF
├── generate-cover-letter-pdf.mjs    # Cover letter → PDF
├── verify-pipeline.mjs              # Health checks
├── merge-tracker.mjs                # Tracker merge
├── normalize-statuses.mjs           # Status normalization
├── dedup-tracker.mjs                # Dedup tracker
├── templates/
│   ├── cv-template.html             # ATS-optimized CV design
│   ├── cover-letter-template.html   # Cover letter design
│   ├── portals.example.yml          # Scanner config
│   └── states.yml                   # Canonical statuses
├── dashboard/                       # Go TUI pipeline viewer
├── batch/                           # Batch processing with claude -p
├── fonts/                           # Space Grotesk + DM Sans
├── data/                            # Tracking data (gitignored)
├── reports/                         # Evaluation reports (gitignored)
├── output/                          # Generated PDFs (gitignored)
└── docs/                            # Architecture, setup, customization
```

## Tech Stack

- **Agent**: Claude Code with custom skills and modes
- **Automation**: Playwright (Chromium headless) for ATS form-filling + PDF generation
- **Scraping**: Greenhouse boards-api, Ashby posting-api, Lever postings API, Jobicy
- **Dashboard**: Go + Bubble Tea + Lipgloss (Catppuccin Mocha theme)
- **Data**: Markdown tables + YAML config + TSV batch files + JSON blocklists

## Credits

Forked from [career-ops](https://github.com/santifer/career-ops) by Santiago Fernández, who used the original system to evaluate 740+ offers and land a Head of Applied AI role.

Virgil extends career-ops with autonomous job scraping, role relevance scoring, automated ATS form-filling, cover letter generation, company blocklist management, and crash-resilient batch processing.

## Author

**Zachary Rosser McIntosh**
- Portfolio: [mcintoshdigital.vercel.app](https://mcintoshdigital.vercel.app)
- GitHub: [@ZRosserMcIntosh](https://github.com/ZRosserMcIntosh)
- Email: zrossermcintosh@protonmail.com

## License

MIT
