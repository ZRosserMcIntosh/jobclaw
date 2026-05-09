/**
 * scrape-wave26.mjs — WAVE 26: Industry-specific company names
 *
 * Strategy: Target companies by industry vertical names that commonly
 * have ATS boards - cybersecurity, edtech, proptech, legaltech, etc.
 * Plus extract company names from tech blog "best of" lists.
 */

import { writeFileSync, readFileSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave26-jobs.json';
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
    if (!byCompany[key] || score > roleScore(byCompany[key].role)) byCompany[key] = j;
  }
  return Object.values(byCompany).filter(j => roleScore(j.role) >= 1);
}

function guessCompany(s) { return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

// ============================================================
// SLUG GENERATION
// ============================================================

const SLUGS = new Set();

// Cybersecurity companies
const CYBER = [
  'abnormal-security','aqua-security','armor','armis','attivo','axonius',
  'balbix','bishop-fox','blackpoint','blue-hexagon','bugcrowd','carbonblack',
  'cert','certipath','chainguard','cisco-security','cloudpassage','cobalt',
  'code42','cofense','corsha','crowdsec','cyberark','cybereason','cycode',
  'cylance','cynet','darktrace','deep-instinct','demisto','dragos','eclypsium',
  'edgescan','elastic-security','endor','enso','exabeam','expel','extrahop',
  'falcon','fidelis','flashpoint','forcepoint','forta','fortinet','foxguard',
  'gitguardian','guardicore','grip-security','hackerone','halcyon','hoxhunt',
  'huntr','illumio','immersive-labs','immuniweb','imprivata','inky','intezer',
  'island','jupiterone','keyfactor','knowbe4','kolide','lacework','last-line',
  'logrhythm','malwarebytes','mandiant','material-security','mend','mimecast',
  'monit','netskope','nightfall','noname','nozomi','obsidian-security','okta',
  'orca-security','oxide','palo-alto','panther','pentera','phylum','piiano',
  'probely','proofpoint','rapid7','recorded-future','red-canary','remedy',
  'risk-recon','salt-security','securiti','securonix','sentinelone','sevco',
  'silverfort','snyk','socradar','sonatype','sophos','stackhawk','stairwell',
  'strata','sumo-logic','swimlane','synack','tanium','tenable','tessian',
  'threatlocker','tines','torq','transmit-security','trellix','trend-micro',
  'truffle','trustwave','uptycs','vanta','varonis','vault-speed','vectra',
  'veracode','veriato','wiz','zscaler',
];

// EdTech companies
const EDTECH = [
  'articulate','blackboard','brainly','brilliant','byju','canvas','cengage',
  'chegg','classera','classdojo','clever','codepath','codesmith','codio',
  'coursera','degreed','docebo','dreambox','edcast','edmodo','edx','elucidat',
  'engageli','examsoft','flatiron','formative','galvanize','genially','guild',
  'houghton','immersive','instructure','itslearning','juniper','kahoot',
  'knewton','kognity','labster','lambda','leanix','linkedin-learning',
  'litmos','mastery','mcgraw','moodle','nearpod','newsela','niche','outschool',
  'pear-deck','pluralsight','quizlet','replit','schoology','scribble','seesaw',
  'simplify','skillshare','skillsoft','socratic','springboard','squirrel',
  'teachable','thinkful','thinkific','tophat','turnitin','udacity','udemy',
  'unacademy','upgrad','varsity','veritas','wyzant',
];

// PropTech / Real Estate Tech
const PROPTECH = [
  'airbnb','apartments','appfolio','avail','bowery','building-engines','cadre',
  'cherre','costar','coverhound','domio','doorloop','dotloop','easyknock',
  'elise-ai','entrata','flyhomes','funnel','guesty','hometap','homeward',
  'juniper-square','knock','landis','lessen','loft','matterport','maxwell',
  'mynd','offerpad','opendoor','orchard','pacaso','parkwhiz','propy','qualia',
  'realogy','redfin','rent','reonomy','rhino','ribbon','roofstock','skyline',
  'smartrent','sundae','tenant','tenant-cloud','tripshot','trulia','turbotenant',
  'yardi','zillow','zumper',
];

// LegalTech
const LEGALTECH = [
  'avvo','birddoc','casetext','clio','contract-works','disco','docusign',
  'evisort','everlaw','gavelytics','icertis','ironclad','juro','kira',
  'lawtrades','legalist','lexion','lexmachina','litera','litify','loom-analytics',
  'luminance','notarize','openlaw','pacermonitor','relativity','rocket-lawyer',
  'spotdraft','surety','surepoint','termageddon','themis','tracers','vera',
];

// HealthTech
const HEALTHTECH = [
  'accolade','agilethought','akeso','amwell','astra','athenahealth','august',
  'bezos-earth','bright-health','buoy','carbon-health','care-port','cerebral',
  'cityblock','clover-health','color','collective-health','conversa','cureatr',
  'devoted','docplanner','doctor-on-demand','eden','elation','flatiron-health',
  'genome','ginger','goodrx','halo','healthjoy','hims','hint-health','hometeam',
  'included-health','insitro','iora','kinsa','lemonaid','livongo','lyra',
  'maestro','maven-clinic','medidata','memora','modern-health','natera',
  'nference','noom','olive','omada','one-medical','open-loop','osmind',
  'outset','parsley','patientpop','peers','phreesia','quartet','rally-health',
  'ria-health','ro','scipher','simplepractice','sprinter','sword-health',
  'talkiatry','teladoc','tempus','thirty-madison','transcarent','truepill',
  'tufin','veracyte','virta','viz','wellth','wheel','zocdoc',
];

// FinTech
const FINTECH = [
  'affirm','afterpay','alchemy-pay','alpaca','banking-circle','betterment',
  'blend','boku','brex','carta','cash-app','chime','circle','clearco',
  'column','cross-river','current','dave','digits','divvy','dlocal','drivewealth',
  'earn-in','even','finch','fis','flywire','fold','gem','gpay','greenlight',
  'jeeves','jiko','just-works','kabbage','klarna','landing','lending-club',
  'lithic','marqeta','melio','mercury','modern-treasury','moov','mpower',
  'n26','nova-credit','nuvei','orum','payoneer','paysafe','pine-labs',
  'plaid','privacy','ramp','razorpay','recurly','remitly','routable',
  'runway-financial','slope','sodapay','sofi','square','stax','stripe',
  'tabapay','tally','tipalti','toast','treasury-prime','unit','upgrade',
  'varo','venmo','wealthfront','wise','zeta-global',
];

// Climate / GreenTech
const CLIMATE = [
  'ampion','arcadia','aurora-solar','chargie','cleanchoice','clearloop',
  'climateai','cloverly','crusoe','dandelion','electric-hydrogen','en-core',
  'engie','enphase','form-energy','frontier','greenely','gridium','heliogen',
  'hyliion','kairos','leap','levelten','lilac','lucid-motors','lyten',
  'magnitude','momentus','mynt','natel','ncx','nori','octopus-energy',
  'omnidian','one-concern','pachama','pear-energy','perch','planetary',
  'queen-of-raw','recurve','redaptive','rewilder','sealed','sense',
  'sila','sitetracker','source','span','station-a','stem','terra-alpha',
  'tomorrow','trellis','turntide','upstream','urbint','verdant','watt-time',
  'wren','yotta','zeitview','zenobe',
];

for (const list of [CYBER, EDTECH, PROPTECH, LEGALTECH, HEALTHTECH, FINTECH, CLIMATE]) {
  for (const s of list) SLUGS.add(s);
}

// Also try without hyphens
const extras = [];
for (const s of SLUGS) {
  if (s.includes('-')) extras.push(s.replace(/-/g, ''));
}
for (const e of extras) SLUGS.add(e);

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
  const tags = ['react','typescript','node','fullstack','python','javascript','frontend','backend','golang','rust','java','aws','docker','kubernetes','ai','llm','devops','cloud','mobile','web','security','fintech','saas','remote','machine-learning','data-engineering','ios','android','ruby','rails','vue','angular','nextjs','graphql','terraform','cybersecurity','edtech','healthtech','proptech','legaltech','climate','greentech'];
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
  } catch {}
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
  console.log('🔍 WAVE 26 — Industry Vertical Company Names\n');
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
