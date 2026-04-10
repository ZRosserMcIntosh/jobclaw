/**
 * scrape-wave27.mjs — WAVE 27: Latin/Greek roots + brand-style names
 *
 * Strategy: Companies named with Latin/Greek roots (common in biotech,
 * enterprise SaaS), brand-style made-up words, and tech company name
 * generators patterns (consonant-heavy, ends in -fy/-ly/-io/-os).
 */

import { writeFileSync, readFileSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave27-jobs.json';
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

// Latin/Greek root brand names popular in tech
const BRAND_NAMES = [
  // -ify/-efy pattern (Spotify, Shopify, etc.)
  'amplify','appify','autify','beatify','blockify','bookify','botify','buildify',
  'calcify','cashify','chatify','cladify','clarify','classify','clickify',
  'cloudify','codify','coinify','compify','connectify','convertify','creatify',
  'datafy','decodify','densify','deployify','digitify','docify','driveify',
  'edify','electrify','emissary','encodify','engageify','envify','eventify',
  'factify','feedify','fileify','flowify','formify','frontify','fundify',
  'gameify','genify','glorify','grantify','graphify','gridify','groupify',
  'hackify','happify','hashify','helpify','hostify','hubify','huntify',
  'identify','imagify','indexify','instafy','justify','knotify','labelify',
  'launchify','leadify','lendify','linkify','listify','livefy','loadify',
  'logify','loopify','magnify','mailify','mapify','markify','mashify','matchify',
  'meetify','meshify','metafy','mintify','mixify','modfy','mollify','monify',
  'motify','multify','nameify','netify','nodefy','notify','nullify','objectify',
  'omnify','onify','openify','optify','orderify','ossify','ownify','packify',
  'pagefy','pairify','parseify','passify','pathify','payify','peakify','pickify',
  'pipefy','pixelify','planify','playify','plotify','plugify','pointify',
  'pollify','poolify','portify','postify','preachify','priceify','probeify',
  'profity','propify','proveify','pulseify','purify','pushify','qualify',
  'quantify','queryfy','queueify','rackify','raisify','rankify','rateify',
  'ratify','readify','realify','rectify','renderify','rentify','replyify',
  'restify','richify','rideify','rigidify','ringify','routeify','ruleify',
  'salesify','sanctify','scaleify','scanify','scoreify','scriptify','sealify',
  'searchify','seedify','sellify','sendify','serveify','setify','shareify',
  'shiftify','shipify','shopify','signify','simplify','siteify','slideify',
  'smartify','snapify','solidify','sortify','sourceify','sparkify','specify',
  'speedify','spotlify','stackify','stageify','startify','storeify','stratify',
  'streamify','stringify','stupefy','stylify','surfify','swapify','sweetify',
  'switchify','syncify','tabify','tagify','taskify','teamify','terrify',
  'testify','textify','thinkify','ticketify','tokenify','toolify','topify',
  'touchify','trackify','tradeify','trainify','transify','treeify','trendify',
  'trustify','tuneify','turnify','tweakify','typeify','typify','unify',
  'uploadify','userify','validify','valueify','vendify','verify','versify',
  'viewify','voxify','watchify','webify','wireify','workify','wrapify',
  'yardify','zoneify',
  // -ly pattern (Grammarly, Bitly, etc.)
  'airtably','apily','aptly','assemblyly','basely','beamly','bestly','bitly',
  'boldly','boxly','brightly','broadly','busily','calcly','callly','calmly',
  'capably','caringly','cheaply','clearly','cleverly','closely','codely',
  'cooly','crisply','crossly','cruelly','daily','darkly','dataly','deeply',
  'deftly','densely','direly','directy','docly','doubly','dryly','dully',
  'eagerly','early','easily','edgely','evenly','exactly','fairly','finely',
  'firmly','firstly','fitly','fixedly','flatly','flexly','flowly','flyly',
  'fondly','freely','freshly','fully','gamely','gladly','godly','goodly',
  'grandly','greatly','grimly','hardly','highly','homely','hourly','hugely',
  'ideally','jointly','keenly','kindly','knotly','largely','lately','leanly',
  'lightly','likely','lively','lonely','loosely','loudly','lovely','lowly',
  'mainly','merely','mildly','mostly','namely','neatly','newly','nicely',
  'nobly','oddly','openly','orderly','overly','partly','poorly','primly',
  'purely','quickly','quietly','rarely','rashly','really','richly','rightly',
  'ripely','roughly','roundly','rudely','sadly','safely','sanely','scarcely',
  'seemly','shapely','sharply','sheerly','shortly','simply','slickly','slowly',
  'slyly','smartly','smoothly','snugly','softly','solely','sorely','sourly',
  'sparsely','squarely','stably','starkly','steely','sternly','stiffly',
  'subtly','surely','sweetly','swiftly','tautly','tensely','thickly','thinly',
  'tightly','timely','tiredly','totally','trimly','truly','vastly','vaguely',
  'vainly','warmly','weakly','weekly','wholly','widely','wildly','wisely',
  // -os/-us/-is pattern (Kubernetes, Nexus, etc.)
  'acros','actus','aegis','aeros','agilis','altus','animus','anthos','apexis',
  'aquos','archos','artis','astris','atmos','audis','auris','avros','axios',
  'basis','bios','bolus','canis','capis','carus','centris','chronos','cibus',
  'cinis','cirrus','citrus','claris','codus','comus','copus','cortis',
  'cosmos','cratis','cultis','cumulus','curis','cypris','datis','decis',
  'demos','demus','dextris','digitus','dirus','docus','domus','dosis',
  'durus','dynos','edgis','electris','emus','equis','essus','ethis',
  'exactis','exos','factis','felis','fibris','finis','flexis','floris',
  'fluxis','focis','formis','fortis','fundis','fusis','gemis','genesis',
  'globis','gratis','habis','haxis','helius','hexis','hubis','hydros',
  'iconus','ignis','imbus','indexis','infinis','innis','ionis','iridis',
  'juris','kenos','keris','kindus','labis','lacis','lamis','lapis','laxis',
  'lexis','libris','locus','logis','lucis','lumis','lunis','luxis','magis',
  'maxis','medis','melis','metis','micris','modus','molis','moris','motis',
  'multis','mundis','muris','navis','naxis','nexis','nimbus','nobis',
  'novis','nubis','octis','omnis','opsis','orbis','ordis','oris','ossis',
  'pacis','paris','partis','paxis','pellis','petris','physis','plexis',
  'polis','portis','praxis','primis','probis','probus','proxis','pulsis',
  'punctis','qualis','quantis','radis','ratis','redis','regis','relis',
  'remis','rexis','rhombus','rictus','rigis','rivus','robis','rotis',
  'rubus','salis','sanctis','scalis','sedis','semis','senis','servis',
  'signis','silvus','sirus','solis','sonus','sortis','spiris','statis',
  'stelis','stratis','summis','suris','tactis','talis','tempis','terris',
  'thesis','tigris','tokis','tractis','trutis','turbis','tutis','typis',
  'ultris','undis','unitis','urbis','valis','vectis','velis','ventis',
  'veris','vertis','vialis','viris','visis','vitis','voltis','voxis',
];

for (const name of BRAND_NAMES) SLUGS.add(name);

// Additional real companies we haven't tried
const MORE_COMPANIES = [
  'abnormal','abstract','accord','activeloop','addepar','adept','advent',
  'affinity','agora','airtable','aiven','akita','aledade','allbirds','alto',
  'amira','ansa','anyscale','apero','apollo','appian','apply-digital',
  'arcade','arcus','arena','arity','asana','ashby','assembly','atlan',
  'atlas','atomic','attain','aura','automata','avara','aviatrix','axle',
  'backpack','baton','beacon','belong','bestow','bevy','birch','bison',
  'bliss','bloom-energy','bloomreach','blox','blueprint','boardroom','bonfire',
  'bonsai','boost','boundary','brainbase','branch','breeze','briar','brigade',
  'brisk','bristle','bureau','cadence','caldera','cambium','campfire',
  'canvas','cape','captivate','cardinal','cargo','cascade','catalyst',
  'centaur','ceramic','cerebral','chamber','champion','chapel','charter',
  'chimera','chronicle','cipher','citadel','civic','clarion','cloak',
  'cluster','coalition','cobblestone','cockroach','codex','collective',
  'colony','colt','comet','command','commune','compass','compute','conduit',
  'confluence','conjure','connect','contour','conveyor','copper','coral',
  'corridor','cosmos','cottage','council','courier','covenant','crescendo',
  'crest','crimson','crux','curator','current','cypress','daemon','dagger',
  'dawn','decimal','decoy','defiant','delta','depot','derive','destiny',
  'dialect','diamond','digest','diode','direct','discovery','dispatch',
  'domain','dossier','downtown','dragonfly','drift','dynasty','eagle',
  'eclipse','eden','edifice','effect','element','elevate','embark','ember',
  'emerge','empire','enable','encore','endeavor','enigma','epoch','equator',
  'equity','era','escape','essence','ethos','eureka','evolve','exact',
  'exceed','expedition','explore','express','fabric','falcon','fathom',
  'fauna','feather','fellow','fidelity','figment','finesse','fjord',
  'flame','fleet','flourish','flux','foothold','forecast','forge','formidable',
  'fortress','foundation','fountain','fraction','fragment','framework',
  'franchise','frontier','fulcrum','furnace','fusion','galaxy','galleon',
  'gambit','garnet','garrison','gateway','gazette','genesis','glacier',
  'gladiator','glimpse','gondola','gradient','granite','grasshopper',
  'gravity','guardian','habitat','halcyon','halo','hamlet','harbor',
  'harmony','harvest','haven','hazard','headline','hearth','hemisphere',
  'heritage','horizon','humboldt','hurricane','ibis','iceberg','ignition',
  'illuminate','impulse','inception','indigo','infinity','innovation',
  'insight','integrity','intellect','interface','invoke','island','iterate',
  'ivory','jasmine','javelin','journey','jubilee','junction','kaleidoscope',
  'keystone','kinetic','labyrinth','landmark','lantern','latitude','lattice',
  'laurel','lava','legacy','legend','leverage','liberty','lighthouse',
  'limestone','lithium','longitude','lucidity','luminous','magenta',
  'magnitude','mammoth','mandarin','manifest','mantle','marathon','marble',
  'maritime','matrix','maxim','mayflower','mechanism','medallion','membrane',
  'mentor','mercury','meridian','mesa','method','midnight','milestone',
  'millennium','mineral','miracle','mirage','mission','modular','molecule',
  'momentum','monarch','monitor','monolith','moonlight','mosaic','mountain',
  'moxie','mustang','mystic','narrative','nautilus','nebula','nectar',
  'neptune','nimbus','nitrogen','noble','nomad','nova','nucleus','oasis',
  'obsidian','odyssey','olympus','omega','onward','opal','operator','optimal',
  'oracle','orbit','origin','osprey','outpost','overture','oxygen','pacific',
  'palette','paradigm','parallel','parcel','passport','pathway','patriot',
  'pavilion','pebble','pelican','peninsula','permit','persona','phoenix',
  'photon','pilgrim','pinnacle','pioneer','pivot','platform','plexus',
  'polaris','polygon','portico','praxis','precept','premise','presto',
  'prevail','primal','prism','prodigy','proton','provenance','proxy',
  'pyramid','quartz','quasar','radiant','radius','rainbow','rampart',
  'raven','realm','rebel','refinery','reflection','regal','remedy',
  'renew','republic','resonance','restore','reverie','revolution','rhino',
  'rhythm','ridgeline','ripple','ritual','riverbed','roadmap','rocket',
  'rosetta','rover','rubicon','sapphire','sapling','satellite','savant',
  'scaffold','scimitar','scout','segment','sentinel','sequel','seraph',
  'serpent','shaman','shelter','shepherd','sierra','sigma','silicon',
  'silverline','simplicity','siren','skyline','slate','slipstream',
  'solstice','sonata','sonnet','sovereign','spectrum','sphinx','spiral',
  'splinter','springboard','squadron','stampede','standard','stardust',
  'stealth','stimulus','stingray','stratosphere','strive','stronghold',
  'summit','sunbeam','sundial','sunrise','supernova','sustain','symbiosis',
  'symphony','synthesis','tableau','talon','tangent','tapestry','tempest',
  'temple','terrain','testament','theorem','threshold','thunderbolt',
  'timber','titan','torch','tornado','torrent','totem','touchstone',
  'trajectory','transform','transit','traverse','treasure','trident',
  'trilogy','triumph','trophy','tundra','turbine','twilight','typhoon',
  'umbra','unicorn','universal','uplift','vanguard','vapor','velocity',
  'venture','verdict','vertex','vessel','vesta','veteran','viaduct',
  'vigilant','vintage','violet','vision','volcano','voltage','vortex',
  'voyage','vulcan','wayfinder','wildcard','windfall','wingspan','wizard',
  'zenith','zephyr','zodiac',
];

for (const name of MORE_COMPANIES) SLUGS.add(name);

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
  const tags = ['react','typescript','node','fullstack','python','javascript','frontend','backend','golang','rust','java','aws','docker','kubernetes','ai','llm','devops','cloud','mobile','web','security','fintech','saas','remote','machine-learning','data-engineering','ios','android','ruby','rails','vue','angular','nextjs','graphql','terraform'];
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
  console.log('🔍 WAVE 27 — Latin/Greek Roots + Brand-Style Names\n');
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
