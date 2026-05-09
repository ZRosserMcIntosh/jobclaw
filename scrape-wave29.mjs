#!/usr/bin/env node
/**
 * Wave 29 Scraper — Open-Source Orgs + DevTool Companies
 *
 * Strategy: Well-known GitHub organizations, npm/registry publishers,
 * developer tool companies, and infrastructure/cloud-native vendors.
 */

import fs from "fs";
import path from "path";

const BLOCKLIST_PATH = "/tmp/applied-companies.json";
const OUTPUT_PATH = "/tmp/wave29-jobs.json";
const REMOTE_RE = /remote|anywhere|latam|latin|americas|global|worldwide|distributed|wfh|work from home|emea|apac/i;
const BATCH = 35;

let blocklist = new Set();
try {
  const raw = fs.readFileSync(BLOCKLIST_PATH, "utf-8");
  blocklist = new Set(JSON.parse(raw).map(s => s.toLowerCase().trim()));
  console.log(`📋 Blocklist loaded: ${blocklist.size} companies`);
} catch { console.log("⚠️  No blocklist found"); }

function generateSlugs() {
  const github_orgs = [
    "facebook","meta","google","microsoft","apple","amazon",
    "netflix","uber","lyft","airbnb","twitter","x-corp",
    "palantir","databricks","snowflake","confluent","elastic",
    "grafana-labs","hashicorp","digitalocean","linode","vultr",
    "hetzner","fly-io","deno","bun-sh","oven-sh","ziglang",
    "rust-lang","golang","python","nodejs","denoland","withastro",
    "sveltejs","vuejs","angular","solidjs","qwikdev","preactjs",
    "htmx-org","hotwired","alpinejs","stimulus","marko",
    "ember-cli","nuxt","remix-run","redwoodjs","blitz-js",
    "trpc","drizzle-team","prisma","typeorm","sequelize",
    "knex","objection","mikro-orm","kysely","slonik",
    "edgedb","fauna","cockroachdb","planetscale","xata",
    "supabase","firebase","appwrite","nhost","pocketbase",
    "directus","payload","strapi","sanity","contentful",
    "ghostcms","keystonejs","wagtail","django-cms",
    "tailwindlabs","shadcn","radix-ui","chakra-ui","mantine",
    "ariakit","headless-ui","reach-ui","react-aria","park-ui",
    "tremor","recharts","visx","nivo","victory",
    "d3","plotly","highcharts","apexcharts","chartjs",
    "mapbox","maplibre","leaflet","openlayers","cesium",
    "deck-gl","kepler-gl","h3geo","turf","uber-web",
    "vercel","netlify","cloudflare","fastly","akamai",
    "bunny-net","keycdn","stackpath","gcore","cdn77",
  ];

  const devtools = [
    "jetbrains","atlassian","github","gitlab","bitbucket",
    "sourcegraph","codestream","gitkraken","tower","fork",
    "sublime-hq","panic","bbedit","textmate","lapce",
    "zed-industries","helix-editor","neovim","kakoune",
    "wezterm","alacritty","kitty","hyper","warp-dev",
    "iterm2","tabby-terminal","wave-terminal","rio-term",
    "fig","withfig","codewhisperer","copilot","tabnine",
    "codeium","supermaven","cursor","continue-dev","aider",
    "sweep-ai","codium-ai","sourcery-ai","snyk","sonar",
    "semgrep","checkmarx","veracode","fortify","contrast",
    "stackhawk","detectify","intruder","pentest-tools",
    "bugcrowd","hackerone","synack","cobalt","intigriti",
    "huntr","immunefi","code4rena","sherlock-audit",
    "trail-of-bits","openzeppelin","certora","consensys",
    "alchemy","infura","moralis","thirdweb","hardhat",
    "foundry","brownie","anchor","solana-labs","aptos-labs",
    "sui-network","near","avalanche","polygon","arbitrum",
    "optimism","base","zksync","starknet","scroll",
    "layerzero","wormhole","axelar","hyperlane","chainlink",
    "band-protocol","api3","pyth-network","switchboard",
    "the-graph","goldsky","envio","ponder","subquery",
    "dune","nansen","flipside","messari","coingecko",
  ];

  const infra_vendors = [
    "docker","kubernetes","rancher","suse","canonical",
    "redhat","vmware","broadcom","nutanix","proxmox",
    "portainer","coolify","dokku","caprover","railway",
    "render","cyclic","adaptable","koyeb","zeabur",
    "northflank","coherence","qovery","porter-dev","massdriver",
    "zeet","depot","earthly","dagger","buildkite",
    "circleci","github-actions","gitlab-ci","jenkins","drone",
    "woodpecker","concourse","harness","codefresh","spinnaker",
    "argocd","fluxcd","keptn","backstage","cortex",
    "opslevel","effx","configure8","rely-io","roadie",
    "getport","kratix","humanitec","score","dapr",
    "envoy","istio","linkerd","consul","traefik",
    "nginx","caddy","haproxy","kong","apisix",
    "gravitee","tyk","apigee","mulesoft","postman",
    "insomnia","hoppscotch","bruno","httpie","paw",
    "rapidapi","stoplight","readme","redocly","bump-sh",
    "fern","speakeasy","stainless","liblab","apidog",
  ];

  const cloud_native = [
    "datadog","newrelic","splunk","dynatrace","appd",
    "lightstep","honeycomb","grafana","prometheus","thanos",
    "cortex-metrics","mimir","loki","tempo","jaeger",
    "zipkin","signoz","uptrace","hyperdx","highlight",
    "openobserve","quickwit","parseable","logfire","axiom",
    "betterstack","cronitor","checkly","uptime-kuma","statuspage",
    "cachet","instatus","openstatus","hyperping","pulsetic",
    "freshping","updown","montastic","hetrixtools","nodeping",
    "terraformcloud","spacelift","env0","scalr","atlantis",
    "digger","terrateam","opentofu","cdktf","pulumi",
    "crossplane","upbound","komodor","robusta","kubecost",
    "opencost","vantage","infracost","finops","spot-io",
    "cast-ai","zesty","densify","cloudhealth","cloudability",
    "apptio","flexera","snow-software","zylo","productiv",
    "blissfully","torii","vendr","sastrify","cledara",
    "spendflo","tropic","vertice","navan","brex",
  ];

  const all = [...new Set([
    ...github_orgs, ...devtools, ...infra_vendors, ...cloud_native
  ])];
  return all.filter(s => !blocklist.has(s.replace(/-/g, " ").toLowerCase()));
}

function roleScore(title) {
  const t = title.toLowerCase();
  if (/intern|director|vp |chief|head of|manager|lead recruiter|sales|marketing|legal|accountant|finance|hr |human resource|people ops/i.test(t)) return -1;
  if (/fullstack|full-stack|full stack|react|typescript|node\.?js|javascript/i.test(t)) return 3;
  if (/software engineer|software developer|web developer|frontend|front-end|backend|back-end|architect|platform engineer/i.test(t)) return 2;
  if (/devops|sre|site reliability|infrastructure|cloud engineer|data engineer/i.test(t)) return 1;
  return 0;
}

async function scrapeGreenhouseSlug(slug) {
  try {
    const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.jobs || []).map(j => ({
      company: slug, role: j.title, location: j.location?.name || "",
      url: j.absolute_url, atsType: "greenhouse",
    }));
  } catch { return []; }
}

async function scrapeAshbySlug(slug) {
  try {
    const r = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.jobs || []).map(j => ({
      company: slug, role: j.title, location: j.location || j.locationName || "",
      url: `https://jobs.ashbyhq.com/${slug}/${j.id}`, atsType: "ashby",
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
      company: slug, role: j.text, location: j.categories?.location || "",
      url: j.hostedUrl || j.applyUrl || "", atsType: "lever",
    }));
  } catch { return []; }
}

async function scrapeJobicy() {
  try {
    const r = await fetch("https://jobicy.com/api/v2/remote-jobs?count=50&tag=javascript,react,node,typescript,fullstack");
    const d = await r.json();
    return (d.jobs || []).map(j => ({ company: j.companyName, role: j.jobTitle, location: j.jobGeo || "Remote", url: j.url, atsType: "jobicy" }));
  } catch { return []; }
}

async function scrapeRemoteOK() {
  try {
    const r = await fetch("https://remoteok.com/api?tag=dev", { headers: { "User-Agent": "CareerOps/1.0" } });
    const d = await r.json();
    return d.slice(1).map(j => ({ company: j.company, role: j.position, location: j.location || "Remote", url: j.url ? `https://remoteok.com${j.url}` : "", atsType: "remoteok" }));
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
      const full = m[1]; const parts = full.split(":");
      items.push({ company: parts[0]?.trim() || "Unknown", title: parts.slice(1).join(":").trim() || full, location: "Remote", url: m[2], atsType: "weworkremotely" });
    }
    return items;
  } catch { return []; }
}

async function scrapeArbeitnow() {
  try {
    const r = await fetch("https://www.arbeitnow.com/api/job-board-api?tags=javascript,react,node&remote=true");
    const d = await r.json();
    return (d.data || []).map(j => ({ company: j.company_name, role: j.title, location: j.location || "Remote", url: j.url, atsType: "arbeitnow" }));
  } catch { return []; }
}

async function scrapeHimalayas() {
  try {
    const r = await fetch("https://himalayas.app/jobs/api?limit=50&q=fullstack+react+node");
    const d = await r.json();
    return (d.jobs || []).map(j => ({ company: j.companyName, role: j.title, location: "Remote", url: `https://himalayas.app/jobs/${j.slug}`, atsType: "himalayas" }));
  } catch { return []; }
}

async function main() {
  console.log("🌊 Wave 29 — Open-Source Orgs + DevTool Companies");
  const slugs = generateSlugs();
  console.log(`🔑 ${slugs.length} slugs to probe\n`);

  let allJobs = [];
  for (let i = 0; i < slugs.length; i += BATCH) {
    const batch = slugs.slice(i, i + BATCH);
    const pct = ((i / slugs.length) * 100).toFixed(0);
    process.stdout.write(`\r  ATS batch ${Math.floor(i/BATCH)+1}/${Math.ceil(slugs.length/BATCH)} (${pct}%)`);
    const results = await Promise.all(
      batch.flatMap(s => [scrapeGreenhouseSlug(s), scrapeAshbySlug(s), scrapeLeverSlug(s)])
    );
    allJobs.push(...results.flat());
    await new Promise(r => setTimeout(r, 300));
  }
  console.log(`\n  ATS scrape done: ${allJobs.length} raw postings`);

  console.log("  Scraping job board APIs...");
  const boards = await Promise.all([
    scrapeJobicy(), scrapeRemoteOK(), scrapeWeWorkRemotely(),
    scrapeArbeitnow(), scrapeHimalayas(),
  ]);
  allJobs.push(...boards.flat());
  console.log(`  Job boards: ${boards.flat().length} postings`);

  let filtered = allJobs.filter(j => {
    if (!j.url) return false;
    if (roleScore(j.title) < 1) return false;
    if (["greenhouse","ashby","lever"].includes(j.atsType)) return true;
    return REMOTE_RE.test(j.location);
  });

  const seen = new Set();
  filtered = filtered.filter(j => {
    const key = j.url.replace(/\?.*/, "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });

  const byCompany = new Map();
  for (const j of filtered) {
    const key = j.company.toLowerCase().replace(/[^a-z0-9]/g, "");
    const prev = byCompany.get(key);
    if (!prev || roleScore(j.title) > roleScore(prev.title)) byCompany.set(key, j);
  }

  const fresh = [...byCompany.values()].filter(j => {
    const norm = j.company.toLowerCase().replace(/[^a-z0-9]/g, "");
    return !blocklist.has(norm) && !blocklist.has(j.company.toLowerCase());
  });

  const atsPriority = { ashby: 0, greenhouse: 1, lever: 2 };
  fresh.sort((a, b) => {
    const pa = atsPriority[a.ats] ?? 3;
    const pb = atsPriority[b.ats] ?? 3;
    return pa !== pb ? pa - pb : roleScore(b.title) - roleScore(a.title);
  });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(fresh, null, 2));
  console.log(`\n✅ Wave 29 complete: ${fresh.length} new companies → ${OUTPUT_PATH}`);
  console.log(`   ATS breakdown: ${fresh.filter(j=>j.atsType==="ashby").length} Ashby, ${fresh.filter(j=>j.atsType==="greenhouse").length} GH, ${fresh.filter(j=>j.atsType==="lever").length} Lever, ${fresh.filter(j=>j.atsType==="other"||!["ashby","greenhouse","lever"].includes(j.atsType)).length} boards`);
}

main().catch(console.error);
