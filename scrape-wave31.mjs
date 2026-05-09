#!/usr/bin/env node
/**
 * Wave 31 Scraper — Vertical SaaS + Niche Industry Tech
 *
 * Strategy: Food/restaurant tech, HR/people tech, martech,
 * proptech, insurtech, regtech, govtech, agtech, and
 * sports/entertainment tech companies.
 */

import fs from "fs";

const BLOCKLIST_PATH = "/tmp/applied-companies.json";
const OUTPUT_PATH = "/tmp/wave31-jobs.json";
const REMOTE_RE = /remote|anywhere|latam|latin|americas|global|worldwide|distributed|wfh|work from home|emea|apac/i;
const BATCH = 35;

let blocklist = new Set();
try {
  const raw = fs.readFileSync(BLOCKLIST_PATH, "utf-8");
  blocklist = new Set(JSON.parse(raw).map(s => s.toLowerCase().trim()));
  console.log(`📋 Blocklist loaded: ${blocklist.size} companies`);
} catch { console.log("⚠️  No blocklist found"); }

function generateSlugs() {
  const foodtech = [
    "toast","square","clover","lightspeed","touchbistro","revel",
    "olo","chowly","ordermark","itsacheckmate","deliverect",
    "bbot","ready","presto","bitepay","omnivore","qu",
    "thanx","paytronix","punchh","spendgo","fivestars",
    "talon-one","antavo","loyaltylion","smile-io","yotpo",
    "stamped","okendo","junip","trustpilot","bazaarvoice",
    "powerreviews","reputation","birdeye","podium","medallia",
    "qualtrics","momentive","surveymonkey","typeform","jotform",
    "paperform","tally","fillout","formbricks","heyflow",
    "involve-me","outgrow","calconic","convertcalculator",
  ];

  const hrtech = [
    "workday","bamboohr","namely","rippling","gusto","justworks",
    "trinet","adp","paychex","paylocity","paycom","ceridian",
    "ukg","personio","hibob","factorial","oyster","remote-com",
    "deel","velocity-global","papaya-global","globalization-partners",
    "omnipresent","lano","boundless-hq","pilot","letsdeel",
    "leapsome","lattice","15five","culture-amp","peakon",
    "officevibe","tinypulse","bonusly","worktango","kazoo",
    "fond","motivosity","awardco","kudos","nectar",
    "greenhouse","lever","ashby","workable","breezyhr",
    "jobvite","icims","smartrecruiters","jazz-hr","recruitee",
    "teamtailor","personio","comeet","pinpoint","gem",
    "beamery","eightfold","phenom","seekout","hiretual",
    "paradox","olivia","mya","xor-ai","humanly",
  ];

  const martech = [
    "hubspot","salesforce","marketo","pardot","eloqua",
    "activecampaign","drip","klaviyo","omnisend","sendlane",
    "postscript","attentive","yotpo-sms","recart","octane-ai",
    "gorgias","re-amaze","richpanel","gladly","dixa",
    "trengo","freshchat","crisp","intercom","drift",
    "qualified","chili-piper","calendly","savvycal","reclaim",
    "clockwise","motion","akiflow","sunsama","amie",
    "cal-dot-com","appointlet","acuityscheduling","setmore","simplybook",
    "zapier","make","n8n","tray-io","workato",
    "pipedream","activepieces","alloy","paragon","merge",
    "hotglue","vessel","rutter","finch","knit",
    "nango","supaglue","polytomic","census","hightouch",
    "rudderstack","segment","mparticle","tealium","lytics",
  ];

  const proptech = [
    "zillow","redfin","compass","opendoor","offerpad",
    "knock","homelight","flyhomes","orchard","ribbon",
    "qualia","snapdocs","notarize","proof","onenotary",
    "blend","better","loan-depot","rocket","uwm",
    "divvy","arrived","fundrise","roofstock","cadre",
    "lessen","latchel","propertymeld","happyco","inspectify",
    "buildium","appfolio","rentvine","tenantcloud","avail",
    "apartments-com","zumper","turbotenant","doorloop","innago",
    "showmojo","tenant-turner","rently","lock-box","codebox",
    "procore","plangrid","autodesk","bluebeam","fieldwire",
    "buildertrend","coconstruct","jobber","housecall-pro","thumbtack",
  ];

  const fintech_r2 = [
    "plaid","mx","finicity","akoya","yodlee",
    "marqeta","lithic","highnote","apto","unit",
    "treasury-prime","synapse","column","lead-bank","evolve",
    "increase","moov","dwolla","currencycloud","wise",
    "nium","airwallex","payoneer","tipalti","bill",
    "ramp","brex","divvy","center","navan",
    "expensify","emburse","certify","abacus","fyle",
    "stampli","medius","tipalti","coupa","procurify",
    "zip-co","tonkean","tropic","vertice","vendr",
    "productiv","zylo","torii","blissfully","intello",
    "beamy","stacklet","vantage","kubecost","spot",
  ];

  const govtech_agtech = [
    "palantir","anduril","shield-ai","joby","skydio",
    "vannevar","rebellion-defense","primer-ai","babel-street","voyager",
    "govini","dcode","oddball","agora","nava",
    "adhoc","civic-actions","skylight","bloom-works","truss",
    "indigo-ag","farmers-business-network","arable","climate-corp","granular",
    "bushel","conservis","agriwebb","farmlogs","cropin",
    "agworld","taranis","prospera","phytech","ceres-imaging",
    "carbon-robotics","farmwise","verdant","iron-ox","plenty",
    "bowery","gotham-greens","brightfarms","revol-greens","aerofarms",
    "appharvest","infarm","freight-farms","lettuce-grow","gardyn",
  ];

  const all = [...new Set([
    ...foodtech, ...hrtech, ...martech, ...proptech,
    ...fintech_r2, ...govtech_agtech,
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
  try { const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`); if(!r.ok) return []; const d = await r.json(); return (d.jobs||[]).map(j=>({company:slug,title:j.title,location:j.location?.name||"",url:j.absolute_url,ats:"greenhouse"})); } catch { return []; }
}
async function scrapeAshbySlug(slug) {
  try { const r = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`); if(!r.ok) return []; const d = await r.json(); return (d.jobs||[]).map(j=>({company:slug,title:j.title,location:j.location||j.locationName||"",url:`https://jobs.ashbyhq.com/${slug}/${j.id}`,ats:"ashby"})); } catch { return []; }
}
async function scrapeLeverSlug(slug) {
  try { const r = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`); if(!r.ok) return []; const d = await r.json(); if(!Array.isArray(d)) return []; return d.map(j=>({company:slug,title:j.text,location:j.categories?.location||"",url:j.hostedUrl||j.applyUrl||"",ats:"lever"})); } catch { return []; }
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
  console.log("🌊 Wave 31 — Vertical SaaS + Niche Industry Tech");
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

  let filtered = allJobs.filter(j => { if(!j.url) return false; if(roleScore(j.title)<1) return false; if(["greenhouse","ashby","lever"].includes(j.atsType)) return true; return REMOTE_RE.test(j.location); });
  const seen = new Set(); filtered = filtered.filter(j => { const k = j.url.replace(/\?.*/,"").toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; });
  const byCompany = new Map(); for(const j of filtered){const k=j.company.toLowerCase().replace(/[^a-z0-9]/g,""); const p=byCompany.get(k); if(!p||roleScore(j.title)>roleScore(p.title)) byCompany.set(k,j);}
  const fresh = [...byCompany.values()].filter(j => { const n=j.company.toLowerCase().replace(/[^a-z0-9]/g,""); return !blocklist.has(n)&&!blocklist.has(j.company.toLowerCase()); });
  const atsPriority = {ashby:0,greenhouse:1,lever:2}; fresh.sort((a,b)=>{const pa=atsPriority[a.ats]??3,pb=atsPriority[b.ats]??3; return pa!==pb?pa-pb:roleScore(b.title)-roleScore(a.title);});

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(fresh, null, 2));
  console.log(`\n✅ Wave 31 complete: ${fresh.length} new companies → ${OUTPUT_PATH}`);
  console.log(`   ATS breakdown: ${fresh.filter(j=>j.atsType==="ashby").length} Ashby, ${fresh.filter(j=>j.atsType==="greenhouse").length} GH, ${fresh.filter(j=>j.atsType==="lever").length} Lever, ${fresh.filter(j=>j.atsType==="other"||!["ashby","greenhouse","lever"].includes(j.atsType)).length} boards`);
}

main().catch(console.error);
