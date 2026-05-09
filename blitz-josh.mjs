#!/usr/bin/env node
/**
 * blitz-josh.mjs — JOSH AUTO-APPLY + EMAIL AGENT
 *
 * For each of the top 100 companies in /tmp/josh-mega-jobs.json:
 *   1. Finds the pre-rendered résumé + cover letter PDFs in output/
 *   2. Auto-applies via Playwright (Greenhouse / Ashby / Lever boards)
 *      — OR flags as "Manual Needed" for Workday / iCIMS / Taleo
 *   3. Sends Josh a personal email regardless of outcome, attaching
 *      the unique résumé.pdf + cover-letter.pdf for that specific job
 *   4. Writes a full session log to output/joshua-poolos/blitz-log-{date}.md
 *
 * Setup:
 *   cp config/email.example.yml config/email.yml
 *   # Fill in your Gmail App Password, then:
 *   node blitz-josh.mjs
 *
 * Options:
 *   --limit=N      Process only first N companies (default: 100)
 *   --skip=N       Skip the first N companies (crash recovery)
 *   --dry-run      Send emails + log but don't actually submit forms
 *   --no-email     Apply silently without sending emails
 */

import { chromium }                from 'playwright';
import { createTransport }         from 'nodemailer';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname }        from 'path';
import { fileURLToPath }           from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── CLI flags ────────────────────────────────────────────────
const FLAGS = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const LIMIT    = parseInt(FLAGS.limit   ?? '100', 10);
const SKIP     = parseInt(FLAGS.skip    ?? '0',   10);
const DRY_RUN  = FLAGS['dry-run']  === true || FLAGS['dry-run']  === 'true';
const NO_EMAIL = FLAGS['no-email'] === true || FLAGS['no-email'] === 'true';
const TODAY    = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
const TS       = new Date().toISOString().slice(0, 10);

// ─── Paths ────────────────────────────────────────────────────
const JOBS_PATH      = '/tmp/josh-mega-jobs.json';
const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUT_ROOT       = resolve(__dirname, 'output/joshua-poolos');
const APPS_DIR       = resolve(OUT_ROOT, 'applications');
const LOG_PATH       = resolve(OUT_ROOT, `blitz-log-${TS}.md`);
const EMAIL_CFG_PATH = resolve(__dirname, 'config/email.yml');

// ─── Joshua's contact details ─────────────────────────────────
const JOSH = {
  name:      'Joshua A. Poolos',
  firstName: 'Joshua',
  lastName:  'Poolos',
  email:     'joshuapoolos@gmail.com',
  phone:     '4047691599',
  linkedin:  '',
  github:    '',
  website:   '',
  location:  'Atlanta, GA',
};

// ─── Load / validate email config ────────────────────────────
function loadEmailConfig() {
  if (NO_EMAIL) return null;
  if (!existsSync(EMAIL_CFG_PATH)) {
    console.warn(`\n⚠️  No email config found at config/email.yml`);
    console.warn(`   Run: cp config/email.example.yml config/email.yml`);
    console.warn(`   Then fill in your Gmail App Password.\n`);
    console.warn(`   Continuing without email notifications (--no-email mode).\n`);
    return null;
  }
  const raw = readFileSync(EMAIL_CFG_PATH, 'utf8');
  const get = (key) => {
    const m = raw.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
  };
  const cfg = {
    host:    get('smtp_host')    || 'smtp.gmail.com',
    port:    parseInt(get('smtp_port') || '587', 10),
    secure:  get('smtp_secure') === 'true',
    user:    get('smtp_user'),
    pass:    get('smtp_pass'),
    notify:  get('notify_email') || JOSH.email,
    from:    get('from_name')    || 'Virgil Job Agent',
  };
  if (!cfg.user || cfg.user.includes('your-gmail') ||
      !cfg.pass || cfg.pass.includes('abcdefgh')) {
    console.warn(`\n⚠️  Email config exists but hasn't been filled in yet.`);
    console.warn(`   Edit config/email.yml with your real Gmail + App Password.\n`);
    console.warn(`   Continuing without email (--no-email mode).\n`);
    return null;
  }
  return cfg;
}

// ─── Nodemailer transport ─────────────────────────────────────
function buildTransport(cfg) {
  return createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

// ─── Slug helper (must match generate-josh-pdfs.mjs) ─────────
function slug(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
    .replace(/-+/g, '-').slice(0, 40);
}

// ─── Find this company's PDF folder ──────────────────────────
let folderCache = null;
function findAppFolder(company) {
  if (!folderCache) {
    folderCache = readdirSync(APPS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  }
  const s = slug(company);
  // Folder name is "{NN}-{slug}" — find by suffix match
  return folderCache.find(f => f.endsWith(`-${s}`) || f === s)
    ?? null;
}

// ─── ATS type classifier ──────────────────────────────────────
const AUTO_ATS   = new Set(['greenhouse', 'ashby', 'lever']);
const MANUAL_ATS = new Set(['workday', 'icims', 'taleo', 'cornerstone', 'jobicy', 'himalayas', 'arbeitnow', 'manual']);

// ─── Playwright form helpers ──────────────────────────────────
async function tryFill(ctx, selectors, value) {
  for (const sel of (Array.isArray(selectors) ? selectors : [selectors])) {
    try {
      const el = await ctx.$(sel);
      if (el) { await el.fill(String(value)); return true; }
    } catch {}
  }
  return false;
}

async function tryUpload(ctx, selectors, filePath) {
  for (const sel of (Array.isArray(selectors) ? selectors : [selectors])) {
    try {
      const el = await ctx.$(sel);
      if (el) { await el.setInputFiles(filePath); return true; }
    } catch {}
  }
  return false;
}

async function tryClick(ctx, selectors) {
  for (const sel of (Array.isArray(selectors) ? selectors : [selectors])) {
    try {
      const el = await ctx.$(sel);
      if (el) { await el.click(); return true; }
    } catch {}
  }
  return false;
}

// ─── Greenhouse handler ───────────────────────────────────────
async function applyGreenhouse(page, job, resumePath) {
  let url = job.url;
  if (!url.includes('#app')) url += '#app';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Check for iframe
  const iframe = await page.$('iframe#grnhse_iframe, iframe[src*="greenhouse"]');
  const ctx = iframe ? await iframe.contentFrame() : page;
  if (!ctx) return '❌ iframe error';

  await tryFill(ctx, ['#first_name','input[name="job_application[first_name]"]','input[autocomplete="given-name"]'], JOSH.firstName);
  await tryFill(ctx, ['#last_name','input[name="job_application[last_name]"]','input[autocomplete="family-name"]'],  JOSH.lastName);
  await tryFill(ctx, ['#email','input[name="job_application[email]"]','input[type="email"]'],                         JOSH.email);
  await tryFill(ctx, ['#phone','input[name="job_application[phone]"]','input[type="tel"]'],                           JOSH.phone);
  await tryFill(ctx, ['input[id*="linkedin"]','input[name*="linkedin"]','input[placeholder*="LinkedIn"]'],            JOSH.linkedin || '');
  await tryUpload(ctx, ['input[type="file"]','input[data-field="resume"]','#resume_upload input[type="file"]'],       resumePath);
  await page.waitForTimeout(2500);

  const clicked = await tryClick(ctx, [
    'input[type="submit"]','button[type="submit"]',
    '#submit_app','button[data-tracked-action="submit"]','.btn-submit',
  ]);
  if (!clicked) return '⚠️ No submit button';
  await page.waitForTimeout(3000);
  return '✅ Submitted';
}

// ─── Ashby handler ────────────────────────────────────────────
async function applyAshby(page, job, resumePath) {
  await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  await tryFill(page, ['input[name="name"]','input[name="_systemfield_name"]'],   JOSH.name);
  await tryFill(page, ['input[name="email"]','input[name="_systemfield_email"]'], JOSH.email);
  await tryFill(page, ['input[name="phone"]','input[name="_systemfield_phone"]'], JOSH.phone);
  await tryFill(page, ['input[name="linkedInUrl"]'],                              JOSH.linkedin || '');
  await tryUpload(page, ['input[type="file"]'],                                   resumePath);
  await page.waitForTimeout(2500);

  const clicked = await tryClick(page, ['button[type="submit"]','input[type="submit"]']);
  if (!clicked) return '⚠️ No submit button';
  await page.waitForTimeout(3000);
  return '✅ Submitted';
}

// ─── Lever handler ────────────────────────────────────────────
async function applyLever(page, job, resumePath) {
  const applyUrl = job.url.endsWith('/apply') ? job.url : `${job.url}/apply`;
  await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  await tryFill(page, ['input[name="name"]','#name'],                                      JOSH.name);
  await tryFill(page, ['input[name="email"]','#email','input[type="email"]'],               JOSH.email);
  await tryFill(page, ['input[name="phone"]','#phone','input[type="tel"]'],                 JOSH.phone);
  await tryFill(page, ['input[data-qa="linkedin-field"]','input[name*="linkedin"]'],        JOSH.linkedin || '');
  await tryFill(page, ['input[data-qa="org-field"]','input[name*="org"]'],                  'Surgical Information Systems');
  await tryUpload(page, ['input[type="file"][name="resume"]','input[type="file"]'],         resumePath);
  await page.waitForTimeout(2500);

  const clicked = await tryClick(page, [
    'button[type="submit"][data-qa="btn-submit"]',
    'button[type="submit"]','input[type="submit"]',
  ]);
  if (!clicked) return '⚠️ No submit button';
  await page.waitForTimeout(3000);
  return '✅ Submitted';
}

// ─── Email: HTML body builder ─────────────────────────────────
function buildEmailHTML(job, status, folderName, rank) {
  const isSubmitted = status.startsWith('✅');
  const statusColor = isSubmitted ? '#2d6a4f' : '#b5451b';
  const statusBg    = isSubmitted ? '#d8f3dc' : '#fdf3ee';
  const statusLabel = isSubmitted ? '✅ Auto-Submitted' : '📋 Needs Manual Submission';

  const atsGuide = {
    workday:    'Go to the careers URL → search for the exact role → click Apply → upload the attached résumé + copy-paste the cover letter.',
    icims:      'Go to the careers URL → find the role → click Apply → complete the iCIMS form using the attached documents.',
    taleo:      'Go to the careers URL → search the role → use Taleo apply flow → attach the résumé PDF.',
    cornerstone:'Go to the careers URL → find the role → apply through the Cornerstone portal.',
    jobicy:     'Click the apply URL directly — it links straight to the company application page.',
    himalayas:  'Click the apply URL — it links directly to the company or their ATS.',
    arbeitnow:  'Click the apply URL — follow the link to the company careers page.',
  };
  const guide = atsGuide[job.atsType] ?? 'Visit the careers URL and apply directly.';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.6;color:#1a1a2e;background:#f8f9fa;margin:0;padding:0}
  .wrap{max-width:620px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,hsl(187,74%,32%),hsl(270,70%,45%));padding:28px 32px;color:#fff}
  .header h1{margin:0 0 4px;font-size:22px;font-weight:700;letter-spacing:-.02em}
  .header p{margin:0;font-size:13px;opacity:.85}
  .status-banner{background:${statusBg};border-left:4px solid ${statusColor};padding:14px 32px;font-weight:600;color:${statusColor};font-size:15px}
  .body{padding:24px 32px}
  .field{margin-bottom:14px}
  .label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888;font-weight:600;margin-bottom:3px}
  .value{font-size:14px;color:#1a1a2e;font-weight:500}
  .value a{color:hsl(270,70%,45%);text-decoration:none}
  .divider{border:none;border-top:1px solid #eee;margin:20px 0}
  .action-box{background:#f0f4ff;border-radius:8px;padding:16px 20px;margin:20px 0}
  .action-box h3{margin:0 0 8px;font-size:14px;color:hsl(270,70%,35%)}
  .action-box p{margin:0;font-size:13px;color:#444;line-height:1.6}
  .attach-note{background:#fafafa;border:1px solid #e5e5e5;border-radius:8px;padding:14px 18px;margin-top:18px;font-size:13px;color:#555}
  .attach-note strong{color:#1a1a2e}
  .footer{padding:16px 32px;background:#f8f9fa;border-top:1px solid #eee;font-size:11px;color:#999;text-align:center}
  .rank{display:inline-block;background:hsl(270,70%,45%);color:#fff;font-size:11px;font-weight:700;padding:2px 9px;border-radius:99px;margin-left:8px}
</style>
</head>
<body>
<div class="wrap">

  <div class="header">
    <h1>Virgil Job Agent <span class="rank">#${rank}</span></h1>
    <p>Application update for Joshua A. Poolos · ${TODAY}</p>
  </div>

  <div class="status-banner">${statusLabel}</div>

  <div class="body">

    <div class="field">
      <div class="label">Company</div>
      <div class="value">${job.company}</div>
    </div>

    <div class="field">
      <div class="label">Role</div>
      <div class="value">${job.role}</div>
    </div>

    <div class="field">
      <div class="label">Location</div>
      <div class="value">${job.location || 'Remote / Not specified'}</div>
    </div>

    <div class="field">
      <div class="label">ATS Platform</div>
      <div class="value">${job.atsType.toUpperCase()}</div>
    </div>

    <div class="field">
      <div class="label">Résumé Variant</div>
      <div class="value">${job.archetype ? job.archetype.charAt(0).toUpperCase() + job.archetype.slice(1) : 'Standard'} — tailored to this role</div>
    </div>

    <div class="field">
      <div class="label">Application URL</div>
      <div class="value"><a href="${job.url}">${job.url}</a></div>
    </div>

    <hr class="divider">

    ${isSubmitted ? `
    <div class="action-box">
      <h3>✅ Application was auto-submitted</h3>
      <p>Virgil filled and submitted the form on your behalf. If you receive a confirmation email from ${job.company}, that confirms success. Keep an eye out for a follow-up from their recruiting team.</p>
    </div>
    ` : `
    <div class="action-box">
      <h3>📋 Action Required — Manual Submission</h3>
      <p>${job.company} uses <strong>${job.atsType.toUpperCase()}</strong>, which requires a manual apply (Virgil can't auto-fill this platform yet).</p>
      <p style="margin-top:10px"><strong>How to apply:</strong> ${guide}</p>
      <p style="margin-top:10px">Your tailored résumé and cover letter are attached to this email — just open, save, and upload.</p>
    </div>
    `}

    <div class="attach-note">
      📎 <strong>Attachments in this email:</strong><br>
      &nbsp;&nbsp;• <strong>resume.pdf</strong> — tailored for ${job.company} (${job.archetype} variant)<br>
      &nbsp;&nbsp;• <strong>cover-letter.pdf</strong> — addressed to ${job.company} hiring team
    </div>

  </div>

  <div class="footer">
    Virgil Job Agent · Josh Mega Scrape Wave 1 · ${TODAY}<br>
    Application #${rank} of ${LIMIT} · Folder: output/joshua-poolos/applications/${folderName}
  </div>

</div>
</body>
</html>`;
}

// ─── Send email ───────────────────────────────────────────────
async function sendEmail(transport, cfg, job, status, folderName, rank, resumePath, clPath) {
  const isSubmitted = status.startsWith('✅');
  const emoji       = isSubmitted ? '✅' : '📋';
  const subject     = `${emoji} ${isSubmitted ? 'Applied' : 'Manual Needed'}: ${job.role} @ ${job.company}`;

  const attachments = [];
  if (existsSync(resumePath)) {
    attachments.push({ filename: `Joshua-Poolos-Resume-${slug(job.company)}.pdf`, path: resumePath });
  }
  if (existsSync(clPath)) {
    attachments.push({ filename: `Joshua-Poolos-CoverLetter-${slug(job.company)}.pdf`, path: clPath });
  }

  await transport.sendMail({
    from:        `"${cfg.from}" <${cfg.user}>`,
    to:          cfg.notify,
    subject,
    html:        buildEmailHTML(job, status, folderName, rank),
    attachments,
  });
}

// ─── Update blocklist ─────────────────────────────────────────
function addToBlocklist(company) {
  const list = existsSync(BLOCKLIST_PATH)
    ? JSON.parse(readFileSync(BLOCKLIST_PATH, 'utf8'))
    : [];
  if (!list.includes(company.toLowerCase())) {
    list.push(company.toLowerCase());
    writeFileSync(BLOCKLIST_PATH, JSON.stringify(list, null, 2));
  }
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('\n🦀 Josh Auto-Apply + Email Agent\n');
  if (DRY_RUN)  console.log('🧪 DRY RUN — forms will NOT be submitted\n');
  if (NO_EMAIL) console.log('🔕 --no-email — notifications suppressed\n');

  // ── Load jobs ──
  if (!existsSync(JOBS_PATH)) {
    console.error(`❌ No jobs file. Run: node scrape-josh-mega.mjs`);
    process.exit(1);
  }
  const allJobs = JSON.parse(readFileSync(JOBS_PATH, 'utf8'));
  const jobs = allJobs
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
    .slice(SKIP, SKIP + LIMIT);

  console.log(`📂 Jobs loaded: ${allJobs.length} total → processing ${jobs.length} (skip=${SKIP}, limit=${LIMIT})\n`);

  // ── Email setup ──
  const emailCfg   = loadEmailConfig();
  const transport   = emailCfg ? buildTransport(emailCfg) : null;

  if (transport) {
    try {
      await transport.verify();
      console.log(`📧 Email ready → notifications → ${emailCfg.notify}\n`);
    } catch (err) {
      console.warn(`⚠️  Email transport failed: ${err.message}`);
      console.warn(`   Continuing without email.\n`);
    }
  }

  // ── Playwright ──
  const browser = await chromium.launch({ headless: true });

  // ── Log header ──
  const logLines = [
    `# Josh Blitz Log — ${TODAY}`,
    `**Limit:** ${LIMIT} · **Skip:** ${SKIP} · **Dry-run:** ${DRY_RUN}`,
    '',
    '| # | Company | Role | Location | ATS | Status | Email |',
    '|---|---------|------|----------|-----|--------|-------|',
  ];

  let submitted = 0, manual = 0, errors = 0, emailsSent = 0;
  const rank0 = SKIP + 1; // display rank starts at skip+1

  for (let i = 0; i < jobs.length; i++) {
    const job    = jobs[i];
    const rank   = rank0 + i;
    const padded = String(rank).padStart(2, '0');

    // ── Find PDF folder ──
    const folderName = findAppFolder(job.company);
    const resumePath = folderName ? resolve(APPS_DIR, folderName, 'resume.pdf')       : null;
    const clPath     = folderName ? resolve(APPS_DIR, folderName, 'cover-letter.pdf') : null;
    const hasFiles   = resumePath && existsSync(resumePath);

    process.stdout.write(`[${padded}/${LIMIT}] ${job.company} — ${job.role}`);
    if (!hasFiles) process.stdout.write(' ⚠️  no PDFs');
    process.stdout.write(' ... ');

    let status   = '';
    let emailOk  = false;

    // ── Apply ──
    if (DRY_RUN) {
      status = AUTO_ATS.has(job.atsType)
        ? '🧪 Dry-run (would auto-submit)'
        : '🧪 Dry-run (manual needed)';
    } else if (AUTO_ATS.has(job.atsType) && job.url && !job.url.startsWith('http') === false) {
      // Auto-apply
      const page = await browser.newPage();
      page.setDefaultTimeout(30000);
      try {
        const rPath = resumePath && existsSync(resumePath) ? resumePath : null;
        if (job.atsType === 'greenhouse') status = await applyGreenhouse(page, job, rPath);
        else if (job.atsType === 'ashby') status = await applyAshby(page,      job, rPath);
        else if (job.atsType === 'lever') status = await applyLever(page,       job, rPath);
        if (status.startsWith('✅')) { submitted++; addToBlocklist(job.company); }
        else errors++;
      } catch (err) {
        status = `❌ ${err.message.slice(0, 60)}`;
        errors++;
      } finally {
        await page.close();
      }
    } else {
      // Manual needed
      status = `📋 Manual (${job.atsType.toUpperCase()})`;
      manual++;
    }

    // ── Send email ──
    if (transport && emailCfg && !NO_EMAIL) {
      try {
        await sendEmail(transport, emailCfg, job, status, folderName ?? 'unknown', rank, resumePath, clPath);
        emailOk = true;
        emailsSent++;
      } catch (err) {
        console.warn(`\n   ⚠️  Email failed: ${err.message}`);
      }
    }

    const emailIcon = !transport ? '—' : (emailOk ? '📧✅' : '📧❌');
    console.log(`${status} ${emailIcon}`);

    logLines.push(
      `| ${rank} | **${job.company}** | ${job.role} | ${job.location||'Remote'} | ${job.atsType} | ${status} | ${emailIcon} |`
    );

    // Pace between applications
    if (!DRY_RUN && AUTO_ATS.has(job.atsType)) await new Promise(r => setTimeout(r, 1500));
  }

  await browser.close();

  // ── Summary ──
  const summary = [
    '',
    '## Summary',
    `| Metric | Count |`,
    `|--------|-------|`,
    `| ✅ Auto-submitted | ${submitted} |`,
    `| 📋 Manual needed  | ${manual} |`,
    `| ❌ Errors         | ${errors} |`,
    `| 📧 Emails sent    | ${emailsSent} |`,
    `| Total processed   | ${jobs.length} |`,
    '',
    `*Generated ${TODAY} by Virgil / blitz-josh.mjs*`,
  ];

  const fullLog = [...logLines, ...summary].join('\n');
  writeFileSync(LOG_PATH, fullLog);

  console.log(`\n${'═'.repeat(64)}`);
  console.log(`✅ Auto-submitted : ${submitted}`);
  console.log(`📋 Manual needed  : ${manual}`);
  console.log(`❌ Errors         : ${errors}`);
  console.log(`📧 Emails sent    : ${emailsSent}`);
  console.log(`📋 Log            : ${LOG_PATH}`);
  console.log(`${'═'.repeat(64)}\n`);

  if (manual > 0 && transport) {
    console.log(`📬 Josh has received an email for each of the ${manual} manual-apply companies,`);
    console.log(`   with the unique résumé + cover letter attached and step-by-step instructions.\n`);
  }
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
