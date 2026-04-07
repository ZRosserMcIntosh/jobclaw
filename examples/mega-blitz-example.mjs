#!/usr/bin/env node
/**
 * Virgil Auto-Apply Engine (Example Template)
 * 
 * Reads jobs from /tmp/wave-jobs.json and auto-fills ATS application forms
 * using Playwright. Handles Greenhouse, Ashby, and Lever forms.
 * 
 * Copy this to mega-blitz-v3.mjs and fill in your details.
 * 
 * Usage: node mega-blitz-v3.mjs [--skip N]
 * Output: output/blitz-log-{date}.md
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

// ─── YOUR DETAILS (fill these in) ──────────────────────────
const ME = {
  name: 'Your Full Name',
  firstName: 'Your',
  lastName: 'Name',
  email: 'you@example.com',
  phone: '+1234567890',
  linkedin: 'https://linkedin.com/in/yourprofile',
  github: 'https://github.com/youruser',
  website: 'https://yourportfolio.com',
  location: 'Your City, Country',
  currentCompany: 'Your Company',
  resumePath: resolve(ROOT, 'output/your-resume.pdf'),
  coverLetterPath: resolve(ROOT, 'output/cover-letters/generic.pdf'),
};

// ─── Cover Letter Template ─────────────────────────────────
function coverLetter(company, role) {
  return `Dear ${company} Hiring Team,

I am writing to express my interest in the ${role} position.

[Your pitch here — customize per role type]

Best regards,
${ME.name}
${ME.email} | ${ME.website}`;
}

// ─── Configuration ──────────────────────────────────────────
const JOBS_PATH = '/tmp/wave-jobs.json';
const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const LOG_PATH = resolve(ROOT, `output/blitz-log-${new Date().toISOString().slice(0,10)}.md`);

// ─── Form Helpers ───────────────────────────────────────────
async function tryFill(page, selectors, value, label) {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.fill(value);
        return true;
      }
    } catch {}
  }
  return false;
}

async function tryUpload(page, selectors, filePath, label) {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.setInputFiles(filePath);
        return true;
      }
    } catch {}
  }
  return false;
}

// ─── ATS Handlers ───────────────────────────────────────────
async function applyGreenhouse(page, job) {
  // Navigate to job apply page
  let url = job.url;
  if (!url.includes('#app')) url += '#app';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Fill standard Greenhouse fields
  await tryFill(page, ['#first_name', 'input[name="job_application[first_name]"]'], ME.firstName, 'First name');
  await tryFill(page, ['#last_name', 'input[name="job_application[last_name]"]'], ME.lastName, 'Last name');
  await tryFill(page, ['#email', 'input[name="job_application[email]"]'], ME.email, 'Email');
  await tryFill(page, ['#phone', 'input[name="job_application[phone]"]'], ME.phone, 'Phone');

  // Upload resume
  await tryUpload(page, ['input[type="file"]'], ME.resumePath, 'Resume');

  // Submit
  const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
    await page.waitForTimeout(3000);
    return '✅';
  }
  return '⚠️';
}

async function applyAshby(page, job) {
  await page.goto(job.url, { waitUntil: 'networkidle', timeout: 30000 });
  
  // Fill Ashby form fields
  await tryFill(page, ['input[name="name"], input[name="_systemfield_name"]'], ME.name, 'Name');
  await tryFill(page, ['input[name="email"], input[name="_systemfield_email"]'], ME.email, 'Email');
  await tryFill(page, ['input[name="phone"], input[name="_systemfield_phone"]'], ME.phone, 'Phone');
  await tryFill(page, ['input[name="linkedInUrl"]'], ME.linkedin, 'LinkedIn');
  await tryFill(page, ['input[name="githubUrl"]'], ME.github, 'GitHub');

  // Upload resume
  await tryUpload(page, ['input[type="file"]'], ME.resumePath, 'Resume');

  // Submit
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
    await page.waitForTimeout(3000);
    return '✅';
  }
  return '⚠️';
}

async function applyLever(page, job) {
  let url = job.url;
  if (!url.endsWith('/apply')) url += '/apply';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Fill Lever form fields
  await tryFill(page, ['input[name="name"]'], ME.name, 'Name');
  await tryFill(page, ['input[name="email"]'], ME.email, 'Email');
  await tryFill(page, ['input[name="phone"]'], ME.phone, 'Phone');
  await tryFill(page, ['input[name="urls[LinkedIn]"]'], ME.linkedin, 'LinkedIn');
  await tryFill(page, ['input[name="urls[GitHub]"]'], ME.github, 'GitHub');
  await tryFill(page, ['input[name="urls[Portfolio]"]'], ME.website, 'Portfolio');

  // Upload resume
  await tryUpload(page, ['input[name="resume"]'], ME.resumePath, 'Resume');

  // Submit
  const submitBtn = await page.$('button[type="submit"], a.postings-btn-submit');
  if (submitBtn) {
    await submitBtn.click();
    await page.waitForTimeout(3000);
    return '✅';
  }
  return '⚠️';
}

// ─── Main Loop ──────────────────────────────────────────────
async function main() {
  const skip = parseInt(process.argv.find(a => a.startsWith('--skip'))?.split('=')[1] || '0');
  
  const jobs = JSON.parse(readFileSync(JOBS_PATH, 'utf8'));
  console.log(`Loaded ${jobs.length} jobs, skipping first ${skip}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const results = [];
  let submitted = 0, manual = 0, warnings = 0, errors = 0;

  for (let i = skip; i < jobs.length; i++) {
    const job = jobs[i];
    const num = `[${i + 1}/${jobs.length}]`;
    let status = '❌';

    try {
      const page = await context.newPage();

      if (job.atsType === 'greenhouse') {
        status = await applyGreenhouse(page, job);
      } else if (job.atsType === 'ashby') {
        status = await applyAshby(page, job);
      } else if (job.atsType === 'lever') {
        status = await applyLever(page, job);
      } else {
        status = '⚠️ Unknown ATS';
        manual++;
      }

      await page.close();
    } catch (err) {
      status = `❌ ${err.message.slice(0, 60)}`;
      errors++;
    }

    if (status === '✅') submitted++;
    else if (status.startsWith('⚠️')) warnings++;

    results.push({ ...job, status });
    console.log(`${num} ${status} ${job.company} — ${job.role}`);

    // Update blocklist after each submission
    if (status === '✅') {
      const bl = existsSync(BLOCKLIST_PATH)
        ? JSON.parse(readFileSync(BLOCKLIST_PATH, 'utf8'))
        : [];
      if (!bl.includes(job.company)) {
        bl.push(job.company);
        writeFileSync(BLOCKLIST_PATH, JSON.stringify(bl, null, 2));
      }
    }
  }

  await browser.close();

  // Write log
  const log = [
    `# Virgil Auto-Apply Log — ${new Date().toISOString().slice(0, 10)}`,
    '',
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Total | ${jobs.length} |`,
    `| ✅ Submitted | ${submitted} |`,
    `| ⚠️ Manual/Warning | ${warnings + manual} |`,
    `| ❌ Error | ${errors} |`,
    '',
    `## Results`,
    '',
    `| # | Company | Role | ATS | Status |`,
    `|---|---------|------|-----|--------|`,
    ...results.map((r, i) => `| ${i + 1} | ${r.company} | ${r.role} | ${r.atsType} | ${r.status} |`),
  ].join('\n');

  writeFileSync(LOG_PATH, log);
  console.log(`\nDone! Log: ${LOG_PATH}`);
  console.log(`✅ ${submitted} | ⚠️ ${warnings + manual} | ❌ ${errors}`);
}

main().catch(console.error);
