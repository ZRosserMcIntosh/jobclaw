/**
 * scrape-wave14.mjs — WAVE 14: Abbreviations, numerics, creative patterns
 * 
 * Strategy:
 * 1. Three-letter abbreviation slugs (most companies have 3-letter abbreviations)
 * 2. Number-based company names (8x8, 1password, etc.)
 * 3. Creative misspellings/tech spelling patterns (lyft, deel, etc.)
 * 4. Dash + common word combos not yet tried
 * 5. Scrape GitHub awesome-remote-jobs for more companies
 */

import { writeFileSync, readFileSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave14-jobs.json';
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

// 1. Three-letter abbreviations (ALL valid 3-letter combos from common consonant-vowel patterns)
const VOWELS = 'aeio'.split('');
const CONSONANTS = 'bcdfghjklmnprstvwxyz'.split('');

// CVC patterns (like "box", "hub", "lab")
for (const c1 of CONSONANTS) {
  for (const v of VOWELS) {
    for (const c2 of CONSONANTS) {
      SLUGS.add(c1 + v + c2);
    }
  }
}

// VCC patterns (like "arc", "ant")  
for (const v of VOWELS) {
  for (const c1 of CONSONANTS) {
    for (const c2 of CONSONANTS) {
      SLUGS.add(v + c1 + c2);
    }
  }
}

// 2. Number-based company names
const NUMBER_COMBOS = [
  '1password','1010data','10x','10xgenomics','15five','1stdibs','2checkout',
  '2u','360dialog','360learning','3pillar','4basecare','42crunch','6river',
  '6sense','7shifts','8base','8x8','99designs','abstract',
  // Number prefixes
  ...[1,2,3,4,5,6,7,8,9,10,12,15,20,21,42,99,100,101,360].flatMap(n => 
    ['ai','cloud','data','dev','io','labs','tech','x','go','net','bit','sec'].map(w => `${n}${w}`)
  ),
  // Number suffixes
  ...['ai','cloud','data','dev','go','lab','net','one','ops','pay','shift','up','way','x'].flatMap(w =>
    [1,2,3,4,5,7,8,9,10,42,99].map(n => `${w}${n}`)
  ),
];
for (const slug of NUMBER_COMBOS) SLUGS.add(slug);

// 3. Creative misspellings / tech spelling patterns
const CREATIVE = [
  // Drop vowels (lyft-style)
  'bld','bldr','bndl','brkt','brwsr','byt','chkr','clnr','cmdr','cnfg',
  'cnsl','cntrl','cptn','crft','crlr','crsr','ctlr','cvr','dckr','dplyr',
  'drft','dvsr','dwn','fctry','fltr','fnctn','fndr','frnt','grd','grph',
  'hlpr','hndlr','hstr','krnl','lnkr','lnr','mngr','mntr','mstr','ntwrk',
  'pckr','plgn','prsr','qlty','qry','rcrd','rdcr','rndr','rslvr','rtr',
  'rvlvr','scnr','scrpt','sght','sgnl','slctr','sndr','splttr','srch',
  'stck','stm','strt','swtch','synr','tckr','tmpl','trnsfr','trggr','vldt',
  'wrpr','xtrctr',
  // Double letter patterns (att, dell-style)
  'accel','buzz','comm','connect','dell','digg','fizz','fuzz','glitch',
  'groove','happy','jazz','kizzy','lasso','mellow','muzzle','nutty',
  'pepper','pizza','puzzle','rally','ripple','sizzle','snappy','twitter',
  'vanilla','waffle','zigzag','zippo',
  // -fy / -ly / -ify / -ery patterns
  'amplify','appify','beautify','buildify','certify','clarify','cloudify',
  'codify','crucify','datify','densify','devify','docify','electrify',
  'fortify','gamify','identify','intensify','justify','magnify','modify',
  'notify','objectify','pacify','qualify','ratify','shopify','simplify',
  'specify','terrify','unify','verify','vivify',
  'angerly','broadly','cleverly','deeply','eagerly','freshly','gently',
  'happily','keenly','lively','merely','neatly','orderly','partly',
  'quickly','rarely','safely','thinly','vastly','weekly',
  // -er patterns
  'backer','blocker','booster','builder','caller','catcher','checker',
  'closer','coder','counter','crafter','dasher','docker','driver','finder',
  'flipper','forger','grabber','handler','helper','hunter','jumper',
  'keeper','kicker','launcher','lever','linker','loader','mapper','matcher',
  'minder','mover','opener','packer','parser','picker','plotter','pusher',
  'ranger','reader','reacher','render','rider','runner','scanner','seeker',
  'sender','server','setter','shader','shaker','shipper','shooter',
  'signer','singer','solver','sorter','speaker','splitter','stacker',
  'starter','stepper','stopper','striker','surfer','swimmer','switcher',
  'tracker','trader','trainer','trigger','turner','viewer','walker',
  'watcher','writer',
  // -able patterns
  'adaptable','buildable','callable','deployable','editable','fixable',
  'hackable','indexable','joinable','linkable','mergeable','notable',
  'parseable','queryable','readable','scalable','testable','useable',
  'viewable','workable',
];
for (const slug of CREATIVE) SLUGS.add(slug);

// 4. More real companies not yet tried
const MORE_COMPANIES = [
  'abnormal-security','accent','accessible','accurics','acorns','actian',
  'addi','adjoe','admix','aduro','aeva','affinity','affirm','agora',
  'aiden','airbnb','airtable','akili','aledade','algolux','alida',
  'allegion','alloy','aloft','altana','altitude','alviere','amagi',
  'ambience','amica','amplifier','anagram','analytica','ancient',
  'andela','android','angel-ai','angi-homeservices','angle','anima',
  'anomalyzer','ansarada','anthem','apart','aperture','apogee',
  'apparel','appetize','appfire','applicable','applovin','appno',
  'apptopia','aquifer','aragon','arcade','arcadian','archera',
  'arete','argon','arista','artistry','ascend','asimov','aspect',
  'aspiration','assembly-ai','asteria','astound','asure','athena',
  'attain','attentive-mobile','augment','aura-health','aurora',
  'auror','authena','autofi','autonomic','autoreive','avail',
  'avesta','aviso','aware','axle','azure','b12','babel',
  'backbase','backstitch','badger-maps','balena','bambee',
  'bandcamp','bandit','banner','basecamp','batch','beachbody',
  'beaker','beautycounter','bedrock','beetle','behalf','behance',
  'belong','benchmark','bentobox','bigeye','billion','bioatla',
  'biofourmis','birdie','bitsight','blackbird','blackrock',
  'blaze','blazer','blended','blinq','blitzy','bloomerang',
  'blueprint','bluestone','bodhi','bolt-energy','bonusly',
  'boomi','boomtown','border','borrowed','bracket','brazen',
  'breadcrumb','breakout','breaker','bridger','brikit','bringg',
  'bristow','broadridge','bronto','buffer','buildops','buku',
  'bulletproof','bundle','bunker','burner','bustle','butcher',
  'cabin','cadence','caffeinated','calamari','callrail','calmerry',
  'cambium','cameo','campaign','candor','canopy','canvas',
  'capital','capsela','carbon-health','cardinal','cargo','carousel',
  'cascade-ai','cashfree','catalyst','catena','cato','causaly',
  'causal','cecelia','celigo','cement','centauri','centro',
  'cerberus','cerebro','certn','champion','chapel','chargebee',
  'chartboost','charthop','chasma','chatmeter','chatterbox',
  'checkmate','chegg','cherre','chime','chipax','choozle',
  'chorus-ai','chrono','cinch','cipher-mining','circula','cirrus',
  'civic-eagle','clari','classify','clearco','clearcover',
  'clearfind','clever','clientsuccess','climateai','clio','clocktower',
  'closedloop','clover','clutch','coalesce','cobblestone','cocoon',
  'codecademy','codeclimate','codeship','cognito','cognitev',
  'cointracker','collaborate','collateral','colony','colorcon',
  'column','combyne','command-ai','commit','commonspirit',
  'commure','companyiq','compas','complyadvantage','composable',
  'concept','concord','condition','conduit','confetti','config',
  'configo','conjure','connectly','conquer','consensus','console',
  'construct','contacto','contenda','contentsquare','contexte',
  'continuum','contour','contract','contrast-ai','conversion',
  'conveyor','cookpad','copper-io','coral-ai','corelight','cority',
  'corner','cornershop','corridor','cortex','cosmo','cosmos-io',
  'coterie','counter-ai','courtyard','covenant','coverage','cozy',
  'crafted','craneware','crash','creatify','creditbook','crestline',
  'crewscale','criteria','crosschq','crowdbotics','crownpeak',
  'crucial','cue','cultivate','culture','cumulus','curaleaf',
  'curated-ai','currency','cursor-ai','custom-ink','cutover',
  'cyble','cycle','cymulate','cypress-io','dapper-labs','darkstore',
  'dash-medical','dashbird','datasnipper','datastore','davinci',
  'daylight','dazn','dealtale','decent','decibel','deckchair',
  'declara','decoda','deepcrawl','defiance','deliverr','delphia',
  'demand','demandwell','dense-ai','depot-ai','derive','desert',
  'designit','destini','detect-ai','devada','devconnect','devgraph',
  'devmate','devo','devrev','dezeen','diagrid','diamond',
  'dice','digicert','digital-ai','digitalbridge','diligent',
  'dinova','discover','diskover','dispatch-ai','district','divvy-homes',
  'docket','docuseal','dome9','doorstep','dorado','dorsal',
  'dove','doxel','dracula','dream11','dremio-labs','drift-ai',
  'drone-base','droplr','drumwave','dstillery','duetto','duo',
  'dusty','dutchie','dynatrace','eagle','earnest','easel',
  'eaze','echelon','eclipse','edgecase','edgewater','edison',
  'editorial','efishery','eightfold-ai','elastic-path','elation',
  'electrode','element-ai','elevated','elicit','elinvar','elixir',
  'elopage','emarsys','embr','emergence','emote','empath',
  'empirica','employ','empower','enclave','encore-ai','endeavor',
  'endgame','endowment','engagedly','enigma-ai','enlighten',
  'enrich','ensemble','enterprise','envato','envision-ai','eon',
  'epoch-ai','epsilon','equalize','equinox','equity','ergo',
  'erwin','essentia','etleap','eucalyptus','euro','evabot',
  'everbridge','evercommerce','everest','evidence','evocalize',
  'evopark','exact-sciences','exafunction','excelsior','exception',
  'executech','exiger','expander','experience','explore','express-ai',
  'extend','extensis','external','extract','eyeo','fable',
  'facet','facilio','fairmarkit','falcon-ai','familiar','fanatics',
  'farfetch','farmstead','fastfield','fatmap','feather','feathery',
  'felfel','fetch','fibo','fidelity','filament','filestack',
];
for (const slug of MORE_COMPANIES) SLUGS.add(slug);

const slugArray = [...SLUGS];
console.log(`Generated ${slugArray.length} candidate slugs\n`);

// ============================================================
// ATS SCRAPING
// ============================================================

async function scrapeAshby(slugs) {
  const jobs = [];
  let valid = 0;
  for (let i = 0; i < slugs.length; i += 40) {
    const batch = slugs.slice(i, i + 40);
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        const d = await fetchJSON(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
        if (!d?.jobs?.length) return [];
        valid++;
        return d.jobs.map(j => ({
          company: d.jobBoard?.organizationName || guessCompany(slug),
          role: j.title,
          url: `https://jobs.ashbyhq.com/${slug}/${j.id}`,
          atsType: 'ashby',
          location: j.location || 'Remote',
        }));
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') jobs.push(...r.value);
    }
    process.stdout.write(`\r  Ashby: ${Math.min(i+40, slugs.length)}/${slugs.length} (${valid} valid)`);
  }
  console.log(`\n  ✅ Ashby: ${valid} valid boards`);
  return jobs;
}

async function scrapeGreenhouse(slugs) {
  const jobs = [];
  let valid = 0;
  for (let i = 0; i < slugs.length; i += 40) {
    const batch = slugs.slice(i, i + 40);
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        const d = await fetchJSON(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`);
        if (!d?.jobs?.length) return [];
        valid++;
        return d.jobs
          .filter(j => isRemote(j.location?.name))
          .map(j => ({
            company: guessCompany(slug),
            role: j.title,
            url: `https://job-boards.greenhouse.io/${slug}/jobs/${j.id}`,
            atsType: 'greenhouse',
            location: j.location?.name || 'Remote',
          }));
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') jobs.push(...r.value);
    }
    process.stdout.write(`\r  GH: ${Math.min(i+40, slugs.length)}/${slugs.length} (${valid} valid)`);
  }
  console.log(`\n  ✅ GH: ${valid} valid boards`);
  return jobs;
}

async function scrapeLever(slugs) {
  const jobs = [];
  let valid = 0;
  for (let i = 0; i < slugs.length; i += 30) {
    const batch = slugs.slice(i, i + 30);
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        const d = await fetchJSON(`https://api.lever.co/v0/postings/${slug}?mode=json`);
        if (!Array.isArray(d) || !d.length) return [];
        valid++;
        return d
          .filter(j => isRemote(j.categories?.location))
          .map(j => ({
            company: guessCompany(slug),
            role: j.text,
            url: j.hostedUrl || j.applyUrl,
            atsType: 'lever',
            location: j.categories?.location || 'Remote',
          }));
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') jobs.push(...r.value);
    }
    process.stdout.write(`\r  Lever: ${Math.min(i+30, slugs.length)}/${slugs.length} (${valid} valid)`);
  }
  console.log(`\n  ✅ Lever: ${valid} valid boards`);
  return jobs;
}

// Job board APIs
async function scrapeJobicy() {
  const tags = [
    'react','typescript','node','fullstack','python','javascript',
    'frontend','backend','golang','rust','java','aws','docker','kubernetes',
    'nextjs','vue','angular','graphql','machine-learning','ai','llm',
    'ruby','php','scala','ios','android','security','cloud','devops',
    'data-science','mobile','web','api','terraform','linux',
    'crypto','blockchain','defi','web3','fintech','saas','startup','remote',
  ];
  const seen = new Set();
  const all = [];
  for (const tag of tags) {
    const d = await fetchJSON(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${tag}`, 8000);
    if (!d?.jobs) continue;
    for (const j of d.jobs) {
      if (seen.has(j.id)) continue;
      seen.add(j.id);
      all.push({ company: j.companyName, role: j.jobTitle, url: j.url, atsType: 'custom', location: j.jobGeo || 'Remote' });
    }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`  ✅ Jobicy: ${all.length} jobs`);
  return all;
}

async function scrapeRemoteOK() {
  try {
    const d = await fetchJSON('https://remoteok.com/api', 15000);
    if (!Array.isArray(d)) return [];
    const jobs = d.filter(j => j.position && j.company && j.url).map(j => ({
      company: j.company, role: j.position,
      url: j.url.startsWith('http') ? j.url : `https://remoteok.com${j.url}`,
      atsType: 'custom', location: j.location || 'Remote',
    }));
    console.log(`  ✅ RemoteOK: ${jobs.length} jobs`);
    return jobs;
  } catch { console.log('  ⚠️ RemoteOK: failed'); return []; }
}

async function scrapeWWR() {
  const categories = [
    'remote-programming-jobs','remote-full-stack-programming-jobs',
    'remote-devops-sysadmin-jobs','remote-back-end-programming-jobs',
    'remote-front-end-programming-jobs',
  ];
  const all = [];
  const seen = new Set();
  for (const cat of categories) {
    try {
      const html = await fetchText(`https://weworkremotely.com/categories/${cat}.rss`, 10000);
      if (!html) continue;
      const items = html.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1];
        const link = item.match(/<link>(.*?)<\/link>/)?.[1];
        if (!title || !link || seen.has(link)) continue;
        seen.add(link);
        const parts = title.split(':');
        all.push({ company: parts[0]?.trim() || 'Unknown', role: parts.slice(1).join(':').trim() || title, url: link, atsType: 'custom', location: 'Remote' });
      }
    } catch {}
  }
  console.log(`  ✅ WWR: ${all.length} jobs`);
  return all;
}

async function scrapeArbeitnow() {
  try {
    const all = [];
    for (let page = 1; page <= 5; page++) {
      const d = await fetchJSON(`https://www.arbeitnow.com/api/job-board-api?page=${page}`, 10000);
      if (!d?.data?.length) break;
      all.push(...d.data.filter(j => j.remote === true).map(j => ({
        company: j.company_name, role: j.title, url: j.url, atsType: 'custom', location: j.location || 'Remote',
      })));
    }
    console.log(`  ✅ Arbeitnow: ${all.length} remote jobs`);
    return all;
  } catch { console.log('  ⚠️ Arbeitnow: failed'); return []; }
}

async function scrapeHimalayas() {
  try {
    const all = [];
    const seen = new Set();
    for (let page = 1; page <= 15; page++) {
      const d = await fetchJSON(`https://himalayas.app/jobs/api?page=${page}&limit=50`, 10000);
      if (!d?.jobs?.length) break;
      for (const j of d.jobs) {
        const id = j.id || j.title + j.companyName;
        if (seen.has(id)) continue;
        seen.add(id);
        all.push({ company: j.companyName, role: j.title, url: j.applicationUrl || j.url || `https://himalayas.app/jobs/${j.id}`, atsType: 'custom', location: 'Remote' });
      }
    }
    console.log(`  ✅ Himalayas: ${all.length} jobs`);
    return all;
  } catch { console.log('  ⚠️ Himalayas: failed'); return []; }
}

// NEW: Try to scrape GitHub awesome-remote-jobs list for company names
async function scrapeAwesomeLists() {
  const urls = [
    'https://raw.githubusercontent.com/remoteintech/remote-jobs/main/README.md',
    'https://raw.githubusercontent.com/lukasz-madon/awesome-remote-job/master/README.md',
  ];
  const companies = new Set();
  for (const url of urls) {
    try {
      const text = await fetchText(url, 15000);
      if (!text) continue;
      // Extract company names from markdown tables/lists
      const lines = text.split('\n');
      for (const line of lines) {
        // Match markdown links like [Company Name](url)
        const match = line.match(/\[([^\]]+)\]\(https?:\/\//);
        if (match) {
          const name = match[1].trim();
          if (name.length > 1 && name.length < 50 && !name.includes('#') && !name.includes('|')) {
            companies.add(name);
          }
        }
        // Match table rows like | Company | description |
        const tableMatch = line.match(/^\|\s*\[?([^|\[\]]+?)\]?\s*\|/);
        if (tableMatch) {
          const name = tableMatch[1].trim();
          if (name.length > 1 && name.length < 50 && !name.startsWith('-') && !name.startsWith('=') && name !== 'Company') {
            companies.add(name);
          }
        }
      }
    } catch {}
  }
  console.log(`  ✅ Awesome lists: ${companies.size} company names extracted`);
  
  // Convert company names to slugs and try them
  const slugs = [...companies].map(name => 
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  ).filter(s => s.length >= 2 && s.length <= 30);
  
  return slugs;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('🔍 WAVE 14 — Abbreviations + Numerics + Creative + Awesome Lists\n');

  // First, get company slugs from awesome lists
  console.log('📡 Phase 0: Scraping awesome-remote-jobs lists...');
  const awesomeSlugs = await scrapeAwesomeLists();
  for (const slug of awesomeSlugs) SLUGS.add(slug);
  const allSlugs = [...SLUGS];
  console.log(`Total slugs after awesome lists: ${allSlugs.length}\n`);

  console.log('📡 Phase 1: ATS Board Scraping...');
  const [ashbyJobs, ghJobs, leverJobs] = await Promise.all([
    scrapeAshby(allSlugs),
    scrapeGreenhouse(allSlugs),
    scrapeLever(allSlugs),
  ]);

  console.log('\n📡 Phase 2: Job Board APIs...');
  const [jobicyJobs, remoteOKJobs, wwrJobs, arbeitnowJobs, himalayasJobs] = await Promise.all([
    scrapeJobicy(),
    scrapeRemoteOK(),
    scrapeWWR(),
    scrapeArbeitnow(),
    scrapeHimalayas(),
  ]);

  const allJobs = [
    ...ashbyJobs, ...ghJobs, ...leverJobs,
    ...jobicyJobs, ...remoteOKJobs, ...wwrJobs, ...arbeitnowJobs, ...himalayasJobs,
  ];
  console.log(`\n📊 RAW: ${allJobs.length} jobs`);

  const seenUrls = new Set();
  const byUrl = allJobs.filter(j => {
    if (!j.url || seenUrls.has(j.url)) return false;
    seenUrls.add(j.url);
    return true;
  });

  const onePerCo = pickBestPerCompany(byUrl);

  const atsOrder = { greenhouse: 0, ashby: 1, lever: 2, custom: 3 };
  onePerCo.sort((a, b) => {
    const ats = (atsOrder[a.atsType] || 9) - (atsOrder[b.atsType] || 9);
    if (ats !== 0) return ats;
    return roleScore(b.role) - roleScore(a.role);
  });

  const bySrc = {};
  onePerCo.forEach(j => { bySrc[j.atsType] = (bySrc[j.atsType] || 0) + 1; });
  
  console.log(`\n🎯 FINAL: ${onePerCo.length} unique NEW companies`);
  console.log(`   By ATS:`, bySrc);

  writeFileSync(OUTPUT_PATH, JSON.stringify(onePerCo, null, 2));
  console.log(`\n✅ Saved ${onePerCo.length} jobs to ${OUTPUT_PATH}`);
}

main().catch(console.error);
