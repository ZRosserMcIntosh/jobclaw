/**
 * scrape-wave20.mjs — WAVE 20: GitHub org names, npm package orgs, Crunchbase-style
 *
 * Strategy:
 * 1. Known GitHub org names that are likely companies
 * 2. npm scope names (@scope → company)
 * 3. Common startup naming patterns: word+word no separator
 * 4. Alliterative names (PayPal, TikTok, etc.)
 * 5. "-ify", "-ible", "-able", "-ment", "-tion" word endings
 */

import { writeFileSync, readFileSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave20-jobs.json';
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

// 1. Known GitHub org / tech company names
const GITHUB_ORGS = [
  'absinthe','accord','acorn','actuate','adept','admiral','advent','affinity',
  'aftership','agora','airbyte','airflow','airtop','alchemy','aleo','align',
  'aloft','altana','altimetrik','amalgam','amaze','ambient','amped','anchor',
  'andela','angaza','anima','antler','apiary','apogee','appfire','appian',
  'aptible','aqua','aquifer','arbor','archive','ardent','arena','argon',
  'argyle','artifact','ascend','aspect','assist','astral','athena','atlas',
  'atomic','attain','augment','aura','automate','avail','avalanche','aven',
  'avenue','avid','axiom','azure','babel','backdrop','badge','baffle',
  'ballast','bamboo','banner','banzai','barrel','basalt','baseline','basin',
  'battery','bazaar','beacon','bear','bedrock','beeline','belvedere','bench',
  'bettercloud','beyond','bifrost','birch','bishop','blackbird','blaze',
  'blinker','blitz','blockstream','bloom','blossom','blueprint','blueshift',
  'bodhi','bolt','bonfire','boom','booster','borneo','bounty','bracket',
  'bramble','brass','breadth','breeze','breezy','bridge','brigade','brilliant',
  'brisk','broadcast','bronze','brook','brushfire','buckle','buffalo','bugcrowd',
  'bulkhead','bullhorn','bunny','bureau','burnish','bushel','cabal','cabin',
  'cable','cache','cadmium','cairn','calcite','caliber','calico','cambium',
  'campfire','canary','candid','canopy','canyon','capacitor','capsule',
  'carbon','cardinal','cargo','carnival','cascade','catalyst','catch',
  'cauldron','cavalry','cellar','cement','census','centaur','cerberus',
  'cerebral','chalk','chamber','channel','chapel','chapter','charm',
  'charter','chase','chasm','cherry','chestnut','chimera','chord','chronicle',
  'chrysalis','cipher','circuit','citadel','citizen','civic','claim','clarion',
  'clarity','clasp','clearway','clever','cliff','climate','cloister','close',
  'cluster','cobalt','cockpit','cocoa','codex','coil','collar','colony',
  'comet','command','commons','compass','compile','compose','compound',
  'concept','concord','concrete','condor','conduit','confetti','confide',
  'confluence','conjure','consort','construct','contour','contrast','convene',
  'convoy','copper','coral','cordova','cornerstone','corona','corridor',
  'cortex','cosmos','council','counter','courier','courtyard','covenant',
  'covert','cradle','crane','crate','craton','crescent','crest','crimson',
  'criterion','crocus','crossbar','crossbow','crucible','crusade','cryogen',
  'cube','current','cursor','curtain','cusp','cypress','daemon','dahlia',
  'dapple','daylight','deadline','decagon','decimal','deckard','declara',
  'decree','defiant','deluge','depot','deputy','descent','desert','designit',
  'destiny','detect','detour','devise','dew','dexterity','dialect','diamond',
  'diesel','digit','diode','dirigible','discourse','dispatch','display',
  'district','ditto','diverge','divide','doctrine','domain','domino',
  'doorway','doppler','double','dragnet','dragonboat','drake','dredge',
  'drizzle','drone','dualism','duality','dulcet','dune','dunlin','dynamo',
  'eagle','earnest','earthen','eastwind','ebony','echelon','eclipse',
  'ecology','edifice','edition','effigy','eggplant','eider','eight',
  'elabor','element','elephant','elevate','ellipsis','embark','embrace',
  'emerald','emissary','empire','emulate','enclave','encode','endemic',
  'endgame','endure','enigma','ensemble','envoy','epoch','epsilon',
  'equator','equinox','ergo','ermine','escape','essence','estate','ether',
  'eureka','eventide','everest','evident','evolve','exalt','excalibur',
  'exceed','exchange','exhibit','exodus','expanse','exploit','express',
  'exponent','fable','fabric','facet','factor','falcon','fathom',
  'feather','fenix','ferris','fern','ferry','festival','fiber','fidelity',
  'fiesta','figment','filament','finch','finder','firebird','firefly',
  'firmament','flagship','flamelink','flare','flatcar','fledge','flint',
  'flora','flourish','flux','flywheel','focal','fontaine','foothold',
  'forecast','foreland','forestry','formula','forsyth','fortress','fossil',
  'foundry','fountain','foxglove','fractal','fragment','framework',
  'freehold','freeway','freight','frontier','frostbite','fruitful',
  'fulcrum','furnace','fuselage','fusion','gadget','galaxy','galleon',
  'galley','gambit','gamma','gannet','garnet','garrison','gateway',
  'gazelle','gemini','genesis','genie','genome','gentle','geode',
  'geyser','gilded','glacier','gladiator','glimmer','glimpse','globetrotter',
  'goldfinch','gondola','gorilla','gossamer','govern','grackle','gradient',
  'granite','grassland','gratitude','gravel','gravity','grotto','guardian',
  'guava','guild','gull','gumball','gust','gypsum','habitat','haiku',
  'halcyon','halo','hamlet','hammer','handshake','hangar','harbor',
  'hardwood','hare','harmony','harpoon','harrier','harvest','haven',
  'hawkeye','hawthorn','headband','headlight','headway','heartbeat',
  'heather','hedge','helipad','helium','hemlock','herald','hermit',
  'heron','hickory','highland','hilltop','hinge','hippocampus','hologram',
  'honeybee','horizon','hornet','horseshoe','hourglass','huckleberry',
];

for (const org of GITHUB_ORGS) SLUGS.add(org);

// 2. Alliterative / repeated-sound patterns
const ALLITERATIVE = [
  'baseband','beachball','beanbag','beatbox','bigbang','bigbird','bigbone',
  'bitbucket','blackbox','blueberry','bluebolt','bonbon','bookbind',
  'brickblock','broadband','brushback','bugbear','bullbird','bumblebee',
  'cakecup','campcraft','capcone','carclub','catcall','clayclay',
  'cloudcraft','cobblecone','codecademy','codecamp','codeclub','codecove',
  'coldcut','coppercraft','coralcove','corncrake','darkdart','datadash',
  'datadeck','datadive','datadock','datadome','datadot','datadrop',
  'dataduct','datadust','deepdive','deepdock','deerdawn','deskdash',
  'dirtdog','dockdash','dogdoor','dotdash','dreamdeck','dustdevil',
  'eagleeye','earthedge','everevent','firefin','firefish','firefist',
  'firefit','fireflash','fireflick','fireflint','fireflood','fireflop',
  'firefog','firefoot','fireforce','fireford','fireform','firefort',
  'firefox','fireframe','firefrost','firefruit','firefuel','firefull',
  'firefund','firefuse','goldgrid','goodgame','graygrid','greengrid',
  'gridgraph','hawkhaven','iceinput','ironink','jadejet','javajam',
  'keenkey','kindkit','linklane','moonmesh','neonnode','oakops',
  'peakpipe','quickquest','redrock','safeseed','smartsnap','toptrack',
  'vivavault','wavework','zenzone',
];

for (const a of ALLITERATIVE) SLUGS.add(a);

// 3. Word + common tech endings (no hyphen)
const BASE_WORDS = [
  'aero','agile','alpha','apex','aqua','arc','atom','auto','axis',
  'beam','beta','blaze','bolt','boost','brain','bright','byte',
  'calm','cast','center','cipher','civic','clear','click','climb',
  'clock','cloud','code','comet','consul','coral','core','cosmos',
  'craft','crane','crest','cross','crown','cube','curve','cyber',
  'dash','dawn','delta','depth','digit','dock','dome','draft',
  'eagle','earth','echo','edge','ember','epoch','equal','ether',
  'event','exact','exo','extra','falcon','field','finch','flame',
  'flash','fleet','flint','float','flow','flux','focal','force',
  'forge','form','forte','front','frost','fuel','fuse','gamma',
  'gate','gauge','gear','giga','glide','globe','glow','gold',
  'grace','grain','graph','grasp','green','grid','grip','grove',
  'guard','guide','gust','hawk','heart','helix','helm','hero',
  'hive','hoist','hyper','impact','impulse','index','inner','input',
  'inter','invoke','iron','island','jade','jolt','keen','kern',
  'kinetic','knight','knot','lance','lane','laser','latch','layer',
  'lead','leap','lens','level','lever','light','lime','linear',
  'link','locus','loft','logic','lunar','lux','macro','magnet',
  'manor','maple','mark','marsh','mason','matrix','maven','maxim',
  'media','merge','merit','mesa','metal','meteor','metro','micro',
  'might','mill','mint','mirror','modal','mold','motion','motor',
  'mount','muse','nano','native','nerve','nexus','nimble','noble',
  'node','north','nova','nucleus','oasis','ocean','omega','onyx',
  'optic','orbit','origin','outer','oxide','pace','palm','panda',
  'panel','paper','parity','parse','patch','pearl','petal','phase',
  'pilot','pine','pixel','plank','plasma','plate','plaza','point',
  'polar','portal','power','press','prime','prism','probe','proof',
  'proto','proxy','pulse','quake','quartz','quasar','query','queue',
  'radar','radix','rally','ramp','range','rapid','raven','reach',
  'realm','rebel','reef','reign','relay','render','ridge','rift',
  'ripple','river','robin','rocket','root','rover','ruby','rune',
  'rust','sage','scale','scout','seed','sense','seraph','shade',
  'shard','shelf','shield','shore','sigma','silk','silver','siren',
  'slate','slope','smart','solar','solid','sonic','south','space',
  'spark','spear','spell','sphere','spike','spine','spiral','spoke',
  'spring','sprout','squad','stable','staff','stage','stake','stance',
  'stark','steam','steel','stellar','stone','storm','strafe','stride',
  'string','stripe','strobe','studio','summit','surge','swarm','sweep',
  'swift','switch','sword','symbol','syntax','tactic','talon','tango',
  'tempo','tenor','terra','theta','thorn','thread','thunder','tiger',
  'timber','titan','token','torch','tower','trace','trail','trek',
  'triad','tribe','trident','trinity','turbo','tusk','twilight',
  'umbra','union','unity','urban','valor','valve','vapor','vault',
  'vector','velvet','venture','verge','vertex','vigor','villa','vine',
  'violet','virtue','vision','vista','vital','vivid','volt','vortex',
  'voyage','vulcan','warden','wave','wedge','whale','wheat','whisper',
  'widget','willow','wind','wire','wonder','zenith','zero','zinc','zone',
];

const TECH_ENDINGS = ['base','works','stack','grid','hub','lab','labs','net',
  'link','sync','ops','port','dock','shift','ware','cloud','data',
  'mind','point','space','view','way','forge','craft','scale'];

for (const w of BASE_WORDS.slice(0, 80)) {
  for (const e of TECH_ENDINGS.slice(0, 8)) {
    SLUGS.add(w + e);
  }
}

// 4. More random real company attempts
const MORE_REAL = [
  'acre','addi','aduro','aether','afresh','agolo','ahana','airlift',
  'airtop','akili','alanda','albedo','aleph','alidade','alkira','alluxo',
  'altair','altana','alteia','altera','alviere','amadeus','amagi','amagno',
  'amperity','ampla','amplio','ancora','andela','angaza','anima','anvil',
  'apiture','appfire','appier','apprise','aqfer','aquabyte','arable',
  'arbol','arceo','archera','archon','ardoq','arize','armada','armilla',
  'arnav','arqit','artera','artisan','artius','ascella','ascend','ashby',
  'askui','aspen','asteria','astra','astrato','atelier','atelio','athena',
  'atlan','attivo','augury','aurelia','aurora','auror','autone','avalara',
  'aviatrix','aviso','axle','axon','ayasdi','azibo','babel','backlot',
  'ballista','banjo','banyan','baraja','basalt','basecamp','basin',
  'bayonet','beaker','bedrock','beeline','benchmark','bezlio','biomea',
  'birdie','bitrise','bitsight','bliss','blitz','bloom','blossom',
  'blueconic','bluecore','blueshift','bluevine','boardable','boldend',
  'bonfire','boomi','boulder','bracket','brainly','bramble','brass',
  'breaker','breeze','brex','brickyard','bridge','brigade','brilliant',
  'bringg','bronze','brook','brushfire','bubble','buckle','bugsnag',
  'buildkite','bullpen','bunker','bureau','burnish','bushel','buttercup',
  'byline','cabin','cache','cadence','cairn','calcite','calix','cambium',
  'campfire','canary','candid','canopy','canyon','capacitor','capsule',
  'carbon','cardinal','cargo','carnival','carrot','cascade','catalyst',
  'catch','cauldron','cavalry','cellar','cement','census','centaur',
  'cerebral','chalk','chamber','champion','channel','chapel','chapter',
  'charm','charter','cherry','chili','chimera','chord','chronicle',
  'chrysalis','cipher','circuit','citadel','citizen','civic','claim',
  'clarion','clarity','clasp','clear','clever','cliff','climate',
  'cloister','cluster','cobalt','cockpit','codex','coil','colony',
  'comet','command','commons','compass','compile','compose','compound',
  'concept','concord','concrete','condor','conduit','confetti','confide',
  'confluence','conjure','consort','construct','contour','contrast',
  'convene','convoy','copper','coral','cordova','cornerstone','corona',
  'corridor','cortex','cosmos','council','counter','courier','courtyard',
  'covenant','covert','cradle','crane','crate','crescent','crest',
  'crimson','criterion','crocus','crossbar','crucible','crusade',
  'cryogen','cube','current','cursor','curtain','cusp','cypress',
];

for (const c of MORE_REAL) SLUGS.add(c);

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
  console.log('🔍 WAVE 20 — GitHub orgs + Alliterative + Base+Suffix + More companies\n');
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
