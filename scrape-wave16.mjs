/**
 * scrape-wave16.mjs — WAVE 16: Place names, people names, and invented words
 * 
 * Strategy:
 * 1. City/country/place-inspired company names
 * 2. First name-based companies (like "alice", "oscar", "henry")
 * 3. Short invented words (4-6 letters, consonant-vowel patterns)
 * 4. Latin/Greek prefix+suffix combos (veri-, proto-, neo-, etc.)
 * 5. Double-word with "get", "try", "use", "go" prefixes
 */

import { writeFileSync, readFileSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave16-jobs.json';
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

// Place-based names
const PLACES = [
  'aberdeen','acadia','adelaide','aegean','alpine','amazon','andes','andromeda',
  'arcadia','arctic','aria','aspen','athena','atlantic','atlas','aurora',
  'austin','avalon','baltic','bamboo','barcelona','beacon','berlin','bermuda',
  'bohemia','boulder','brazil','brooklyn','cairo','cambridge','cape','cascade',
  'catalina','cedar','celsius','central','chapel','chesapeake','chicago',
  'coastal','columbia','compass','copenhagen','coral','corsica','crest',
  'crystal','cypress','dallas','danube','darwin','daybreak','delphi','delta',
  'denver','derby','devon','drake','dublin','eastside','eclipse','eden',
  'edinburgh','elysian','emerald','empire','endurance','equator','everest',
  'excalibur','expedition','falcon','finland','florence','forest','forge',
  'frontier','galway','genesis','geneva','gibraltar','glacier','global',
  'gothic','granite','greenfield','greenland','greenville','grove','guardian',
  'gulf','halifax','hamilton','harbor','haven','highland','horizon',
  'hudson','iceland','indiana','indigo','island','istanbul','ivory',
  'jackson','jasper','jersey','jordan','jubilee','keystone','kingston',
  'labrador','lagoon','lakeside','landmark','latitude','liberty','lisbon',
  'london','longitude','lyric','madrid','magellan','maine','manhattan',
  'marathon','marina','marquee','matrix','maverick','meridian','mesa',
  'metropolis','milan','monterey','montreal','monument','mosaic','munich',
  'nantucket','naples','nautilus','neptune','nevada','nordic','norfolk',
  'northstar','oakland','oasis','oceanic','odyssey','olympia','onyx',
  'outpost','pacific','palisade','panorama','paris','patriot','peninsula',
  'phoenix','piedmont','pinnacle','pioneer','plaza','polaris','portland',
  'prague','premier','presidio','prism','prospect','providence','quantum',
  'radius','raleigh','ranger','rapids','redwood','reef','regent',
  'renaissance','republic','richmond','ridgeline','riviera','rockwell',
  'rome','rosewood','royal','safari','sahara','santiago','sapphire',
  'savannah','scottsdale','seattle','sequoia','sheridan','sierra','silica',
  'solaris','solstice','somerset','southern','sovereign','spectrum',
  'stanford','sterling','stockholm','stratton','summit','sunrise','tahoe',
  'tangier','terra','titan','topaz','traverse','trinity','tropical',
  'turquoise','twilight','unity','uptown','urban','valencia','vanguard',
  'venice','vermont','versailles','victoria','vienna','village','vintage',
  'voyager','wellington','westfield','wilshire','windsor','yukon','zanzibar',
  'zenith','zurich',
];

// People-name companies (first names)
const NAMES = [
  'ada','adele','agatha','aiden','aisha','albert','alec','alexa','alfred',
  'alice','alma','amara','amber','amelia','amos','amy','anabel','andrew',
  'angela','anna','annie','anton','april','archer','arden','aria','ariel',
  'arthur','ash','astrid','atlas','aubrey','audrey','austin','autumn',
  'ava','avery','axel','beau','becky','bella','bennett','blake','boris',
  'briar','bridget','bruce','bruno','byron','cadence','caleb','callum',
  'calypso','camille','carl','carmen','carol','carter','casey','cedar',
  'celeste','celia','chad','charlie','charlotte','chase','chelsea','chloe',
  'claire','clara','claude','clay','clement','clive','cleo','clyde',
  'colby','cole','connor','cooper','cora','darwin','dean','diana',
  'dominic','donna','dylan','eden','edgar','edith','elara','elena',
  'eli','eliza','ella','ellie','elsa','ember','emery','emma','eric',
  'esme','ethan','eva','eve','evelyn','ezra','faith','felix','fern',
  'fiona','flora','florence','flynn','ford','forrest','frank','freya',
  'gabriel','garrett','gemma','george','gia','gideon','gina','grace',
  'graham','grant','greta','griffin','gus','haley','hank','hannah',
  'harper','harrison','harry','harvey','hazel','heath','heidi','helen',
  'henry','holden','holly','hope','hubert','hugo','hunter','ida','igor',
  'india','ines','ingrid','iris','irving','isaac','isabella','isla',
  'ivan','ivy','jack','jade','jake','james','jane','jasmine','jasper',
  'javier','jean','jenna','jenny','jess','jesse','jill','joan','joel',
  'jolene','jonah','jordan','jose','joy','jude','julia','juliet','june',
  'kai','kara','karen','karl','kate','katrina','kay','keaton','keira',
  'kelly','kelvin','kent','kenzo','kevin','kira','kit','knox','kurt',
  'lana','lance','lane','lars','laura','leah','lee','lena','leo',
  'leon','levi','liam','lily','lina','linda','linus','liza','logan',
  'lola','loren','lottie','louie','lucas','lucia','lucy','luke','luna',
  'lydia','mabel','mace','madeline','mae','magnus','maia','maisie',
  'malcolm','marco','marcus','margot','maria','marina','mark','martha',
  'mason','matilda','max','maya','megan','mercer','mia','miles','milo',
  'mira','molly','morgan','nadia','nancy','natasha','neil','nelly',
  'nero','neve','nico','nina','noah','noel','nola','nora','nova',
  'olive','oliver','olivia','omar','opal','oscar','otto','owen',
  'paige','parker','pascal','patricia','paul','pearl','penny','peter',
  'petra','phoebe','pierce','pippa','porter','quinn','rachel','ralph',
  'ramona','raven','ray','reed','remy','rex','rhea','riley','rita',
  'robin','roman','rosa','rosie','rowan','roxie','ruby','ruth','ryan',
  'sadie','sage','sam','samara','sarah','scarlett','scott','selene',
  'seth','shane','sienna','simone','skylar','sofia','solomon','sophie',
  'spencer','stella','sterling','stuart','suki','summer','sunny','susan',
  'talia','tamara','tara','taylor','tessa','theo','thomas','tia',
  'toby','tom','tony','travis','troy','tucker','tyler','uma','una',
  'vale','valerie','vera','victor','vienna','viola','vivian','wade',
  'walter','wanda','warren','wendy','wesley','willa','willow','winston',
  'xavier','yara','zach','zara','zeke','zelda','zoe','zora',
];

// Prefix-based patterns ("get", "try", "use", "go", "my", "hey")
const PRODUCT_PREFIXES = ['get','try','use','go','my','hey','hi','one','the','all'];
const PRODUCT_WORDS = [
  'bloom','bridge','boost','clear','cloud','compass','connect','craft',
  'dash','data','dock','drive','edge','engine','field','fire','flex',
  'flow','forge','frame','front','gate','gem','glow','graph','grid',
  'guard','guide','hawk','helm','hero','hive','hook','hub','hunt',
  'jet','keep','key','kit','lab','lane','layer','lead','lens','level',
  'lift','light','line','link','lock','loft','logic','loop','mark',
  'mate','mesh','mind','mint','mode','nest','node','note','ops',
  'pad','path','peak','pilot','pipe','pixel','plan','play','plug',
  'point','pool','port','post','press','proof','pulse','push',
  'quest','rack','rail','ray','reef','ring','rise','rock','room',
  'root','sail','scale','scope','seal','seed','sense','shift','sight',
  'sign','slate','smart','snap','sort','source','spark','spot',
  'spring','stack','stage','star','step','stone','store','stream',
  'suite','surge','sync','tail','tank','task','team','tech','test',
  'tide','token','tool','top','tower','trace','track','tree','tribe',
  'tune','vault','verse','view','vine','vista','ward','ware','wave',
  'way','web','well','wind','wire','wise','wolf','works','zone',
];

for (const prefix of PRODUCT_PREFIXES) {
  for (const word of PRODUCT_WORDS.slice(0, 40)) {
    SLUGS.add(prefix + word);
    SLUGS.add(prefix + '-' + word);
  }
}

// Latin/Greek prefix compounds
const LATIN_PREFIXES = ['veri','proto','neo','bio','geo','eco','evo','aero','astro',
  'cosmo','electro','hydro','hypo','macro','micro','mono','multi','nano',
  'neuro','omni','para','photo','poly','pseudo','psycho','quasi','retro',
  'semi','super','techno','tele','thermo','trans','ultra','uni','xeno'];
const LATIN_SUFFIXES = ['fy','gen','hub','ics','ify','ism','ist','ize','lab','lia',
  'link','lux','matic','mix','nal','net','nix','nym','oid','ops',
  'ous','plex','port','scope','soft','sync','tec','tech','tion','tix',
  'verse','ware','wise','works','zone'];

for (const p of LATIN_PREFIXES) {
  SLUGS.add(p);
  for (const s of LATIN_SUFFIXES.slice(0, 15)) {
    SLUGS.add(p + s);
  }
}

// Add all names and places as slugs
for (const word of [...PLACES, ...NAMES]) {
  SLUGS.add(word);
}

// Also try name-tech combos for shorter names
const SHORT_NAMES = NAMES.filter(n => n.length <= 5);
for (const name of SHORT_NAMES.slice(0, 50)) {
  SLUGS.add(name + '-ai');
  SLUGS.add(name + '-io');
  SLUGS.add(name + '-labs');
}

const slugArray = [...SLUGS];
console.log(`Generated ${slugArray.length} candidate slugs\n`);

// ============================================================
// ATS SCRAPING + APIs (same pattern as previous waves)
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
  // Jobicy
  const tags = ['react','typescript','node','fullstack','python','javascript','frontend','backend','golang','rust','java','aws','docker','kubernetes','ai','llm','devops','cloud','mobile','web','security','blockchain','fintech','saas','remote'];
  const seen = new Set();
  for (const tag of tags) {
    const d = await fetchJSON(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${tag}`, 8000);
    if (!d?.jobs) continue;
    for (const j of d.jobs) { if (seen.has(j.id)) continue; seen.add(j.id); all.push({ company: j.companyName, role: j.jobTitle, url: j.url, atsType: 'custom', location: j.jobGeo || 'Remote' }); }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`  ✅ Jobicy: ${all.length} jobs`);
  // RemoteOK
  try {
    const rok = await fetchJSON('https://remoteok.com/api', 15000);
    if (Array.isArray(rok)) { const jobs = rok.filter(j => j.position && j.company && j.url).map(j => ({ company: j.company, role: j.position, url: j.url.startsWith('http') ? j.url : `https://remoteok.com${j.url}`, atsType: 'custom', location: j.location || 'Remote' })); all.push(...jobs); console.log(`  ✅ RemoteOK: ${jobs.length} jobs`); }
  } catch { console.log('  ⚠️ RemoteOK: failed'); }
  // WWR
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
  // Arbeitnow
  try {
    for (let page = 1; page <= 5; page++) {
      const d = await fetchJSON(`https://www.arbeitnow.com/api/job-board-api?page=${page}`, 10000);
      if (!d?.data?.length) break;
      all.push(...d.data.filter(j => j.remote === true).map(j => ({ company: j.company_name, role: j.title, url: j.url, atsType: 'custom', location: j.location || 'Remote' })));
    }
    console.log(`  ✅ Arbeitnow: scraped`);
  } catch {}
  return all;
}

async function main() {
  console.log('🔍 WAVE 16 — Places + Names + Latin combos + Product prefixes\n');
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
