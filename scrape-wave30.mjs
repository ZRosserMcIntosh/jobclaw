#!/usr/bin/env node
/**
 * Wave 30 Scraper — Geographic Companies + Compound Words R2
 *
 * Strategy: Companies named after cities/places, two-word compounds,
 * animal/nature names (common startup naming patterns), and
 * action-verb brand names.
 */

import fs from "fs";

const BLOCKLIST_PATH = "/tmp/applied-companies.json";
const OUTPUT_PATH = "/tmp/wave30-jobs.json";
const REMOTE_RE = /remote|anywhere|latam|latin|americas|global|worldwide|distributed|wfh|work from home|emea|apac/i;
const BATCH = 35;

let blocklist = new Set();
try {
  const raw = fs.readFileSync(BLOCKLIST_PATH, "utf-8");
  blocklist = new Set(JSON.parse(raw).map(s => s.toLowerCase().trim()));
  console.log(`📋 Blocklist loaded: ${blocklist.size} companies`);
} catch { console.log("⚠️  No blocklist found"); }

function generateSlugs() {
  const geo_names = [
    "atlas","meridian","summit","zenith","compass","horizon",
    "alpine","aurora","canyon","delta","evergreen","frontier",
    "harbor","junction","keystone","lighthouse","mountain",
    "northstar","outpost","pacific","quest","ridgeline",
    "sierra","trailhead","upland","valley","westward",
    "beacon","coastal","crest","eastside","fieldstone",
    "gateway","highland","ironwood","jetstream","kingsway",
    "lakeside","maple","northpoint","oakwood","pinnacle",
    "quarry","riverside","stonegate","tidewater","uptown",
    "vista","windward","arcadia","bayside","cambridge",
    "durham","essex","foxborough","greenwich","hartford",
    "ithaca","jamestown","kensington","lincoln","madison",
    "newport","oxford","portland","quincy","richmond",
    "stanford","trent","union","vernon","westfield",
    "york","ashland","berkeley","charleston","dover",
    "edison","franklin","georgetown","hamilton","irving",
    "jefferson","kingston","lancaster","monroe","norfolk",
    "olympia","princeton","quinton","raleigh","savannah",
    "trenton","urbana","victoria","wellington","xander",
  ];

  const animal_nature = [
    "falcon","hawk","eagle","osprey","raven","phoenix",
    "panther","tiger","wolf","fox","bear","lion",
    "cobra","viper","scorpion","mantis","cricket","firefly",
    "orca","dolphin","whale","shark","barracuda","sailfish",
    "cedar","oak","pine","birch","aspen","sequoia",
    "coral","reef","pearl","shell","wave","tide",
    "storm","thunder","lightning","blaze","ember","spark",
    "frost","glacier","arctic","polar","tundra","avalanche",
    "nebula","cosmos","stellar","lunar","solar","comet",
    "orbit","quasar","pulsar","nova","astro","galaxy",
    "terra","gaia","flora","fauna","bloom","seed",
    "root","branch","leaf","grove","meadow","field",
    "stone","flint","iron","copper","silver","gold",
    "ruby","sapphire","emerald","onyx","jade","opal",
    "crystal","diamond","prism","spectrum","ray","beam",
  ];

  const action_verbs = [
    "amplify","boost","catalyze","drive","elevate","forge",
    "grow","harness","ignite","jumpstart","kindle","launch",
    "magnify","nurture","optimize","propel","quicken","rally",
    "scale","transform","unify","validate","wield","yield",
    "accelerate","balance","calibrate","deploy","engineer",
    "focus","generate","hustle","iterate","join","keep",
    "leverage","mobilize","navigate","orchestrate","pivot",
    "qualify","resolve","simplify","track","uplift","verify",
    "weave","xpand","zip","adapt","bridge","connect",
    "discover","explore","flex","guide","help","inspire",
    "jetpack","kickstart","learn","master","network","open",
    "plan","quest","reach","stride","thrive","unlock",
    "venture","win","xceed","yonder","zenify",
  ];

  const compound_brands = [
    "clearbit","upwork","taskrabbit","crowdstrike","cloudflare",
    "snowflake","databricks","fivetran","airbyte","hightouch",
    "deepgram","speechify","liveblocks","stackblitz","codesandbox",
    "bitbucket","gitlab","sourcegraph","logdna","papertrail",
    "bugsnag","rollbar","crashlytics","mixpanel","fullstory",
    "hotjar","userleap","sprig","maze-co","usertesting",
    "testdome","coderbyte","hackerrank","leetcode","algoexpert",
    "interviewcake","pramp","interviewing-io","karat","byteboard",
    "codesignal","triplebyte","hired","vettery","underdog",
    "wellfound","angellist","workatastartup","yc-companies",
    "techcrunch","producthunt","betalist","indiehackers","microconf",
    "saasgroup","scalevp","greylock","accel","a16z",
    "sequoia","benchmark","lightspeed","bvp","ggv",
    "insight-partners","tiger-global","coatue","addition",
    "ribbit","lux-capital","founders-fund","thrive-capital",
    "general-catalyst","index-ventures","felicis","wing-vc",
    "initialized","yc","techstars","500-global","antler",
    "techstars","plug-and-play","seedcamp","entrepreneur-first",
    "on-deck","south-park-commons","pioneer","buildspace",
    "reforge","section4","maven","cohort","outschool",
    "coursera","udemy","skillshare","pluralsight","egghead",
    "frontendmasters","codecademy","freecodecamp","thinkful",
    "springboard","lambdaschool","bloomtech","microverse",
    "codesmith","hack-reactor","fullstack-academy","app-academy",
    "flatiron-school","general-assembly","ironhack","le-wagon",
  ];

  const all = [...new Set([
    ...geo_names, ...animal_nature, ...action_verbs, ...compound_brands
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
  try { const r = await fetch("https://jobicy.com/api/v2/remote-jobs?count=50&tag=javascript,react,node,typescript,fullstack"); const d = await r.json(); return (d.jobs||[]).map(j=>({company:j.companyName,title:j.jobTitle,location:j.jobGeo||"Remote",url:j.url,ats:"jobicy"})); } catch { return []; }
}
async function scrapeRemoteOK() {
  try { const r = await fetch("https://remoteok.com/api?tag=dev",{headers:{"User-Agent":"CareerOps/1.0"}}); const d = await r.json(); return d.slice(1).map(j=>({company:j.company,title:j.position,location:j.location||"Remote",url:j.url?`https://remoteok.com${j.url}`:"",ats:"remoteok"})); } catch { return []; }
}
async function scrapeWeWorkRemotely() {
  try { const r = await fetch("https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss"); const t = await r.text(); const items=[]; const re=/<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g; let m; while((m=re.exec(t))){const f=m[1],p=f.split(":"); items.push({company:p[0]?.trim()||"Unknown",title:p.slice(1).join(":").trim()||f,location:"Remote",url:m[2],ats:"weworkremotely"});} return items; } catch { return []; }
}
async function scrapeArbeitnow() {
  try { const r = await fetch("https://www.arbeitnow.com/api/job-board-api?tags=javascript,react,node&remote=true"); const d = await r.json(); return (d.data||[]).map(j=>({company:j.company_name,title:j.title,location:j.location||"Remote",url:j.url,ats:"arbeitnow"})); } catch { return []; }
}
async function scrapeHimalayas() {
  try { const r = await fetch("https://himalayas.app/jobs/api?limit=50&q=fullstack+react+node"); const d = await r.json(); return (d.jobs||[]).map(j=>({company:j.companyName,title:j.title,location:"Remote",url:`https://himalayas.app/jobs/${j.slug}`,ats:"himalayas"})); } catch { return []; }
}

async function main() {
  console.log("🌊 Wave 30 — Geographic Companies + Compound Words R2");
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
    if (roleScore(j.title) < 1) return false;
    if (["greenhouse","ashby","lever"].includes(j.atsType)) return true;
    return REMOTE_RE.test(j.location);
  });
  const seen = new Set();
  filtered = filtered.filter(j => { const k = j.url.replace(/\?.*/, "").toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });

  const byCompany = new Map();
  for (const j of filtered) { const k = j.company.toLowerCase().replace(/[^a-z0-9]/g, ""); const p = byCompany.get(k); if (!p || roleScore(j.title) > roleScore(p.title)) byCompany.set(k, j); }

  const fresh = [...byCompany.values()].filter(j => { const n = j.company.toLowerCase().replace(/[^a-z0-9]/g, ""); return !blocklist.has(n) && !blocklist.has(j.company.toLowerCase()); });

  const atsPriority = { ashby: 0, greenhouse: 1, lever: 2 };
  fresh.sort((a, b) => { const pa = atsPriority[a.ats] ?? 3, pb = atsPriority[b.ats] ?? 3; return pa !== pb ? pa - pb : roleScore(b.title) - roleScore(a.title); });

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(fresh, null, 2));
  console.log(`\n✅ Wave 30 complete: ${fresh.length} new companies → ${OUTPUT_PATH}`);
  console.log(`   ATS breakdown: ${fresh.filter(j=>j.atsType==="ashby").length} Ashby, ${fresh.filter(j=>j.atsType==="greenhouse").length} GH, ${fresh.filter(j=>j.atsType==="lever").length} Lever, ${fresh.filter(j=>j.atsType==="other"||!["ashby","greenhouse","lever"].includes(j.atsType)).length} boards`);
}

main().catch(console.error);
