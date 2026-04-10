# 🦀 JobClaw

### Virgil — Your AI Job Search Agent

> **975 companies. 759 auto-submitted applications. 32 waves. One terminal.**
>
> Virgil scrapes 600+ company boards across 3 ATS platforms and 5 job board APIs, scores roles by relevance, auto-fills application forms via headless browser, generates tailored CVs and cover letters, and tracks your entire pipeline — all from the terminal.

![Claude Code](https://img.shields.io/badge/Claude_Code-000?style=flat&logo=anthropic&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=flat&logo=go&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

<p align="center">
  <img src="docs/demo.gif" alt="Virgil demo" width="700" />
</p>

---

## Table of Contents

- [What Virgil Does](#what-virgil-does)
- [Battle-Tested Results](#battle-tested-results)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Core Scripts](#core-scripts)
- [Scraping Engine](#scraping-engine)
- [Auto-Apply Engine](#auto-apply-engine)
- [ATS Compatibility](#ats-compatibility)
- [Evaluation Pipeline](#evaluation-pipeline)
- [Dashboard TUI](#dashboard-tui)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Credits](#credits)
- [License](#license)

---

## What Virgil Does

**Virgil is an autonomous job-hunting agent.** You configure your profile once, and Virgil handles the rest:

1. **Scrapes jobs** from Greenhouse, Ashby, Lever boards + Jobicy, Arbeitnow, WeWorkRemotely, Himalayas APIs (600+ companies, 4000+ raw listings per run)
2. **Scores every role** using a 3-tier relevance engine (strong/good/ok match)
3. **Picks 1 best job per company** — no spam, no repeats
4. **Auto-fills ATS forms** via Playwright browser automation (name, email, phone, resume upload, cover letter)
5. **Generates tailored PDFs** — ATS-optimized CVs and cover letters with Space Grotesk + DM Sans custom fonts
6. **Tracks everything** — submitted/manual/warning/error status for every application
7. **Maintains a company blocklist** — never applies twice to the same company across runs
8. **Crash recovery** — checkpoint files + `--skip N` flags let you resume from where a run stopped
9. **Wave-based scaling** — run 32+ independent scrape→blitz waves targeting different company discovery strategies

---

## Battle-Tested Results

### Cumulative Performance (32 Waves)

| Metric | Value |
|--------|-------|
| Total jobs processed | **3,214** |
| ✅ Auto-submitted | **759** |
| Companies in blocklist | **975** |
| Waves completed | **32** |
| ATS platforms automated | **3** (Greenhouse, Ashby, Lever) |
| Job board APIs scraped | **5** (Jobicy, Arbeitnow, WWR, Himalayas, RemoteOK) |

### ATS Success Rates

| Platform | Submitted | Attempted | **Success Rate** |
|----------|-----------|-----------|-----------------|
| **Ashby** | 535 | 563 | **95%** 🟢 |
| **Greenhouse** | 224 | 440 | **51%** 🟡 |
| **Lever** | 0 | 119 | **0%** 🔴 *(fix in progress)* |
| Custom/Manual | 0 | 1,972 | N/A (flagged for manual) |

### Wave-by-Wave Breakdown

<details>
<summary>Click to expand full wave history</summary>

| Wave | Jobs | ✅ Submit | Rate | ⚠️ NoBtn | 📋 Manual | ❌ Error |
|------|------|----------|------|---------|----------|--------|
| W8 | 125 | 91 | 73% | 25 | 9 | 0 |
| W9 | 96 | 68 | 71% | 13 | 10 | 1 |
| W10 | 49 | 34 | 69% | 5 | 10 | 0 |
| W11 | 15 | 8 | 53% | 3 | 4 | 0 |
| W12 | 181 | 64 | 35% | 18 | 96 | 1 |
| W13 | 210 | 66 | 31% | 19 | 121 | 4 |
| W14 | 237 | 82 | 35% | 21 | 129 | 5 |
| W15 | 178 | 38 | 21% | 10 | 129 | 1 |
| W16 | 159 | 25 | 16% | 1 | 133 | 0 |
| W17 | 182 | 35 | 19% | 20 | 127 | 0 |
| W18 | 172 | 25 | 15% | 18 | 128 | 1 |
| W19 | 131 | 1 | 1% | 1 | 129 | 0 |
| W20 | 158 | 25 | 16% | 6 | 126 | 1 |
| W21 | 146 | 16 | 11% | 3 | 126 | 1 |
| W22 | 154 | 21 | 14% | 8 | 125 | 0 |
| W23 | 207 | 36 | 17% | 43 | 123 | 5 |
| W24 | 167 | 24 | 14% | 17 | 125 | 1 |
| W25 | 151 | 12 | 8% | 16 | 122 | 1 |
| W26 | 168 | 24 | 14% | 17 | 125 | 2 |
| W27 | 91 | 14 | 15% | 1 | 75 | 1 |
| W28 | 73 | 18 | 25% | 28 | 1 | 26 |
| W29 | 44 | 9 | 20% | 10 | 1 | 24 |
| W30 | 44 | 10 | 23% | 7 | 1 | 26 |
| W31 | 33 | 3 | 9% | 6 | 1 | 23 |
| W32 | 43 | 10 | 23% | 7 | 1 | 25 |

</details>

### Key Observations

- **Ashby is the gold standard** — 95% auto-submit success rate across 563 attempts
- **Greenhouse works but has edge cases** — 51% due to "no submit button" on non-standard board themes
- **Custom/job-board URLs** are auto-flagged for manual review (by design — these aren't ATS forms)
- **Early waves (8–11)** achieved 53–73% submit rates before the blocklist grew large
- **Later waves** saw diminishing returns as easy-to-apply companies were exhausted

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  1. DISCOVER                                                   │
│  scrape-wave{N}.mjs / discover-boards.mjs                     │
│  ├── Company slug generation (English words, VC portfolios,    │
│  │   tech unicorns, industry verticals, Latin/Greek roots,     │
│  │   accelerator alumni, open-source orgs, geographic names)   │
│  └── Probe Greenhouse + Ashby + Lever APIs for valid boards    │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│  2. SCRAPE & SCORE                                             │
│  scrape-jobs-v3.mjs                                            │
│  ├── Greenhouse boards-api (200+ companies)                    │
│  ├── Ashby posting-api (150+ companies)                        │
│  ├── Lever postings API (100+ companies)                       │
│  ├── Jobicy, Arbeitnow, WWR, Himalayas APIs                   │
│  ├── roleScore() — 3-tier keyword relevance (strong/good/ok)   │
│  ├── pickBestPerCompany() — 1 highest-scoring per company      │
│  ├── Company blocklist filter (/tmp/applied-companies.json)    │
│  └── Output: /tmp/wave{N}-jobs.json                            │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│  3. AUTO-APPLY                                                 │
│  mega-blitz-v4.mjs (Playwright headless Chromium)              │
│  ├── Greenhouse handler — form-fill + submit                   │
│  ├── Ashby handler — form-fill + submit (95% success)          │
│  ├── Lever handler — form-fill + submit                        │
│  ├── Custom URL → flagged for manual review                    │
│  ├── Cover letter generation (per-company templated)           │
│  ├── Resume upload (PDF)                                       │
│  ├── Screenshot capture for verification                       │
│  └── Blocklist update after each ✅                             │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────────┐
│  4. TRACK & ANALYZE                                            │
│  ├── /tmp/wave{N}-blitz-output.log — per-wave execution log    │
│  ├── /tmp/applied-companies.json — persistent company blocklist│
│  ├── data/applications.md — canonical application tracker      │
│  └── output/blitz-log-{date}.md — markdown summary reports     │
└────────────────────────────────────────────────────────────────┘
```

### Company Discovery Strategies

Virgil uses multiple strategies to find companies with ATS boards, each implemented as a wave scraper:

| Strategy | Example Slugs | Typical Yield |
|----------|--------------|---------------|
| English dictionary words | apple, stripe, notion | 150–200 companies |
| VC portfolio companies | a16z, sequoia, accel | 100–150 companies |
| Tech unicorn lists | databricks, figma, canva | 80–120 companies |
| Industry verticals | fintech, healthtech, edtech | 100–170 companies |
| Latin/Greek roots | aurora, nova, nexus | 100–150 companies |
| Accelerator alumni | YC, Techstars batches | 50–80 companies |
| Open-source organizations | CNCF, Linux Foundation | 30–50 companies |
| Geographic + compound words | bay, pacific, blue | 30–50 companies |
| Abbreviation/acronym patterns | ai, ml, dev | 30–50 companies |

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/ZRosserMcIntosh/jobclaw.git
cd jobclaw && npm install
npx playwright install chromium

# 2. Configure your profile
cp config/profile.example.yml config/profile.yml
# Edit with your name, email, target roles, and details

# 3. Add your CV
# Create cv.md in the project root (markdown format)
# Then generate the PDF:
npm run cv

# 4. Run with Claude Code
claude
# Then: "Scrape jobs and auto-apply to everything that matches my profile"
```

### Manual Operation (without Claude Code)

```bash
# Scrape jobs from all boards
node scrape-jobs-v3.mjs
# Output: /tmp/wave6-jobs.json

# Run the auto-apply blitz
WAVE_NAME=wave6 JOBS_PATH=/tmp/wave6-jobs.json node mega-blitz-v4.mjs

# Check blocklist
node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/applied-companies.json','utf8')).length)"
```

---

## Core Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `scrape-jobs-v3.mjs` | Smart scraper: 600+ boards, 1-per-company, role scoring, blocklist | `npm run scrape` |
| `mega-blitz-v4.mjs` | Auto-apply engine: Playwright ATS form-filling (v4 with crash recovery) | `npm run blitz` |
| `generate-pdf.mjs` | Core HTML→PDF renderer (Playwright) | `npm run pdf` |
| `verify-pipeline.mjs` | Pipeline health check | `npm run verify` |
| `merge-tracker.mjs` | Merge batch tracker additions | `npm run merge` |
| `normalize-statuses.mjs` | Normalize application statuses | `npm run normalize` |
| `dedup-tracker.mjs` | Deduplicate tracker entries | `npm run dedup` |
| `cv-sync-check.mjs` | Validate CV/profile consistency | `npm run sync-check` |
| `discover-boards.mjs` | Probe ATS APIs to find new company boards | `node discover-boards.mjs` |

---

## Scraping Engine

### Role Relevance Scoring

Every scraped job is scored on a 3-tier system:

```javascript
// Score 3 — STRONG MATCH (core skills)
/full.?stack|frontend|front.?end|react|next\.?js|typescript|node|javascript|web.?dev|software.?engineer|swe\b/i

// Score 2 — GOOD MATCH (adjacent skills)
/engineer|developer|architect|platform|devops|sre|mobile|ios|swift|backend|python|golang|rust/i

// Score 1 — OK MATCH (tangential)
/technical|product|data|design|qa|support|analyst|manager|consultant/i

// Score 0 — no match → still scraped but ranked last
```

The scraper picks the **single highest-scoring job per company**, then sorts all results by ATS priority (Ashby > Greenhouse > Lever > custom) and role score. This ensures auto-submittable, high-relevance jobs are processed first.

### Board Discovery

The `discover-boards.mjs` and `scrape-wave{N}.mjs` scripts generate candidate company slugs and probe the three ATS APIs:

```
Greenhouse: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
Ashby:      https://api.ashbyhq.com/posting-api/job-board/{slug}
Lever:      https://api.lever.co/v0/postings/{slug}?mode=json
```

A valid response means the company uses that ATS and has open roles. Over 32 waves, this approach discovered **975+ unique companies**.

---

## Auto-Apply Engine

The `mega-blitz-v4.mjs` script launches a headless Chromium browser and processes each job:

1. **Navigate** to the job application page
2. **Detect** the ATS platform (Greenhouse / Ashby / Lever / custom)
3. **Fill** standard fields: first name, last name, email, phone, LinkedIn, GitHub, website
4. **Upload** resume PDF
5. **Generate and paste** a templated cover letter
6. **Submit** the form
7. **Screenshot** the result for verification
8. **Update blocklist** to prevent re-application

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `WAVE_NAME` | Label for this wave (used in logs) | `wave` |
| `JOBS_PATH` | Path to the scraped jobs JSON | `/tmp/wave-jobs.json` |
| `--skip N` | Skip the first N jobs (crash recovery) | `0` |

### Running a Blitz

```bash
# Standard run
WAVE_NAME=wave32 JOBS_PATH=/tmp/wave32-jobs.json node mega-blitz-v4.mjs

# Background with logging
WAVE_NAME=wave32 JOBS_PATH=/tmp/wave32-jobs.json \
  nohup node mega-blitz-v4.mjs > /tmp/wave32-blitz-output.log 2>&1 &

# Resume from job 50 after a crash
WAVE_NAME=wave32 JOBS_PATH=/tmp/wave32-jobs.json node mega-blitz-v4.mjs --skip 50
```

---

## ATS Compatibility

| Platform | Success Rate | Status | Notes |
|----------|-------------|--------|-------|
| **Ashby** | **95%** | ✅ Production | Highest success rate. Clean JSON API + standard form fields. |
| **Greenhouse** | **51%** | ✅ Production | Standard boards work great. Some custom-themed boards lack standard submit buttons. |
| **Lever** | **0%** | 🔧 In Progress | DOM structure changes need updated selectors. See [Roadmap](#roadmap). |
| **Jobicy** | N/A | 📋 Manual | Job board — URLs flagged for manual application. |
| **Arbeitnow** | N/A | 📋 Manual | Job board — URLs flagged for manual application. |
| **WeWorkRemotely** | N/A | 📋 Manual | RSS feed — URLs flagged for manual application. |
| **Custom portals** | N/A | 📋 Manual | Workday, iCIMS, Jobvite, etc. — flagged for manual review. |

---

## Evaluation Pipeline

Virgil retains the full **offer evaluation pipeline** from career-ops:

- **Auto-Pipeline** — Paste a URL → structured A-F evaluation + tailored PDF + tracker entry
- **6-Block Evaluation** — Role summary, CV match, level strategy, comp research, personalization, STAR+R interview prep
- **Interview Story Bank** — Accumulates STAR+Reflection stories across evaluations (`interview-prep/story-bank.md`)
- **Portal Scanner** — 45+ companies pre-configured across Greenhouse, Ashby, Lever, Wellfound
- **Batch Processing** — Parallel evaluation with `claude -p` workers
- **14 Skill Modes** — Specialized Claude Code modes for different tasks (evaluate, scan, apply, track, etc.)

---

## Dashboard TUI

A standalone Go terminal UI for browsing and managing your pipeline:

```bash
cd dashboard && go run .
```

- Filter tabs: All, Evaluated, Applied, Interview, Top ≥4, Skip
- Sort by: Score, Date, Company, Status
- Grouped/flat view with lazy-loaded report previews
- Inline status picker
- Built with Bubble Tea + Lipgloss (Catppuccin Mocha theme)

---

## Project Structure

```
jobclaw/
├── CLAUDE.md                          # Virgil agent instructions
├── CONTRIBUTING.md                    # Contribution guidelines
├── CITATION.cff                       # Citation metadata
├── package.json                       # Dependencies + npm scripts
│
├── config/
│   └── profile.example.yml            # Profile template (copy → profile.yml)
│
├── modes/                             # 14 skill modes for Claude Code
│   ├── _shared.md                     # Shared context (customize for your profile)
│   ├── auto-pipeline.md               # Paste URL → full evaluation
│   ├── apply.md                       # Fill application forms
│   ├── scan.md                        # Search portals for new offers
│   ├── pipeline.md                    # Process pending URLs
│   ├── tracker.md                     # Manage application tracker
│   ├── batch.md                       # Batch processing
│   └── ...                            # + 7 more specialized modes
│
├── scrape-jobs-v3.mjs                 # Smart job scraper (core: 600+ boards)
├── discover-boards.mjs                # ATS board discovery tool
├── scrape-wave{8-34}.mjs              # 27 wave-specific scraper configs
├── scrape-mega.mjs                    # Mega scraper (all strategies combined)
│
├── examples/
│   ├── mega-blitz-example.mjs         # Auto-apply engine template
│   └── scrape-jobs-example.mjs        # Scraper template
│
├── generate-pdf.mjs                   # Core HTML→PDF renderer
├── verify-pipeline.mjs                # Pipeline health checks
├── merge-tracker.mjs                  # Merge tracker additions
├── normalize-statuses.mjs             # Normalize application statuses
├── dedup-tracker.mjs                  # Deduplicate tracker entries
├── cv-sync-check.mjs                  # CV/profile consistency check
│
├── templates/
│   ├── cv-template.html               # ATS-optimized CV design
│   ├── portals.example.yml            # Scanner company config
│   └── states.yml                     # Canonical application statuses
│
├── interview-prep/
│   └── story-bank.md                  # STAR+R interview stories
│
├── dashboard/                         # Go TUI pipeline viewer
│   ├── main.go
│   └── internal/
│       ├── data/                      # Data loading
│       ├── model/                     # App state
│       ├── theme/                     # Catppuccin Mocha theme
│       └── ui/screens/               # Pipeline + viewer screens
│
├── batch/                             # Batch processing (claude -p)
│   ├── batch-prompt.md
│   ├── batch-runner.sh
│   └── tracker-additions/
│
├── fonts/                             # Space Grotesk + DM Sans (woff2)
├── docs/                              # Architecture, setup, customization
├── data/                              # Tracking data (gitignored)
├── reports/                           # Evaluation reports (gitignored)
├── output/                            # Generated PDFs (gitignored)
└── jds/                               # Job descriptions (gitignored)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI Agent** | Claude Code with 14 custom skill modes |
| **Browser Automation** | Playwright (Chromium headless) — ATS form-filling + PDF generation |
| **ATS Scraping** | Greenhouse boards-api, Ashby posting-api, Lever postings API |
| **Job Board APIs** | Jobicy, Arbeitnow, WeWorkRemotely (RSS), Himalayas |
| **Dashboard** | Go + Bubble Tea + Lipgloss (Catppuccin Mocha theme) |
| **PDF Generation** | Playwright HTML→PDF with custom woff2 fonts |
| **Data Layer** | Markdown tables, YAML config, TSV batch files, JSON blocklists |
| **Runtime** | Node.js 18+ (ESM modules) |

---

## Roadmap

### Next Week (v2.1)

- [ ] **Fix Lever auto-submit** — Update DOM selectors for Lever's current form structure (currently 0% success rate across 119 attempts)
- [ ] **Improve Greenhouse "no submit" handling** — Add fallback selectors and multi-step form navigation for non-standard board themes (182 failures at 51% rate → target 70%+)
- [ ] **Remove dead RemoteOK URLs** — Fix URL concatenation bug causing 115 DNS errors across waves 28–32
- [ ] **Pre-filter custom/manual jobs** — Skip non-ATS URLs before the blitz to save ~60% processing time (1,977 jobs currently processed with 0% auto-submit)
- [ ] **Add retry logic for timeouts** — Implement 2–3 retry attempts for the 9 timeout failures per run

### Near Term (v2.2)

- [ ] **Workday auto-apply handler** — Playwright automation for Workday application forms (one of the most common enterprise ATS platforms)
- [ ] **iCIMS auto-apply handler** — Second most common enterprise ATS
- [ ] **Smart cover letter generation** — Use Claude to generate role-specific cover letters instead of templates
- [ ] **Application response tracking** — Monitor email inbox for interview invites and auto-update tracker status
- [ ] **Wave orchestrator** — Single command to run discover→scrape→blitz→analyze pipeline end-to-end

### Medium Term (v3.0)

- [ ] **LinkedIn Easy Apply automation** — Browser automation for LinkedIn's one-click apply flow
- [ ] **Real-time dashboard** — Live WebSocket-powered dashboard showing blitz progress
- [ ] **Job recommendation engine** — ML-based role scoring using past application success data instead of regex keywords
- [ ] **Multi-resume support** — Auto-select the best resume variant based on role type (frontend vs. backend vs. full-stack)
- [ ] **Distributed blitz** — Run multiple Playwright instances in parallel across different waves
- [ ] **Greenhouse custom theme detector** — Pre-scan Greenhouse boards to identify non-standard layouts before attempting submission
- [ ] **Application quality scoring** — Use LLM to evaluate how well the candidate's profile matches each JD before submitting

### Long Term (v4.0)

- [ ] **Interview scheduling automation** — Parse scheduling links from emails and auto-book preferred time slots
- [ ] **Salary negotiation assistant** — Comp research + negotiation scripts based on role, level, and location
- [ ] **Offer comparison dashboard** — Side-by-side comparison of multiple offers with weighted scoring
- [ ] **Portfolio auto-updater** — Automatically update portfolio site with latest project data
- [ ] **Recruiter outreach automation** — LinkedIn + email outreach with personalized messages for target companies

---

## Pipeline Analysis

Want to analyze your own pipeline performance? The blitz logs contain structured data:

```bash
# Count submissions per wave
grep -c 'Submitted' /tmp/wave{N}-blitz-output.log

# Check ATS success rates
python3 -c "
import re
with open('/tmp/wave8-blitz-output.log') as f:
    lines = f.readlines()
ats = None
stats = {}
for line in lines:
    m = re.match(r'\[\s*\d+/\d+\]\s+(\w+)', line)
    if m: ats = m.group(1).lower()
    if ats and 'Submitted' in line:
        stats[ats] = stats.get(ats, 0) + 1
        ats = None
print(stats)
"

# Check blocklist size
node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/applied-companies.json','utf8')).length)"
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Key areas where contributions are welcome:
- New ATS handlers (Workday, iCIMS, Jobvite, BambooHR)
- Improved Greenhouse form detection
- Additional company discovery strategies
- Dashboard features and themes
- Documentation and examples

---

## Credits

Forked from [career-ops](https://github.com/santifer/career-ops) by Santiago Fernández, who used the original system to evaluate 740+ offers and land a Head of Applied AI role.

Virgil extends career-ops with autonomous job scraping across 600+ companies, role relevance scoring, automated ATS form-filling via Playwright, wave-based scaling to 975+ companies, cover letter generation, company blocklist management, and crash-resilient batch processing.

---

## Author

**Zachary Rosser McIntosh**

- 🌐 Portfolio: [mcintoshdigital.vercel.app](https://mcintoshdigital.vercel.app)
- 🐙 GitHub: [@ZRosserMcIntosh](https://github.com/ZRosserMcIntosh)
- 📧 Email: zrossermcintosh@protonmail.com
- 📍 São Paulo, Brazil

---

## License

MIT — see [LICENSE](LICENSE) for details.
