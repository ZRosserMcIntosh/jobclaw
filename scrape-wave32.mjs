#!/usr/bin/env node
/**
 * Wave 32 Scraper — Abbreviation/Acronym Cos + Mythology + Tech Jargon + Color/Number Brands
 *
 * Strategy: Short-name / acronym-style startups, mythology-inspired names,
 * developer-jargon brands, and color- or number-prefixed companies.
 */

import fs from "fs";

const BLOCKLIST_PATH = "/tmp/applied-companies.json";
const OUTPUT_PATH = "/tmp/wave32-jobs.json";
const REMOTE_RE = /remote|anywhere|latam|latin|americas|global|worldwide|distributed|wfh|work from home|emea|apac/i;
const BATCH = 35;

let blocklist = new Set();
try {
  const raw = fs.readFileSync(BLOCKLIST_PATH, "utf-8");
  blocklist = new Set(JSON.parse(raw).map(s => s.toLowerCase().trim()));
  console.log(`📋 Blocklist loaded: ${blocklist.size} companies`);
} catch { console.log("⚠️  No blocklist found"); }

function generateSlugs() {
  const acronyms_short = [
    "novu","deel","ramp","brex","vanta","drata","snyk",
    "loom","mux","brio","zest","deno","bun","sumo",
    "pipe","rho","arc","kard","aven","novo","nearside",
    "meow","relay","found","lili","teal","hone","bench",
    "pilot-hq","zeni","puzzle","digits","rillet","mosaic",
    "causal","jirav","datarails","cube-dev","vena","planful",
    "anaplan","adaptive-insights","netsuite","sage","xero",
    "fathom","syft","fintario","centage","budgyt",
    "tray-io","workato","celigo","boomi","snaplogic",
    "mulesoft","tibco","talend","informatica","fivetran",
    "stitch","hevodata","polytomic","census","hightouch",
    "rudderstack","segment","lytics","blueconic","treasure-data",
    "tealium","heap","pendo","amplitude","mixpanel",
    "posthog","june-so","koala","correlated","toplyne",
    "calixa","endgame","warmly","6sense","demandbase",
    "bombora","zoominfo","lusha","apollo-io","seamless-ai",
    "clearbit","cognism","kaspr","hunter-io","voila-norbert",
  ];

  const mythology_cultural = [
    "athena","hermes","apollo","artemis","prometheus","titan",
    "olympus","chronos","atlas-hq","orion","helios","selene",
    "eos","iris","midas","argos","icarus","daedalus",
    "minerva","neptune","vulcan","janus","fortuna","terra-hq",
    "phoenix-hq","hydra","sphinx","griffin","pegasus","chimera",
    "kraken","leviathan","valkyrie","odin","thor","loki",
    "freya","heimdall","fenrir","ragnarok","asgard","niflheim",
    "sakura","zen","bushido","ronin","shogun","daimyo",
    "samurai","ninja-van","katana","sensei","satori","kintsugi",
    "anubis","osiris","horus","isis","sobek","bastet",
    "thoth","amun","maya","aztec","inca","quetzal",
    "jaguar","condor","puma","llama","alpaca","vicuna",
    "kairos","aion","delphi","sibyl","oracle-hq","pythia",
    "elysium","arcadia-hq","avalon","camelot","excalibur",
    "merlin","mordred","lancelot","galahad","grail",
  ];

  const tech_jargon = [
    "stackbit","gitpod","codespace","replit","glitch",
    "vercel","netlify","render","railway","fly-io",
    "supabase","nhost","appwrite","convex","xata",
    "turso","neon","planetscale","cockroachdb","singlestore",
    "timescale","questdb","clickhouse","materialize","risingwave",
    "bytewax","decodable","confluent","redpanda","warpstream",
    "upstash","momento","macrometa","fauna","harperdb",
    "couchbase","scylladb","arangodb","neo4j","tigergraph",
    "memgraph","terminusdb","ditto","realm","couchbase-mobile",
    "powersync","electric-sql","liveblocks","partykit","ably",
    "pusher","pubnub","sendbird","stream","getstream",
    "cometchat","talkjs","rocket-chat","zulip","matrix-org",
    "element","wire","wickr","threema","signal-hq",
    "keybase","proton","tutanota","fastmail","hey",
    "basecamp","linear","height","shortcut","clubhouse-io",
    "plane-so","huly","jetbrains","zed","cursor",
    "tabnine","codeium","sourcery","deepcode","snyk-code",
    "semgrep","sonarqube","codacy","codeclimate","coveralls",
  ];

  const color_number = [
    "redpoint","bluecore","greenlane","blackline","whiteops",
    "goldengate","silverlake","orangetheory","purplebricks",
    "indigo","violet","crimson","scarlet","azure-hq",
    "cobalt","slate","ivory","obsidian","onyx-hq",
    "carbon","graphite","platinum","titanium-hq","chromium-hq",
    "neon-hq","argon","helium-hq","xenon","krypton-hq",
    "zero","one-app","twofer","three","fourthwall",
    "fivetran","sixsense","sevenrooms","eightfold","ninety",
    "tenx","hundred","thousand-eyes","unit21","twenty",
    "eleven","twelve","thirteen","fourteen","fifteen-five",
    "sixteen","seventeen","eighteen","nineteen","twentyfour",
    "x1","v2","h1","g2","d2","m1","r2",
    "octane","triad","quad","quint","hex-trust",
    "primo","duo","trio","quad-ai","penta",
  ];

  const all = [...new Set([
    ...acronyms_short, ...mythology_cultural, ...tech_jargon, ...color_number
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
    return (d.jobs || []).map(j => ({ company: slug, role: j.title, location: j.location?.name || "", url: j.absolute_url, atsType: "greenhouse" }));
  } catch { return []; }
}
async function scrapeAshbySlug(slug) {
  try {
    const r = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.jobs || []).map(j => ({ company: slug, role: j.title, location: j.location || j.locationName || "", url: `https://jobs.ashbyhq.com/${slug}/${j.id}`, atsType: "ashby" }));
  } catch { return []; }
}
async function scrapeLeverSlug(slug) {
  try {
    const r = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`);
    if (!r.ok) return [];
    const d = await r.json();
    if (!Array.isArray(d)) return [];
    return d.map(j => ({ company: slug, role: j.text, location: j.categories?.location || "", url: j.hostedUrl || j.applyUrl || "", atsType: "lever" }));
  } catch { return []; }
}

async function scrapeJobicy() {
  try { const r = await fetch("https://jobicy.com/api/v2/remote-jobs?count=50&tag=javascript,react,node,typescript,fullstack"); const d = await r.json(); return (d.jobs||[]).map(j=>({company:j.companyName,role:j.jobTitle,location:j.jobGeo||"Remote",url:j.url,atsType:"jobicy"})); } catch { return []; }
}
async function scrapeRemoteOK() {
  try { const r = await fetch("https://remoteok.com/api?tag=dev",{headers:{"User-Agent":"CareerOps/1.0"}}); const d = await r.json(); return d.slice(1).map(j=>({company:j.company,role:j.position,location:j.location||"Remote",url:j.url?`https://remoteok.com${j.url}`:"",atsType:"remoteok"})); } catch { return []; }
}
async function scrapeWeWorkRemotely() {
  try { const r = await fetch("https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss"); const t = await r.text(); const items=[]; const re=/<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g; let m; while((m=re.exec(t))){const f=m[1],p=f.split(":"); items.push({company:p[0]?.trim()||"Unknown",role:p.slice(1).join(":").trim()||f,location:"Remote",url:m[2],atsType:"weworkremotely"});} return items; } catch { return []; }
}
async function scrapeArbeitnow() {
  try { const r = await fetch("https://www.arbeitnow.com/api/job-board-api?tags=javascript,react,node&remote=true"); const d = await r.json(); return (d.data||[]).map(j=>({company:j.company_name,role:j.title,location:j.location||"Remote",url:j.url,atsType:"arbeitnow"})); } catch { return []; }
}
async function scrapeHimalayas() {
  try { const r = await fetch("https://himalayas.app/jobs/api?limit=50&q=fullstack+react+node"); const d = await r.json(); return (d.jobs||[]).map(j=>({company:j.companyName,role:j.title,location:"Remote",url:`https://himalayas.app/jobs/${j.slug}`,atsType:"himalayas"})); } catch { return []; }
}

async function main() {
  console.log("🌊 Wave 32 — Acronyms + Mythology + Tech Jargon + Color/Number Brands");
  const slugs = generateSlugs();
  console.log(`🔑 ${slugs.length} slugs to probe\n`);

  let allJobs = [];
  for (let i = 0; i < slugs.length; i += BATCH) {
    const batch = slugs.slice(i, i + BATCH);
    process.stdout.write(`\r  ATS batch ${Math.floor(i/BATCH)+1}/${Math.ceil(slugs.length/BATCH)} (${((i/slugs.length)*100).toFixed(0)}%)`);
    const results = await Promise.all(batch.flatMap(s => [scrapeGreenhouseSlug(s), scrapeAshbySlug(s), scrapeLeverSlug(s)]));
    allJobs.push(...results.flat());
    await new Promise(r => setTimeout(r, 300));
  }
  console.log(`\n  ATS scrape done: ${allJobs.length} raw postings`);

  console.log("  Scraping job board APIs...");
  const boards = await Promise.all([scrapeJobicy(), scrapeRemoteOK(), scrapeWeWorkRemotely(), scrapeArbeitnow(), scrapeHimalayas()]);
  allJobs.push(...boards.flat());
  console.log(`  Job boards: ${boards.flat().length} postings`);

  let filtered = allJobs.filter(j => {
    if (!j.url) return false;
    if (roleScore(j.role) < 1) return false;
    if (["greenhouse","ashby","lever"].includes(j.atsType)) return true;
    return REMOTE_RE.test(j.location);
  });
  const seen = new Set();
  filtered = filtered.filter(j => { const k = j.url.replace(/\?.*/, "").toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });

  const byCompany = new Map();
  for (const j of filtered) { const k = j.company.toLowerCase().replace(/[^a-z0-9]/g, ""); const p = byCompany.get(k); if (!p || roleScore(j.role) > roleScore(p.role)) byCompany.set(k, j); }

  const fresh = [...byCompany.values()].filter(j => { const n = j.company.toLowerCase().replace(/[^a-z0-9]/g, ""); return !blocklist.has(n) && !blocklist.has(j.company.toLowerCase()); });

  const atsPriority = { ashby: 0, greenhouse: 1, lever: 2 };
  fresh.sort((a, b) => { const pa = atsPriority[a.atsType] ?? 3, pb = atsPriority[b.atsType] ?? 3; return pa !== pb ? pa - pb : roleScore(b.role) - roleScore(a.role); });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(fresh, null, 2));
  console.log(`\n✅ Wave 32 complete: ${fresh.length} new companies → ${OUTPUT_PATH}`);
  console.log(`   ATS breakdown: ${fresh.filter(j=>j.atsType==="ashby").length} Ashby, ${fresh.filter(j=>j.atsType==="greenhouse").length} GH, ${fresh.filter(j=>j.atsType==="lever").length} Lever, ${fresh.filter(j=>!["ashby","greenhouse","lever"].includes(j.atsType)).length} boards`);
}

main().catch(console.error);
