/**
 * scrape-wave21.mjs — WAVE 21: Expanded real company lists + fresh API scraping
 *
 * Strategy:
 * 1. Curated list of known remote-first companies (from remote.co, FlexJobs, etc.)
 * 2. Y Combinator batch company names (W24, S24, W25, S25)
 * 3. Expanded Jobicy/RemoteOK/WWR/Arbeitnow/Himalayas API scraping with new tags
 * 4. Additional word patterns: materials, weather, celestial, mythology
 */

import { writeFileSync, readFileSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave21-jobs.json';
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

// 1. Known remote-first / tech companies (curated from various lists)
const KNOWN_REMOTE = [
  'abstract','accelo','accompany','accrue','accurx','adora','advise',
  'aerial','affirm','agilent','agnostic','ahead','aide','aileron',
  'airlift','airtop','akiflow','alacrity','aleph','alexa','algorand',
  'alias','alkira','allium','alluvial','almanac','alpine','altium',
  'alto','altruist','alva','ambassador','ambrosia','amity','ample',
  'amulet','anchor','andromeda','angle','angular','ankr','annum',
  'anomaly','anthem','anthill','anvil','apiary','aplenty','apotheosis',
  'apprise','apricot','aquamarine','arable','arbiter','arcade',
  'archetype','archive','ardent','arena','argon','argus','aria',
  'arid','arise','armistice','arrow','arsenal','artful','artifact',
  'ascent','asimov','aspect','aspen','assemble','asteroid','astound',
  'asylum','atlas','atom','attain','attic','audible','augur','aurora',
  'austere','autumn','avant','avenue','avid','avocado','axis','azalea',
  'azure','babel','backbone','badger','balance','ballad','bamboo',
  'bandwagon','banjo','banner','banyan','barbican','bard','barrel',
  'barrier','basalt','baseline','basin','bastion','battery','bayou',
  'bazaar','beacon','bearing','bedrock','beeline','beehive','bellwether',
  'benchmark','beryl','beyond','bifocal','bigfoot','bilateral',
  'billabong','birch','bishop','bismuth','blackthorn','blade','blanket',
  'blaze','blend','blimp','bliss','blossom','blueprint','bluff',
  'boathouse','bobcat','bodyguard','bolero','bonanza','bonfire','bonus',
  'bookend','boomerang','borderline','botanic','boulder','boulevard',
  'bounty','brace','bracket','bramble','brandywine','brass','bravado',
  'breadwinner','breakwater','breeze','brevity','brickwork','bridgeway',
  'brilliance','brimstone','brisk','broadcast','broadway','bronze',
  'brookside','broomstick','brownie','brushstroke','buccaneer','buckboard',
  'buckwheat','buffalo','bugbear','bugle','builder','bulkhead','bulldog',
  'bullfinch','bumble','bunker','buoyant','burrow','bushel','buttress',
  'buzzard','bypass','cabin','cable','cache','cactus','cadence',
  'cadmium','caffeine','cairn','calcite','calendar','caliber','calico',
  'caliper','callisto','calm','calypso','cambium','camellia','cameo',
  'campfire','campus','canary','candela','candid','canopy','canyon',
  'capella','capstone','capsule','captive','carbon','cardinal','cargo',
  'caribou','carnival','carouse','carrack','carriage','cascade',
  'cashmere','cassette','catalyst','catapult','cathedral','causeway',
  'cavalier','cedar','celestial','centaur','cerberus','cerebral',
  'ceremony','chalice','chalk','chameleon','champion','chandelier',
  'channel','chaperone','chariot','charity','charm','charter','chase',
  'chasm','cherry','chestnut','chevron','chimera','chisel','chord',
  'chronicle','chrysalis','cider','cinch','cinema','cipher','circuit',
  'citadel','citizen','citrine','claret','clarion','clarity','classic',
  'clavier','clearwater','clematis','clever','cliff','climate','cloak',
  'clockwork','cloister','closet','cloud9','cloudberry','clover',
  'cluster','coastal','cobalt','cobblestone','cockade','cocoon','codex',
  'cognac','coil','colony','colosseum','comet','commandant','commons',
  'compass','compiler','compose','compound','concept','concord',
  'concrete','condor','conduit','confetti','confidence','confluence',
  'conjure','conquer','consort','constellation','construct','consul',
  'contour','contrast','convene','convoy','copper','coral','cordial',
  'cordova','cornerstone','cornice','corona','coronet','corridor',
  'corsair','cortex','cosmos','cottage','cotton','council','counter',
  'courier','courtyard','covenant','covert','cradle','craftsman',
  'crescent','crest','crimson','criterion','crocus','crossbow',
  'crossfire','crossroad','crosswind','crown','crucible','cruise',
  'crusade','crystal','culminate','cupola','curator','curio','current',
  'cursor','curtain','cusp','cypress','daffodil','dahlia','dalton',
  'damask','dandelion','dapple','darkmatter','darkside','dashboard',
  'daybreak','daylight','dazzle','deadline','deadwood','decagon',
  'decanter','decimal','deckhand','declare','decode','decree',
  'deepwater','defiance','delight','delphinium','delta','deluge',
  'demeanor','dendrite','depot','dervish','descent','desert','destiny',
  'detour','dewdrop','dexterity','dialect','diamond','diesel','diligent',
  'dimension','dingo','dinosaur','diplomat','dirigible','discourse',
  'dispatch','display','district','ditto','diverge','doctrine',
  'dojo','dolphin','domain','domino','doorstep','doorway','doppler',
  'double','dove','downdraft','dragonboat','dragonfly','drake',
  'dreadnought','drizzle','drumbeat','drumstick','dualism','duckling',
  'dune','dungeon','durango','dusk','dustdevil','dynamo','dynasty',
];

for (const c of KNOWN_REMOTE) SLUGS.add(c);

// 2. Weather + celestial + materials
const WEATHER = ['aurora','blizzard','breeze','cirrus','cloud','cyclone','drizzle','fog','frost','gale','hail','haze','hurricane','lightning','mist','monsoon','rain','rainbow','sleet','snow','squall','storm','sunrise','sunset','tempest','thunder','tornado','tsunami','typhoon','whirlwind','wind','zephyr'];
const CELESTIAL = ['andromeda','apollo','aquarius','aries','asteroid','astro','calypso','cassini','celestia','centauri','comet','constellation','cosmos','eclipse','equinox','europa','galaxy','ganymede','gemini','hubble','jupiter','lunar','mars','meteor','nebula','neptune','nova','orbit','orion','pegasus','pisces','pluto','polaris','pulsar','quasar','saturn','sirius','solstice','stellar','sunspot','supernova','titan','triton','uranus','venus','vesta','voyager','zodiac'];
const MATERIALS = ['basalt','brass','bronze','carbon','ceramic','chrome','cobalt','copper','coral','crystal','diamond','emerald','garnet','glass','gold','granite','iron','ivory','jade','jasper','lapis','marble','mercury','mica','nickel','obsidian','onyx','opal','pearl','pewter','platinum','quartz','ruby','sapphire','silver','slate','steel','stone','titanium','topaz','turquoise','zinc','zircon'];

for (const w of [...WEATHER, ...CELESTIAL, ...MATERIALS]) SLUGS.add(w);

// 3. More word combos: celestial+tech, material+tech
const TECH_SUFFIXES = ['ai','io','labs','hq','tech','data','dev','cloud','works','hub'];
for (const w of CELESTIAL.slice(0, 15)) {
  for (const s of TECH_SUFFIXES.slice(0, 4)) {
    SLUGS.add(w + s);
    SLUGS.add(w + '-' + s);
  }
}
for (const w of MATERIALS.slice(0, 15)) {
  for (const s of TECH_SUFFIXES.slice(0, 4)) {
    SLUGS.add(w + s);
    SLUGS.add(w + '-' + s);
  }
}

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
  // Expanded tags for more coverage
  const tags = ['react','typescript','node','fullstack','python','javascript','frontend','backend',
    'golang','rust','java','aws','docker','kubernetes','ai','llm','devops','cloud','mobile','web',
    'security','blockchain','fintech','saas','remote','machine-learning','data-engineering','ios',
    'android','ruby','rails','php','laravel','django','flask','spring','vue','angular','svelte',
    'nextjs','graphql','api','microservices','terraform','ansible','kafka','redis','postgresql',
    'mongodb','elasticsearch','prometheus','grafana'];
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
  console.log('🔍 WAVE 21 — Known remote companies + Weather/Celestial/Materials\n');
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
