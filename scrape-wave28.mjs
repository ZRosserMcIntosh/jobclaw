#!/usr/bin/env node
/**
 * Wave 28 Scraper — Accelerator Alumni + Conference Sponsors
 *
 * Strategy: YC, Techstars, 500 Startups alumni names, plus
 * tech-conference sponsor-style company names and common
 * SaaS/startup brand patterns (verb+ly, noun+ify, etc.)
 */

import fs from "fs";
import path from "path";

/* ── Configuration ─────────────────────────────────────────── */
const BLOCKLIST_PATH = "/tmp/applied-companies.json";
const OUTPUT_PATH = "/tmp/wave28-jobs.json";
const RESUME_KW = [
  "fullstack","full-stack","full stack","react","typescript","node",
  "javascript","frontend","front-end","backend","back-end","software engineer",
  "web developer","senior engineer","staff engineer","software developer",
];
const REMOTE_RE = /remote|anywhere|latam|latin|americas|global|worldwide|distributed|wfh|work from home|emea|apac/i;
const BATCH = 35;

/* ── Blocklist ─────────────────────────────────────────────── */
let blocklist = new Set();
try {
  const raw = fs.readFileSync(BLOCKLIST_PATH, "utf-8");
  const arr = JSON.parse(raw);
  blocklist = new Set(arr.map(s => s.toLowerCase().trim()));
  console.log(`📋 Blocklist loaded: ${blocklist.size} companies`);
} catch { console.log("⚠️  No blocklist found, starting fresh"); }

/* ── Slug Generation ───────────────────────────────────────── */
function generateSlugs() {
  const yc_alumni = [
    "airbnb","stripe","dropbox","coinbase","instacart","doordash","gusto",
    "brex","faire","lattice","retool","vanta","deel","ramp","mercury",
    "posthog","cal-com","resend","middesk","ashby","clerk","nango",
    "trigger-dev","inngest","snaplet","tinybird","codeium","tabby",
    "supabase","railway","render","vercel","netlify","planetscale",
    "neon","turso","convex","temporal","replit","linear","dbt-labs",
    "airbyte","prefect","dagster","hightouch","census","rudderstack",
    "growthbook","statsig","flagsmith","launchdarkly","split",
    "stytch","workos","propelauth","fusionauth","frontegg",
    "doppler","infisical","gitguardian","snyk","semgrep","sonarqube",
    "checkly","grafana","datadog","sentry","honeycomb","lightstep",
    "logdna","mezmo","axiom","betterstack","cronitor","incident-io",
    "pagerduty","opsgenie","rootly","firehydrant","statuspage",
    "algolia","typesense","meilisearch","weaviate","pinecone",
    "qdrant","chroma","zilliz","marqo","cohere","anthropic",
    "mistral","replicate","huggingface","together-ai","anyscale",
    "modal","banana-dev","baseten","cerebrium","fireworks-ai",
    "lancedb","clickhouse","timescale","questdb","materialize",
    "risingwave","redpanda","confluent","warpstream","upstash",
    "aiven","nhost","appwrite","pocketbase","directus","payload",
    "medusa","saleor","vendure","solidus","spree","bigcommerce",
    "shopify","woocommerce","ecwid","gumroad","lemonsqueezy",
    "paddle","chargebee","recurly","zuora","maxio","orb-so",
    "metronome","amberflo","togai","m3ter","lago","getlago",
    "stigg","schematichq","bucketco","eppo","optimizely",
    "amplitude","mixpanel","heap","fullstory","hotjar","logrocket",
    "clarity","mouseflow","contentsquare","quantum-metric",
    "glassbox","datagrail","transcend","ethyca","osano","onetrust",
    "cookiebot","termly","iubenda","securiti","bigid","collibra",
    "alation","atlan","select-star","castor","acceldata",
    "bigeye","anomalo","metaplane","lightup","soda","datafold",
    "great-expectations","elementary-data","monte-carlo-data",
    "cribl","observe-ai","assembled","forethought","ada-cx",
    "intercom","zendesk","freshdesk","helpscout","front",
    "missive","hiver","gorgias","kustomer","gladly","dixa"
  ];

  const techstars_500 = [
    "sendgrid","sphero","zipline","chainalysis","remitly",
    "classpass","plaid","ro","grammarly","outreach","salesloft",
    "gong","chorus-ai","clari","peopleai","sixsense","demandbase",
    "bombora","zoominfo","apollo-io","lusha","seamless-ai",
    "clearbit","datanyze","builtwith","wappalyzer","similarweb",
    "semrush","ahrefs","moz","screaming-frog","botify","conductor",
    "brightedge","siteimprove","oncrawl","deepcrawl","contentking",
    "surfer-seo","frase","jasper-ai","copy-ai","writesonic",
    "anyword","peppertype","rytr","longshot","kafkai",
    "unbounce","instapage","leadpages","clickfunnels","kartra",
    "systeme","samcart","thrivecart","convertkit","mailchimp",
    "sendgrid","postmark","mailgun","sparkpost","messagebird",
    "twilio","vonage","bandwidth","telnyx","plivo","sinch",
    "infobip","gupshup","kaleyra","commio","dialpad",
    "ringcentral","zoom","webex","gotomeeting","bluejeans",
    "around","gather","teamflow","roam","sococo","kumospace",
    "spatial","virbela","framevr","mursion","strivr",
    "pixo-vr","uptale","instavr","wondavr","meetinvr",
    "notion","coda","almanac","slite","gitbook","readme",
    "mintlify","docusaurus","nextra","starlight","docus",
    "fumadocs","markdoc","mdxjs","contentlayer","keystatic",
    "tinacms","sanity","strapi","contentful","prismic",
    "storyblok","buttercms","ghost","wordpress","webflow",
    "framer","plasmic","builder-io","teleporthq","locofy",
    "anima-app","uizard","galileo-ai","diagram","magician",
    "figma","sketch","invision","abstract","zeplin","avocode"
  ];

  const saas_patterns = [
    "stackblitz","codesandbox","gitpod","codespaces","coder",
    "devzero","devpod","daytona","okteto","telepresence",
    "tilt-dev","garden-io","skaffold","draft","devspace",
    "loft-sh","vcluster","crossplane","upbound","pulumi",
    "terraform","spacelift","env0","scalr","atlantis",
    "digger","terrateam","terragrunt","terramate","terraspace",
    "cdktf","winglang","klotho","nitric","shuttle-rs",
    "sst-dev","seed-run","serverless","arc-dev","turing",
    "toptal","andela","crossover","g2i","x-team",
    "lemon-io","gun-io","flexiple","codementor","codemill",
    "mutable","bountyhub","gitcoin","radicle","drips",
    "tea-xyz","stackaid","flossbank","opensauced","codecov",
    "coveralls","sonarcloud","codacy","deepsource","coderabbit",
    "sourcery","codium-ai","tabnine","supermaven","cursor",
    "windsurf","aide-dev","continue-dev","aider","sweep-ai",
    "codemod-com","ast-grep","jscodeshift","ts-morph","putout",
    "biome-js","oxc-project","rspack","farm-fe","turbopack",
    "esbuild","swc","parcel","rollup","vite","webpack",
    "snowpack","wmr","microbundle","tsup","unbuild","pkgroll",
    "bunchee","dts-cli","tsdx","preconstruct","changesets",
    "lerna","nx","turborepo","moon","bazel","pants",
    "buck2","gradle","maven","sbt","mill","bloop",
    "metals","scala-cli","coursier","scalafix","wartremover",
    "scalafmt","ktlint","detekt","diktat","spotless",
    "palantir","google-java-format","checkstyle","pmd","spotbugs"
  ];

  const conf_sponsors = [
    "hashicorp","elastic","mongodb","cockroachdb","singlestore",
    "yugabyte","couchbase","mariadb","percona","vitess",
    "proxysql","pgbouncer","odyssey","pgcat","supavisor",
    "tembo","crunchy-data","enterprisedb","timescaledb","citusdata",
    "hydra-so","parabol","miro","mural","lucidspark",
    "whimsical","excalidraw","tldraw","rnote","logseq",
    "obsidian","roam-research","mem","reflect-app","heptabase",
    "scrintal","kosmik","milanote","clover-app","craft-docs",
    "saga-so","type-ai","lex-page","compose-ai","textcortex",
    "wordtune","quillbot","deepl","smartcat","phrase",
    "crowdin","transifex","lokalise","weblate","pontoon",
    "tolgee","i18next","paraglide","inlang","replexica",
    "lunary","helicone","braintrust","gentrace","humanloop",
    "promptlayer","langsmith","langfuse","pezzo","agenta",
    "traceloop","arize","whylabs","evidently","nannyml",
    "fiddler","aporia","superwise","censius","mona-labs",
    "deepchecks","giskard","lakera","rebuff","laiyer",
    "promptguard","nemo-guardrails","guardrails-ai","lmql","guidance",
    "outlines","instructor","marvin","kor","llama-index",
    "langchain","haystack","semantic-kernel","autogen","crewai",
    "phidata","composio","browserbase","steel-dev","apify",
    "brightdata","oxylabs","smartproxy","scrapingbee","scraperapi",
    "crawlbase","zenrows","scrapfly","jina-ai","firecrawl",
    "unstructured","docling","marker","surya","llamaparse",
    "reducto","sensible","veryfi","nanonets","rossum"
  ];

  const all = [...new Set([
    ...yc_alumni, ...techstars_500, ...saas_patterns, ...conf_sponsors
  ])];
  return all.filter(s => !blocklist.has(s.replace(/-/g, " ").toLowerCase()));
}

/* ── Role Scoring ──────────────────────────────────────────── */
function roleScore(title) {
  const t = title.toLowerCase();
  if (/intern|director|vp |chief|head of|manager|lead recruiter|sales|marketing|legal|accountant|finance|hr |human resource|people ops/i.test(t)) return -1;
  if (/fullstack|full-stack|full stack|react|typescript|node\.?js|javascript/i.test(t)) return 3;
  if (/software engineer|software developer|web developer|frontend|front-end|backend|back-end|architect|platform engineer/i.test(t)) return 2;
  if (/devops|sre|site reliability|infrastructure|cloud engineer|data engineer/i.test(t)) return 1;
  return 0;
}

/* ── ATS Scrapers ──────────────────────────────────────────── */
async function scrapeGreenhouseSlug(slug) {
  try {
    const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.jobs || []).map(j => ({
      company: slug, role: j.title,
      location: j.location?.name || "",
      url: j.absolute_url,
      atsType: "greenhouse",
    }));
  } catch { return []; }
}

async function scrapeAshbySlug(slug) {
  try {
    const r = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.jobs || []).map(j => ({
      company: slug, role: j.title,
      location: j.location || j.locationName || "",
      url: `https://jobs.ashbyhq.com/${slug}/${j.id}`,
      atsType: "ashby",
    }));
  } catch { return []; }
}

async function scrapeLeverSlug(slug) {
  try {
    const r = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`);
    if (!r.ok) return [];
    const d = await r.json();
    if (!Array.isArray(d)) return [];
    return d.map(j => ({
      company: slug, role: j.text,
      location: j.categories?.location || "",
      url: j.hostedUrl || j.applyUrl || "",
      atsType: "lever",
    }));
  } catch { return []; }
}

/* ── Job Board APIs ────────────────────────────────────────── */
async function scrapeJobicy() {
  try {
    const r = await fetch("https://jobicy.com/api/v2/remote-jobs?count=50&tag=javascript,react,node,typescript,fullstack");
    const d = await r.json();
    return (d.jobs || []).map(j => ({
      company: j.companyName, role: j.jobTitle,
      location: j.jobGeo || "Remote",
      url: j.url,
      atsType: "jobicy",
    }));
  } catch { return []; }
}

async function scrapeRemoteOK() {
  try {
    const r = await fetch("https://remoteok.com/api?tag=dev", {
      headers: { "User-Agent": "CareerOps/1.0" },
    });
    const d = await r.json();
    return d.slice(1).map(j => ({
      company: j.company, role: j.position,
      location: j.location || "Remote",
      url: j.url ? `https://remoteok.com${j.url}` : "",
      atsType: "remoteok",
    }));
  } catch { return []; }
}

async function scrapeWeWorkRemotely() {
  try {
    const r = await fetch("https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss");
    const text = await r.text();
    const items = [];
    const regex = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g;
    let m;
    while ((m = regex.exec(text))) {
      const full = m[1];
      const parts = full.split(":");
      items.push({
        company: parts[0]?.trim() || "Unknown",
        title: parts.slice(1).join(":").trim() || full,
        location: "Remote",
        url: m[2],
        atsType: "weworkremotely",
      });
    }
    return items;
  } catch { return []; }
}

async function scrapeArbeitnow() {
  try {
    const r = await fetch("https://www.arbeitnow.com/api/job-board-api?tags=javascript,react,node&remote=true");
    const d = await r.json();
    return (d.data || []).map(j => ({
      company: j.company_name, role: j.title,
      location: j.location || "Remote",
      url: j.url,
      atsType: "arbeitnow",
    }));
  } catch { return []; }
}

async function scrapeHimalayas() {
  try {
    const r = await fetch("https://himalayas.app/jobs/api?limit=50&q=fullstack+react+node");
    const d = await r.json();
    return (d.jobs || []).map(j => ({
      company: j.companyName, role: j.title,
      location: "Remote",
      url: `https://himalayas.app/jobs/${j.slug}`,
      atsType: "himalayas",
    }));
  } catch { return []; }
}

/* ── Main ──────────────────────────────────────────────────── */
async function main() {
  console.log("🌊 Wave 28 — Accelerator Alumni + Conference Sponsors");
  const slugs = generateSlugs();
  console.log(`🔑 ${slugs.length} slugs to probe\n`);

  /* ATS scraping in batches */
  let allJobs = [];
  for (let i = 0; i < slugs.length; i += BATCH) {
    const batch = slugs.slice(i, i + BATCH);
    const pct = ((i / slugs.length) * 100).toFixed(0);
    process.stdout.write(`\r  ATS batch ${Math.floor(i/BATCH)+1}/${Math.ceil(slugs.length/BATCH)} (${pct}%)`);
    const results = await Promise.all(
      batch.flatMap(s => [
        scrapeGreenhouseSlug(s),
        scrapeAshbySlug(s),
        scrapeLeverSlug(s),
      ])
    );
    allJobs.push(...results.flat());
    await new Promise(r => setTimeout(r, 300));
  }
  console.log(`\n  ATS scrape done: ${allJobs.length} raw postings`);

  /* Job board APIs */
  console.log("  Scraping job board APIs...");
  const boards = await Promise.all([
    scrapeJobicy(), scrapeRemoteOK(), scrapeWeWorkRemotely(),
    scrapeArbeitnow(), scrapeHimalayas(),
  ]);
  const boardJobs = boards.flat();
  console.log(`  Job boards: ${boardJobs.length} postings`);
  allJobs.push(...boardJobs);

  /* Filter remote + relevant roles */
  let filtered = allJobs.filter(j => {
    if (!j.url) return false;
    const score = roleScore(j.title);
    if (score < 1) return false;
    // ATS jobs from our slug probes are assumed remote-friendly
    if (["greenhouse","ashby","lever"].includes(j.atsType)) return true;
    return REMOTE_RE.test(j.location);
  });

  /* Deduplicate by URL */
  const seen = new Set();
  filtered = filtered.filter(j => {
    const key = j.url.replace(/\?.*/, "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  /* Best role per company */
  const byCompany = new Map();
  for (const j of filtered) {
    const key = j.company.toLowerCase().replace(/[^a-z0-9]/g, "");
    const prev = byCompany.get(key);
    if (!prev || roleScore(j.title) > roleScore(prev.title)) {
      byCompany.set(key, j);
    }
  }

  /* Remove blocklisted companies */
  const fresh = [...byCompany.values()].filter(j => {
    const norm = j.company.toLowerCase().replace(/[^a-z0-9]/g, "");
    return !blocklist.has(norm) && !blocklist.has(j.company.toLowerCase());
  });

  /* Sort: ashby first (easiest to automate), then greenhouse, then rest */
  const atsPriority = { ashby: 0, greenhouse: 1, lever: 2 };
  fresh.sort((a, b) => {
    const pa = atsPriority[a.ats] ?? 3;
    const pb = atsPriority[b.ats] ?? 3;
    if (pa !== pb) return pa - pb;
    return roleScore(b.title) - roleScore(a.title);
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(fresh, null, 2));
  console.log(`\n✅ Wave 28 complete: ${fresh.length} new companies → ${OUTPUT_PATH}`);
  console.log(`   ATS breakdown: ${fresh.filter(j=>j.atsType==="ashby").length} Ashby, ${fresh.filter(j=>j.atsType==="greenhouse").length} GH, ${fresh.filter(j=>j.atsType==="lever").length} Lever, ${fresh.filter(j=>j.atsType==="other"||!["ashby","greenhouse","lever"].includes(j.atsType)).length} boards`);
}

main().catch(console.error);
