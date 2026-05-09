#!/usr/bin/env node
/**
 * Wave 33 Scraper — HealthTech + LegalTech + EdTech + ClimateTech + Logistics
 *
 * Strategy: Healthcare/biotech platforms, legal tech, education platforms,
 * climate/sustainability tech, and logistics/supply-chain companies.
 */

import fs from "fs";

const BLOCKLIST_PATH = "/tmp/applied-companies.json";
const OUTPUT_PATH = "/tmp/wave33-jobs.json";
const REMOTE_RE = /remote|anywhere|latam|latin|americas|global|worldwide|distributed|wfh|work from home|emea|apac/i;
const BATCH = 35;

let blocklist = new Set();
try {
  const raw = fs.readFileSync(BLOCKLIST_PATH, "utf-8");
  blocklist = new Set(JSON.parse(raw).map(s => s.toLowerCase().trim()));
  console.log(`📋 Blocklist loaded: ${blocklist.size} companies`);
} catch { console.log("⚠️  No blocklist found"); }

function generateSlugs() {
  const healthtech = [
    "oscar-health","hims","ro","nurx","cerebral","talkiatry",
    "headway","alma","grow-therapy","spring-health","lyra-health",
    "ginger","talkspace","betterhelp","modern-health","calm",
    "noom","virta","omada","livongo","dexcom","oura",
    "whoop","biostrap","withings","garmin-health","apple-health",
    "fitbit-health","peloton","tonal","mirror","tempo",
    "carbon-health","forward","one-medical","crossover-health",
    "parsley-health","ever-northera","teladoc","amwell","mdlive",
    "sesame-care","plushcare","k-health","buoy-health","ada-health",
    "infermedica","babylon","doctolib","zocdoc","solv",
    "tebra","jane-app","drchrono","elation","athenahealth",
    "kareo","nextgen","eclinicalworks","meditech","epic-systems",
    "cerner","veradigm","greenway","modernizing-medicine","nextech",
    "phreesia","relatient","luma-health","klara","rhinogram",
    "doximity","medscape","figure1","amboss","osmosis",
    "lecturio","sketchy","boards-and-beyond","uworld","anki-med",
    "tempus","flatiron-health","guardant","grail","freenome",
    "invitae","color","myriad","natera","illumina",
    "10x-genomics","pacific-bio","oxford-nanopore","twist-bio",
  ];

  const legaltech = [
    "clio","smokeball","lawcus","mycase","cosmolex",
    "actionstep","filevine","litify","appara","neos",
    "relativity","everlaw","reveal-brainspace","logikcull","exterro",
    "disco","nuix","cellebrite","opentext","veritas-legal",
    "ironclad","docusign","concord","agiloft","juro",
    "lexion","outlaw","precisely","top-hat","litera",
    "netdocuments","imanage","worldox","m-files","sharefile",
    "luminance","kira-systems","diligent","donnelley","lexisnexis",
    "westlaw","bloomberg-law","fastcase","casetext","vlex",
    "ross-intel","spellbook","harvey-ai","lex-machina","ravel-law",
    "gavelytics","premonition","pre-law","lawtrades","axiom-law",
    "elevate-services","factor-law","riverview-law","morae","legalzoom",
    "rocket-lawyer","nolo","avvo","justia","findlaw",
    "martindale","super-lawyers","justis","notarize","proof",
    "snapdocs","qualia","propy","modus","dotloop",
  ];

  const edtech = [
    "duolingo","babbel","busuu","memrise","rosetta-stone",
    "cambly","preply","italki","verbling","lingoda",
    "khan-academy","brilliant","byju","unacademy","vedantu",
    "toppr","extramarks","doubtnut","photomath","mathway",
    "chegg","bartleby","studysmarter","anki","quizlet",
    "brainly","socratic","wolfram","desmos","geogebra",
    "canvas-lms","blackboard","moodle","schoology","google-classroom",
    "edmodo","seesaw","classdojo","remind","bloomz",
    "clever","classlink","skyward","powerschool","infinite-campus",
    "aeries","illuminate","panorama-ed","brightbytes","schoolzilla",
    "instructure","d2l","anthology","ellucian","workday-student",
    "slate-technolutions","collegevine","niche","unigo","cappex",
    "naviance","scoir","cialfo","maia-learning","overgrad",
    "teachable","thinkific","kajabi","podia","mighty-networks",
    "circle-so","skool","heartbeat","commsor","orbit-love",
  ];

  const climatetech = [
    "arcadia","palmetto","aurora-solar","enphase","sunrun",
    "sunnova","vivint-solar","sunpower","generac","span-io",
    "sense","emporia-energy","neurio","iotawatt","rainforest",
    "ohmconnect","octopus-energy","bulb","tibber","ostrom",
    "gridx","enbala","autogrid","stem-inc","fluence",
    "eos-energy","form-energy","ambri","malta-inc","antora",
    "heliogen","brightsource","abengoa","solaredge","fronius",
    "sma-solar","goodwe","growatt","huawei-solar","jinko",
    "longi","trina-solar","canadian-solar","first-solar","qcells",
    "rec-group","risen","ja-solar","maxeon","suntech",
    "watttime","singularity-energy","electricitymaps","tomorrow-co",
    "patch-io","cloverly","pachama","ncx","sylvera",
    "verra","gold-standard","south-pole","climeworks","carbfix",
    "charm-industrial","heirloom-carbon","sustaera","verdox","global-thermostat",
  ];

  const logistics = [
    "flexport","forto","freightos","xeneta","project44",
    "fourkites","macropoint","descartes","e2open","blue-yonder",
    "manhattan-associates","kinaxis","coupa","jaggaer","ivalua",
    "gep","zycus","procurify","precoro","kissflow",
    "samsara","motive","keeptruckin","trimble","omnitracs",
    "verizon-connect","geotab","azuga","gps-trackit","teletrac",
    "shipbob","shiphero","shipstation","easyship","pirate-ship",
    "goshippo","stamps","pitney-bowes","endicia","sendle",
    "bringg","onfleet","getswift","locus","fareye",
    "routific","optimo-route","workwave","badger-maps","mapsly",
    "deliverr","convey","narvar","aftership","parcellab",
    "wonderment","malomo","tracktor","ordoro","skubana",
    "cin7","dear-systems","katana","mrpeasy","fishbowl",
    "inflow","sortly","boxhero","asset-panda","snipe-it",
  ];

  const all = [...new Set([
    ...healthtech, ...legaltech, ...edtech, ...climatetech, ...logistics
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
  console.log("🌊 Wave 33 — HealthTech + LegalTech + EdTech + ClimateTech + Logistics");
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
  console.log(`\n✅ Wave 33 complete: ${fresh.length} new companies → ${OUTPUT_PATH}`);
  console.log(`   ATS breakdown: ${fresh.filter(j=>j.atsType==="ashby").length} Ashby, ${fresh.filter(j=>j.atsType==="greenhouse").length} GH, ${fresh.filter(j=>j.atsType==="lever").length} Lever, ${fresh.filter(j=>!["ashby","greenhouse","lever"].includes(j.atsType)).length} boards`);
}

main().catch(console.error);
