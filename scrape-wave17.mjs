/**
 * scrape-wave17.mjs — WAVE 17: VC Portfolio + Industry verticals + Verbs + Colors
 *
 * Strategy:
 * 1. Famous VC portfolio company names (YC, a16z, Sequoia etc. known startups)
 * 2. Industry vertical words (fintech, healthtech, edtech, etc.)
 * 3. Action verb companies ("snap", "zoom", "drift", "gong", "bolt")
 * 4. Color + object combos ("blueshift", "redpanda", "greenlane")
 * 5. Double-letter words ("buzzy", "fizzy", "fuzzy", "zippy")
 * 6. Compound tech words ("cloudflare"-style)
 */

import { writeFileSync, readFileSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave17-jobs.json';
const TIMEOUT = 5000;

const loadBlocklist = () => {
  try {
    return new Set(JSON.parse(readFileSync(BLOCKLIST_PATH, 'utf8')).map(c => c.toLowerCase().trim()));
  } catch { return new Set(); }
};
const BLOCKLIST = loadBlocklist();
console.log(`🚫 Blocking ${BLOCKLIST.size} companies\n`);

async function fetchJSON(url, ms = TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(timer);
    return r.ok ? r.json() : null;
  } catch { clearTimeout(timer); return null; }
}

async function fetchText(url, ms = TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(timer);
    return r.ok ? r.text() : null;
  } catch { clearTimeout(timer); return null; }
}

const STRONG = /full.?stack|frontend|front.?end|react|next\.?js|typescript|node|javascript|web.?dev|software.?engineer|swe\b/i;
const GOOD = /engineer|developer|architect|platform|backend|python|golang|rust|mobile|ios|swift/i;
const WEAK = /devops|sre|data.?engineer|ml.?engineer|infra/i;
const SKIP_ROLES = /intern\b|new.?grad|junior|entry.?level|director|vp\b|chief|head of|recruiter|sales|marketing|account.?exec|customer.?success|legal|finance|accounting|hr\b|people.?ops/i;

function roleScore(title) {
  if (SKIP_ROLES.test(title)) return -1;
  if (STRONG.test(title)) return 3;
  if (GOOD.test(title)) return 2;
  if (WEAK.test(title)) return 1;
  return 0;
}

const REMOTE_KW = /remote|anywhere|latam|americas|global|worldwide|brazil|são paulo|distributed|work from home|wfh|emea|apac/i;
function isRemote(loc) { return !loc || loc === '' || REMOTE_KW.test(loc); }

function pickBestPerCompany(jobs) {
  const byCompany = {};
  for (const j of jobs) {
    const key = j.company.toLowerCase().trim();
    if (BLOCKLIST.has(key)) continue;
    const score = roleScore(j.role);
    if (score < 0) continue;
    if (!byCompany[key] || score > roleScore(byCompany[key].role)) {
      byCompany[key] = j;
    }
  }
  return Object.values(byCompany).filter(j => roleScore(j.role) >= 1);
}

function guessCompany(s) { return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

// ============================================================
// SLUG GENERATION
// ============================================================

const SLUGS = new Set();

// 1. Known VC-backed startups / well-known tech companies (names that are actual ATS slugs)
const VC_COMPANIES = [
  'airbase','airtable','algolia','alloy','amplitude','anduril','appcues','appsmith',
  'armory','assembled','astronomer','auth0','autopilot','avoma','axonius',
  'beamery','benchling','bigpanda','bitwarden','bluecore','bonsai','brainly',
  'bridgecrew','brightly','builtin','bumble','cabal','calendly','canva',
  'capable','carrot','census','chainalysis','chainlink','checkr','circle',
  'clearbit','clerk','clockwise','close','cockroach','coda','cohere','coinbase',
  'collibra','column','conducto','contentful','convex','copado','coupa',
  'cribl','crossbeam','crusoe','cultura','customerio','dagster','databricks',
  'dbt','deepgram','deel','degreed','deliverect','demandbase','descript',
  'dialpad','discord','dock','docusign','doppler','dovetail','drata',
  'dropbox','elastic','envoy','eppo','ethena','everlaw','exabeam',
  'exist','expensify','factorial','faire','fanatics','fastly','featurespace',
  'figma','firebolt','firefly','fivetran','flatfile','flexport','flourish',
  'formstack','foundit','freshworks','frontegg','fullstory','garner',
  'gather','glia','glide','grafana','grain','gremlin','gusto',
  'harbor','harness','hasura','heap','helpshift','hightouch','honeycomb',
  'hotjar','hubspot','humane','hyperscience','immuta','incident',
  'inngest','instill','intercom','iri','ironclad','iterable','jellyfish',
  'juniper','justworks','kandji','keeper','kindred','kinetic','klarna',
  'knock','kustomer','lacework','lasso','lattice','launchdarkly','lawnstarter',
  'leandata','lightdash','linear','lithic','lob','localytics','loom',
  'lucid','luminary','lyft','mable','magic','mapbox','marqeta',
  'mattermost','maxio','maze','melio','membrane','mercury','metabase',
  'metronome','miro','mixpanel','modal','modern','momentive','monograph',
  'motive','multiply','mux','narrativ','netlify','newfront','nightfall',
  'noom','notion','nova','nylas','observe','octopus','okta',
  'oneflow','oneleet','onfido','opendoor','opensea','orca','orchard',
  'outreach','ownbackup','pachyderm','palantir','panther','paradox',
  'pave','peerstreet','persona','pilot','pipe','plaid','plausible',
  'podium','postman','prefect','primer','procore','productboard','pulley',
  'puppet','qonto','qualtrics','ramp','readme','rebrandly','recurly',
  'redpanda','relay','remote','replicated','retool','retrace','revenue',
  'ripple','rippling','riskalyze','roadie','robust','rocket','rootly',
  'runway','safebase','sailpoint','samsara','sanity','sardine','sauce',
  'scaleai','scalr','segment','semgrep','sendbird','sentry','sequin',
  'shelterluv','shopify','sigma','sift','signifyd','singular','sitting',
  'slab','smartcar','smartling','smartsheet','snorkel','snowflake',
  'sonar','sourcegraph','span','spatial','spiff','spot','sprout',
  'square','stackblitz','starburst','stardog','stedi','stitch','strapi',
  'stripe','strongdm','supabase','superblocks','surfboard','swiftly',
  'syndio','tacit','talon','tandem','taskade','temporal','tenable',
  'terminal','terraform','thenewstack','thoughtspot','tiger','timber',
  'toast','today','together','toptal','torq','transpose','treasure',
  'trello','tricentis','trove','trueaccord','truework','trustpilot',
  'turbot','twilio','typeform','uipath','upbound','vanta','vault',
  'vercel','verkada','vero','vidyard','virtue','voiceflow','wandb',
  'webflow','weights','welocalize','wiz','workato','workiva','workos',
  'xata','yotpo','zapier','zendesk','zeplin','zeta','zoho',
];

// 2. Verb-based company names (action words)
const VERBS = [
  'absorb','achieve','activate','adapt','adjust','advance','affirm',
  'align','amplify','anchor','apply','arise','ascend','aspire','assert',
  'attend','attract','awaken','balance','blend','bloom','bolster','boost',
  'bounce','branch','brave','break','bridge','brighten','broaden','build',
  'bundle','calibrate','capture','carve','catalyze','center','champion',
  'change','charge','chart','chase','clarify','climb','close','coast',
  'collaborate','collect','combine','command','commit','communicate','compare',
  'compile','compose','conceive','condense','configure','connect','conquer',
  'conserve','consolidate','construct','contain','convert','convince','craft',
  'create','cross','cultivate','curate','dash','decide','declare','decode',
  'define','deliver','deploy','derive','design','detect','develop','devise',
  'direct','discover','dispatch','display','disrupt','dissolve','distinguish',
  'distribute','diverge','divide','document','dominate','draft','draw',
  'drift','drive','earn','ease','educate','effect','elaborate','elevate',
  'embrace','emerge','emit','empower','enable','encode','engage','enhance',
  'enlighten','enrich','ensure','envision','equip','establish','evaluate',
  'evolve','examine','exceed','exchange','excite','execute','exhibit',
  'expand','expedite','explore','express','extend','extract','fabricate',
  'facilitate','fashion','finalize','flourish','focus','forecast','forge',
  'formulate','fortify','foster','frame','fulfill','fuse','gather','gauge',
  'generate','govern','grasp','grow','guard','guide','halt','handle',
  'harness','harvest','hasten','honor','host','hunt','hustle','ignite',
  'illuminate','illustrate','imagine','immerse','impact','implement',
  'impress','improve','incite','include','increase','influence','inform',
  'initiate','innovate','inquire','inspire','install','integrate','intend',
  'interact','interpret','introduce','invent','invest','iterate','join',
  'journey','jump','kindle','launch','lead','learn','leverage','lift',
  'link','locate','magnify','maintain','manage','manifest','master',
  'maximize','measure','mediate','mentor','merge','mobilize','model',
  'modify','monitor','motivate','multiply','navigate','nurture','observe',
  'obtain','occupy','offer','open','operate','optimize','orchestrate',
  'organize','originate','outline','overcome','partner','perceive','perform',
  'permit','persist','pilot','pioneer','plan','pledge','populate',
  'position','possess','pour','practice','predict','prepare','preserve',
  'prevail','prioritize','process','produce','program','progress','project',
  'promote','propel','prospect','protect','provide','pursue','qualify',
  'quest','radiate','rally','reach','realize','reclaim','recognize',
  'recommend','reconcile','recover','recruit','redesign','reduce','refine',
  'reform','refresh','reinforce','reinvent','relate','release','rely',
  'remodel','render','renew','repair','replace','report','represent',
  'reproduce','request','research','reshape','resolve','respect','respond',
  'restore','retain','retrieve','reveal','reverse','revise','revive',
  'revolutionize','reward','ripen','rise','satisfy','scale','scan',
  'schedule','sculpt','secure','seek','select','serve','shape','sharpen',
  'shelter','shift','shine','signal','simplify','simulate','snap','solve',
  'soar','spark','specialize','specify','sponsor','stabilize','stage',
  'standardize','steer','stimulate','strategize','stream','strengthen',
  'strive','structure','study','succeed','summarize','supply','support',
  'surpass','sustain','sync','synthesize','tackle','tailor','target',
  'teach','thrive','trace','track','trade','train','transcend','transform',
  'translate','transmit','transport','traverse','trigger','triumph','trust',
  'turbo','uncover','unify','unite','unlock','unveil','update','upgrade',
  'uplift','validate','value','venture','verify','view','visualize',
  'vitalize','voice','wield','wonder','yield',
];

// 3. Color + object combos
const COLORS = ['red','blue','green','black','white','silver','gold','amber','purple','orange','grey','pink','teal','indigo','coral','crimson','scarlet','ivory','sage','violet','copper','bronze'];
const OBJECTS = ['shift','panda','lane','fin','gate','bird','rock','light','vine','beam','leaf','point','stone','grid','wave','field','cell','core','base','peak','ridge','smith','forge','works','labs','box','lock','dock','port','link'];

for (const c of COLORS) {
  for (const o of OBJECTS.slice(0, 12)) {
    SLUGS.add(c + o);
    SLUGS.add(c + '-' + o);
  }
}

// 4. Short adjective + noun tech combos
const ADJ = ['bright','clear','deep','fast','flat','fresh','full','grand','great','hard','high','keen','lean','live','long','loud','main','near','neat','new','next','open','peak','prime','pure','quick','rare','raw','real','rich','safe','sharp','short','slim','smart','smooth','snap','soft','solid','strong','sure','swift','tall','thin','tight','top','true','vast','warm','wide','wild'];
const NOUNS = ['api','arc','arc','bit','byte','cast','code','coin','cue','dev','dot','end','eye','fit','fox','gen','gig','hex','hue','ink','ion','jam','jet','job','joy','kin','kit','lag','map','mix','net','oak','orb','owl','pax','pod','rig','rip','row','rub','run','set','sky','sol','sum','sun','tap','tip','top','try','use','van','vet','vim','vow','wax','win','wit','yak','zen','zip'];

for (const a of ADJ.slice(0, 25)) {
  for (const n of NOUNS.slice(0, 20)) {
    SLUGS.add(a + n);
  }
}

// 5. All VC company names as slugs
for (const company of VC_COMPANIES) {
  SLUGS.add(company);
}

// 6. All short verbs (<=6 chars) as slugs - many tech companies are single verbs
for (const verb of VERBS) {
  if (verb.length <= 7) SLUGS.add(verb);
}

// 7. industry vertical terms
const VERTICALS = [
  'fintech','healthtech','edtech','martech','proptech','insurtech','agritech',
  'cleantech','biotech','medtech','govtech','legaltech','regtech','hrtech',
  'adtech','foodtech','retailtech','traveltech','logtech','spacetech',
  'constructech','wealthtech','cybersec','devsec','opsec','netsec',
  'aiops','mlops','devtools','dataops','gitops','cloudops','secops',
  'fullstack','backend','frontend','blockchain','defi','web3','metaverse',
  'saas','paas','iaas','baas','faas','dbaas','caas','xaas',
];
for (const v of VERTICALS) SLUGS.add(v);

const slugArray = [...SLUGS];
console.log(`Generated ${slugArray.length} candidate slugs\n`);

// ============================================================
// ATS SCRAPING + APIs
// ============================================================

async function scrapeAshby(slugs) {
  const jobs = []; let valid = 0;
  for (let i = 0; i < slugs.length; i += 40) {
    const batch = slugs.slice(i, i + 40);
    const results = await Promise.allSettled(batch.map(async (slug) => {
      const d = await fetchJSON(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
      if (!d?.jobs?.length) return [];
      valid++;
      return d.jobs.map(j => ({ company: d.jobBoard?.organizationName || guessCompany(slug), role: j.title, url: `https://jobs.ashbyhq.com/${slug}/${j.id}`, atsType: 'ashby', location: j.location || 'Remote' }));
    }));
    for (const r of results) if (r.status === 'fulfilled') jobs.push(...r.value);
    process.stdout.write(`\r  Ashby: ${Math.min(i+40, slugs.length)}/${slugs.length} (${valid} valid)`);
  }
  console.log(`\n  ✅ Ashby: ${valid} valid boards`);
  return jobs;
}

async function scrapeGreenhouse(slugs) {
  const jobs = []; let valid = 0;
  for (let i = 0; i < slugs.length; i += 40) {
    const batch = slugs.slice(i, i + 40);
    const results = await Promise.allSettled(batch.map(async (slug) => {
      const d = await fetchJSON(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`);
      if (!d?.jobs?.length) return [];
      valid++;
      return d.jobs.filter(j => isRemote(j.location?.name)).map(j => ({ company: guessCompany(slug), role: j.title, url: `https://job-boards.greenhouse.io/${slug}/jobs/${j.id}`, atsType: 'greenhouse', location: j.location?.name || 'Remote' }));
    }));
    for (const r of results) if (r.status === 'fulfilled') jobs.push(...r.value);
    process.stdout.write(`\r  GH: ${Math.min(i+40, slugs.length)}/${slugs.length} (${valid} valid)`);
  }
  console.log(`\n  ✅ GH: ${valid} valid boards`);
  return jobs;
}

async function scrapeLever(slugs) {
  const jobs = []; let valid = 0;
  for (let i = 0; i < slugs.length; i += 30) {
    const batch = slugs.slice(i, i + 30);
    const results = await Promise.allSettled(batch.map(async (slug) => {
      const d = await fetchJSON(`https://api.lever.co/v0/postings/${slug}?mode=json`);
      if (!Array.isArray(d) || !d.length) return [];
      valid++;
      return d.filter(j => isRemote(j.categories?.location)).map(j => ({ company: guessCompany(slug), role: j.text, url: j.hostedUrl || j.applyUrl, atsType: 'lever', location: j.categories?.location || 'Remote' }));
    }));
    for (const r of results) if (r.status === 'fulfilled') jobs.push(...r.value);
    process.stdout.write(`\r  Lever: ${Math.min(i+30, slugs.length)}/${slugs.length} (${valid} valid)`);
  }
  console.log(`\n  ✅ Lever: ${valid} valid boards`);
  return jobs;
}

async function scrapeJobApis() {
  const all = [];
  const tags = ['react','typescript','node','fullstack','python','javascript','frontend','backend','golang','rust','java','aws','docker','kubernetes','ai','llm','devops','cloud','mobile','web','security','blockchain','fintech','saas','remote'];
  const seen = new Set();
  for (const tag of tags) {
    const d = await fetchJSON(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${tag}`, 8000);
    if (!d?.jobs) continue;
    for (const j of d.jobs) { if (seen.has(j.id)) continue; seen.add(j.id); all.push({ company: j.companyName, role: j.jobTitle, url: j.url, atsType: 'custom', location: j.jobGeo || 'Remote' }); }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`  ✅ Jobicy: ${all.length} jobs`);
  try {
    const rok = await fetchJSON('https://remoteok.com/api', 15000);
    if (Array.isArray(rok)) { const jobs = rok.filter(j => j.position && j.company && j.url).map(j => ({ company: j.company, role: j.position, url: j.url.startsWith('http') ? j.url : `https://remoteok.com${j.url}`, atsType: 'custom', location: j.location || 'Remote' })); all.push(...jobs); console.log(`  ✅ RemoteOK: ${jobs.length} jobs`); }
  } catch { console.log('  ⚠️ RemoteOK: failed'); }
  const wwrCats = ['remote-programming-jobs','remote-full-stack-programming-jobs','remote-devops-sysadmin-jobs','remote-back-end-programming-jobs','remote-front-end-programming-jobs'];
  const wwrSeen = new Set(); let wwrCount = 0;
  for (const cat of wwrCats) {
    try {
      const html = await fetchText(`https://weworkremotely.com/categories/${cat}.rss`, 10000);
      if (!html) continue;
      const items = html.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1];
        const link = item.match(/<link>(.*?)<\/link>/)?.[1];
        if (!title || !link || wwrSeen.has(link)) continue; wwrSeen.add(link);
        const parts = title.split(':');
        all.push({ company: parts[0]?.trim() || 'Unknown', role: parts.slice(1).join(':').trim() || title, url: link, atsType: 'custom', location: 'Remote' }); wwrCount++;
      }
    } catch {}
  }
  console.log(`  ✅ WWR: ${wwrCount} jobs`);
  try {
    for (let page = 1; page <= 5; page++) {
      const d = await fetchJSON(`https://www.arbeitnow.com/api/job-board-api?page=${page}`, 10000);
      if (!d?.data?.length) break;
      all.push(...d.data.filter(j => j.remote === true).map(j => ({ company: j.company_name, role: j.title, url: j.url, atsType: 'custom', location: j.location || 'Remote' })));
    }
    console.log(`  ✅ Arbeitnow: scraped`);
  } catch {}
  // Himalayas
  try {
    const d = await fetchJSON('https://himalayas.app/jobs/api?limit=100', 10000);
    if (d?.jobs?.length) {
      all.push(...d.jobs.map(j => ({ company: j.companyName || 'Unknown', role: j.title, url: `https://himalayas.app/jobs/${j.slug}`, atsType: 'custom', location: j.location || 'Remote' })));
      console.log(`  ✅ Himalayas: ${d.jobs.length} jobs`);
    }
  } catch {}
  return all;
}

async function main() {
  console.log('🔍 WAVE 17 — VC Portfolio + Verbs + Colors + Industry verticals\n');
  console.log('📡 Phase 1: ATS Board Scraping...');
  const [ashbyJobs, ghJobs, leverJobs] = await Promise.all([scrapeAshby(slugArray), scrapeGreenhouse(slugArray), scrapeLever(slugArray)]);
  console.log('\n📡 Phase 2: Job Board APIs...');
  const apiJobs = await scrapeJobApis();
  const allJobs = [...ashbyJobs, ...ghJobs, ...leverJobs, ...apiJobs];
  console.log(`\n📊 RAW: ${allJobs.length} jobs`);
  const seenUrls = new Set();
  const byUrl = allJobs.filter(j => { if (!j.url || seenUrls.has(j.url)) return false; seenUrls.add(j.url); return true; });
  const onePerCo = pickBestPerCompany(byUrl);
  const atsOrder = { greenhouse: 0, ashby: 1, lever: 2, custom: 3 };
  onePerCo.sort((a, b) => { const ats = (atsOrder[a.atsType] || 9) - (atsOrder[b.atsType] || 9); if (ats !== 0) return ats; return roleScore(b.role) - roleScore(a.role); });
  const bySrc = {};
  onePerCo.forEach(j => { bySrc[j.atsType] = (bySrc[j.atsType] || 0) + 1; });
  console.log(`\n🎯 FINAL: ${onePerCo.length} unique NEW companies`);
  console.log(`   By ATS:`, bySrc);
  writeFileSync(OUTPUT_PATH, JSON.stringify(onePerCo, null, 2));
  console.log(`\n✅ Saved ${onePerCo.length} jobs to ${OUTPUT_PATH}`);
}

main().catch(console.error);
