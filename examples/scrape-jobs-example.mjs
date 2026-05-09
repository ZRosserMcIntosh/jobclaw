#!/usr/bin/env node
/**
 * Virgil Job Scraper (Example Template)
 * 
 * Scrapes Greenhouse, Ashby, and Lever boards for relevant roles.
 * Scores each role by keyword relevance, picks 1 best per company,
 * and filters against a blocklist of previously-applied companies.
 * 
 * Copy this to scrape-jobs-v3.mjs and fill in your details.
 * 
 * Usage: node scrape-jobs-v3.mjs
 * Output: /tmp/wave-jobs.json
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';

// ─── Configuration ──────────────────────────────────────────
const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave-jobs.json';

// Keywords that boost a role's relevance score (customize these)
const POSITIVE_KEYWORDS = [
  'full-stack', 'fullstack', 'frontend', 'front-end', 'react',
  'next.js', 'node', 'typescript', 'javascript', 'software engineer',
];

const NEGATIVE_KEYWORDS = [
  'staff', 'principal', 'director', 'vp', 'intern', 'junior',
  'data scientist', 'machine learning', 'devops', 'sre',
];

// ─── Company Boards ─────────────────────────────────────────
// Add your target companies here. Format: { slug, name }

const GREENHOUSE_BOARDS = [
  // { slug: 'airbnb', name: 'Airbnb' },
  // { slug: 'stripe', name: 'Stripe' },
  // ...add 150+ boards
];

const ASHBY_BOARDS = [
  // { slug: 'anthropic', name: 'Anthropic' },
  // ...add 60+ boards
];

const LEVER_BOARDS = [
  // { slug: 'netflix', name: 'Netflix' },
  // ...add 40+ boards
];

// ─── Scoring ────────────────────────────────────────────────
function roleScore(title) {
  const t = title.toLowerCase();
  let score = 0;
  for (const kw of POSITIVE_KEYWORDS) {
    if (t.includes(kw)) score += 10;
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (t.includes(kw)) score -= 20;
  }
  return score;
}

function pickBestPerCompany(jobs) {
  const map = new Map();
  for (const job of jobs) {
    const key = job.company.toLowerCase();
    if (!map.has(key) || job.score > map.get(key).score) {
      map.set(key, job);
    }
  }
  return [...map.values()];
}

// ─── API Fetchers ───────────────────────────────────────────
async function fetchGreenhouse(slug, name) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return (data.jobs || []).map(j => ({
      company: name,
      role: j.title,
      url: j.absolute_url,
      atsType: 'greenhouse',
      score: roleScore(j.title),
    }));
  } catch { return []; }
}

async function fetchAshby(slug, name) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return (data.jobs || []).map(j => ({
      company: name,
      role: j.title,
      url: `https://jobs.ashbyhq.com/${slug}/${j.id}`,
      atsType: 'ashby',
      score: roleScore(j.title),
    }));
  } catch { return []; }
}

async function fetchLever(slug, name) {
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return (data || []).map(j => ({
      company: name,
      role: j.text,
      url: j.hostedUrl,
      atsType: 'lever',
      score: roleScore(j.text),
    }));
  } catch { return []; }
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  // Load blocklist
  const blocklist = new Set();
  if (existsSync(BLOCKLIST_PATH)) {
    const arr = JSON.parse(readFileSync(BLOCKLIST_PATH, 'utf8'));
    arr.forEach(c => blocklist.add(c.toLowerCase()));
  }
  console.log(`Blocklist: ${blocklist.size} companies`);

  let allJobs = [];

  // Fetch from all boards
  for (const b of GREENHOUSE_BOARDS) {
    const jobs = await fetchGreenhouse(b.slug, b.name);
    allJobs.push(...jobs);
  }
  for (const b of ASHBY_BOARDS) {
    const jobs = await fetchAshby(b.slug, b.name);
    allJobs.push(...jobs);
  }
  for (const b of LEVER_BOARDS) {
    const jobs = await fetchLever(b.slug, b.name);
    allJobs.push(...jobs);
  }

  console.log(`Raw jobs: ${allJobs.length}`);

  // Filter: positive score + not in blocklist
  allJobs = allJobs.filter(j => j.score > 0 && !blocklist.has(j.company.toLowerCase()));
  console.log(`After filter: ${allJobs.length}`);

  // Pick 1 best per company
  const final = pickBestPerCompany(allJobs);
  console.log(`Final (1 per company): ${final.length}`);

  writeFileSync(OUTPUT_PATH, JSON.stringify(final, null, 2));
  console.log(`Written to ${OUTPUT_PATH}`);
}

main().catch(console.error);
