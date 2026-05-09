#!/usr/bin/env node
/**
 * Wave 34 Scraper — Security/Identity + DevInfra + API-first + Collaboration + AI/ML Infra
 *
 * Strategy: Cybersecurity/identity platforms, developer infrastructure/tooling,
 * API-first companies, collaboration/productivity tools, and AI/ML infra.
 */

import fs from "fs";

const BLOCKLIST_PATH = "/tmp/applied-companies.json";
const OUTPUT_PATH = "/tmp/wave34-jobs.json";
const REMOTE_RE = /remote|anywhere|latam|latin|americas|global|worldwide|distributed|wfh|work from home|emea|apac/i;
const BATCH = 35;

let blocklist = new Set();
try {
  const raw = fs.readFileSync(BLOCKLIST_PATH, "utf-8");
  blocklist = new Set(JSON.parse(raw).map(s => s.toLowerCase().trim()));
  console.log(`📋 Blocklist loaded: ${blocklist.size} companies`);
} catch { console.log("⚠️  No blocklist found"); }

function generateSlugs() {
  const security_identity = [
    "crowdstrike","sentinelone","palo-alto-networks","fortinet","zscaler",
    "cloudflare","wiz","orca-security","lacework","sysdig",
    "aqua-security","snyk","veracode","checkmarx","sonatype",
    "jfrog","black-duck","synopsys","tenable","qualys",
    "rapid7","arctic-wolf","huntress","blumira","todyl",
    "expel","red-canary","adlumin","deepwatch","secureworks",
    "mandiant","recorded-future","flashpoint","intel471","greynoise",
    "shodan","censys","spiderfoot","maltego","virustotal",
    "okta","auth0","onelogin","ping-identity","forgerock",
    "sailpoint","saviynt","cerby","opal-dev","indent",
    "stytch","clerk","descope","frontegg","propelauth",
    "userfront","passage","hanko","ory","keycloak-hq",
    "supertokens","magic-link","privy","dynamic-xyz","web3auth",
    "fireblocks","chainalysis","elliptic","trm-labs","merkle-science",
    "bitgo","anchorage","copper-co","hex-trust","cobo",
  ];

  const devinfra = [
    "docker","containerd","podman","buildkite","circleci",
    "github","gitlab","bitbucket","gitea","forgejo",
    "argo","fluxcd","spinnaker","harness","codefresh",
    "env0","spacelift","pulumi","terraform","crossplane",
    "terragrunt","atlantis","scalr","digger","infracost",
    "port-hq","cortex-io","backstage","opslevel","rely-io",
    "getdx","sleuth","faros-ai","linearb","swarmia",
    "jellyfish","pluralsight-flow","waydev","keypup","athenian",
    "mergify","kodiak","aviator","graphite-dev","gitbutler",
    "fig","warp","iterm","kitty-term","alacritty",
    "hyper-term","tabby-ai","coderabbit","bito","sweep-ai",
    "grit-io","adrenaline","codegen","continue-dev","devon-ai",
    "devin-ai","factory-ai","magic-dev","poolside","augment-code",
    "replit","stackblitz","codesandbox","gitpod","codeanywhere",
    "idx","daytona","devpod","coder","tilt",
    "skaffold","garden-io","telepresence","bridge-to-k8s","okteto",
  ];

  const api_first = [
    "stripe","plaid","unit","treasury-prime","synapse-fi",
    "bond","column","increase","moov","sardine",
    "alloy","persona","socure","onfido","jumio",
    "sumsub","veriff","regula","idnow","shufti",
    "twilio","vonage","bandwidth","telnyx","sinch",
    "messagebird","infobip","plivo","nexmo","clicksend",
    "sendgrid","mailgun","postmark","sparkpost","mailchimp-transactional",
    "resend","loops","customer-io","courier","knock",
    "novu","magicbell","engagespot","notificationapi","pushwoosh",
    "onesignal","airship","braze","iterable","leanplum",
    "appcues","chameleon","userflow","userpilot","pendo-io",
    "whatfix","apty","walkme","spekit","tango-us",
    "scribe-how","loom-hq","guidde","descript","tella",
    "mmhmm","pitch","gamma-app","beautiful-ai","tome",
    "canva","figma","framer","webflow","bubble",
    "retool","superblocks","appsmith","tooljet","budibase",
  ];

  const collab_productivity = [
    "notion","coda","clickup","monday","asana",
    "todoist","any-do","tick-tick","things","omnifocus",
    "obsidian","logseq","roam","mem","reflect",
    "tana","heptabase","capacities","anytype","affine",
    "miro","figjam","whimsical","lucid","excalidraw",
    "tldraw","eraser","creately","mural","conceptboard",
    "loom","grain","otter","fireflies","read-ai",
    "krisp","notta","airgram","avoma","chorus-ai",
    "gong","clari","people-ai","outreach","salesloft",
    "groove","mixmax","yesware","reply-io","lemlist",
    "instantly","smartlead","woodpecker","apollo-sales","hunter",
    "snov-io","dropcontact","enricher","clearout","debounce",
    "neverbounce","zerobounce","kickbox","emailable","mailfloss",
    "superhuman","hey-com","shortwave","spark","newton-mail",
    "front","missive","hiver","helpwise","dragapp",
  ];

  const ai_ml_infra = [
    "huggingface","weights-biases","comet-ml","neptune-ai","mlflow",
    "databricks-ml","sagemaker","vertex-ai","azure-ml","anyscale",
    "modal","banana-dev","replicate","baseten","beam-cloud",
    "runpod","vast-ai","lambda-cloud","coreweave","together-ai",
    "fireworks-ai","groq","cerebras","sambanova","graphcore",
    "habana","mythic","lightmatter","luminous","tenstorrent",
    "pinecone","weaviate","qdrant","milvus","chroma",
    "marqo","vectara","zilliz","vespa","elasticsearch-hq",
    "algolia","typesense","meilisearch","trieve","mendable",
    "langchain","llamaindex","haystack","semantic-kernel","dustt",
    "fixie","humanloop","promptlayer","helicone","braintrust",
    "athina-ai","galileo-ai","whylabs","arize","fiddler",
    "aporia","superwise","gantry","truera","arthur-ai",
    "robust-intelligence","calypso","hiddenlayer","protectai","lasso-security",
    "lakera","rebuff","promptarmor","nemo-guardrails","guardrails-ai",
  ];

  const all = [...new Set([
    ...security_identity, ...devinfra, ...api_first, ...collab_productivity, ...ai_ml_infra
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
  console.log("🌊 Wave 34 — Security/Identity + DevInfra + API-first + Collab + AI/ML Infra");
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
  console.log(`\n✅ Wave 34 complete: ${fresh.length} new companies → ${OUTPUT_PATH}`);
  console.log(`   ATS breakdown: ${fresh.filter(j=>j.atsType==="ashby").length} Ashby, ${fresh.filter(j=>j.atsType==="greenhouse").length} GH, ${fresh.filter(j=>j.atsType==="lever").length} Lever, ${fresh.filter(j=>!["ashby","greenhouse","lever"].includes(j.atsType)).length} boards`);
}

main().catch(console.error);
