/**
 * scrape-wave19.mjs — WAVE 19: Two-word hyphen combos (adjective-noun, verb-noun)
 * 
 * Strategy:
 * 1. Adjective-noun pairs (bright-data, clear-bit, etc.)
 * 2. Verb-noun pairs (snap-logic, pay-fit, hire-vue, etc.)  
 * 3. Noun-noun pairs (cloud-flare, data-dog, etc.)
 * 4. Word + "ly" / "fy" / "io" / "ai" suffixes
 * 5. Job board APIs for fresh postings
 */

import { writeFileSync, readFileSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave19-jobs.json';
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

// Adjective-noun hyphenated pairs
const ADJECTIVES = [
  'able','active','agile','alpha','apt','astral','atomic','bare','beta','big',
  'blazing','blue','bold','brief','broad','calm','clean','clear','clever',
  'cool','cosmic','crisp','cross','dark','deep','dense','digital','double',
  'dual','easy','edge','eight','elastic','emerald','epic','equal','ever',
  'exact','extra','fair','fast','finer','first','flat','fleet','fluid',
  'focal','free','fresh','front','full','giant','global','golden','good',
  'grand','great','green','half','happy','hard','heavy','higher','honest',
  'hyper','ideal','inner','ionic','keen','kind','laser','lean','light',
  'live','local','long','loud','lunar','magic','main','major','mega',
  'merry','micro','mighty','mini','modern','mono','multi','native','near',
  'neat','noble','north','novel','omega','open','outer','over','own',
  'pale','peak','pixel','plain','polar','prime','proper','proto','pure',
  'quick','quiet','rapid','rare','raw','ready','real','red','rich',
  'right','rising','royal','safe','same','second','sharp','short','silent',
  'silver','simple','single','slim','smart','smooth','snap','soft','solar',
  'solid','sonic','south','stable','stark','steady','steel','steep','still',
  'strong','super','sure','sweet','swift','tall','tame','tender','thin',
  'third','tight','tiny','top','total','tough','true','twin','ultra',
  'under','upper','valid','vast','vital','vivid','warm','white','whole',
  'wide','wild','wise','zero',
];

const TECH_NOUNS = [
  'arc','atom','axis','band','bank','base','beam','bell','bend','bird',
  'blade','blast','blaze','block','board','bond','bone','boot','boss',
  'bound','brain','brand','brick','byte','cage','camp','card','cart',
  'case','cast','cell','chain','chart','chip','claim','class','click',
  'cliff','clock','cloud','coat','code','coil','coin','cone','core',
  'craft','crane','crate','crew','cross','crown','cube','curve','cycle',
  'dart','dash','dawn','deck','dial','disk','dome','door','dose','down',
  'draw','drop','drum','dust','earth','edge','face','fact','farm','feed',
  'file','film','fire','flag','flame','flash','flock','floor','flow',
  'foam','fold','font','force','forge','form','fort','frame','front',
  'fuel','fund','fuse','gain','game','gate','gauge','gear','glass',
  'globe','glow','glue','gold','gorge','grab','grade','grain','graph',
  'grasp','grid','grip','grove','guard','guide','hack','hall','hand',
  'hatch','hawk','heap','heart','helm','hill','hinge','hold','hole',
  'hook','horn','house','hunt','index','isle','jack','jump','keep',
  'king','knot','lace','lamp','land','lane','latch','layer','lead',
  'leaf','lens','level','lever','lift','light','limb','line','link',
  'list','load','lock','loft','logic','loop','loom','lore','mail',
  'maker','manor','mark','marsh','mask','match','maze','mesh','mill',
  'mind','mine','mint','mode','model','mold','mount','mouth','muse',
  'nail','nerve','nest','node','north','note','notch','ocean','office',
  'orbit','order','oven','pack','page','paint','palm','panel','park',
  'pass','patch','path','peak','pearl','pick','pier','pile','pilot',
  'pine','pipe','pitch','pixel','place','plan','plant','plate','play',
  'plaza','plot','plug','plume','point','pole','poll','pond','pool',
  'port','post','power','press','price','print','prize','probe','proof',
  'prose','pulse','pump','push','quest','queue','quote','rack','rail',
  'range','rank','rate','reach','realm','reef','reign','relay','ridge',
  'ring','rise','river','road','rock','roof','room','root','rope',
  'route','rule','sail','salt','sand','scale','scan','scene','scope',
  'score','scout','seal','seed','sense','serve','shade','shaft','shape',
  'share','shell','shield','shift','ship','shore','show','side','siege',
  'sight','sign','silk','site','skill','slate','slice','slide','slope',
  'slot','smith','smoke','snake','snap','snow','soil','sort','sound',
  'south','space','span','spark','spear','speed','sphere','spike','spine',
  'spoke','spot','spring','squad','stack','staff','stage','stake','stamp',
  'stand','star','state','steam','steel','stem','step','stick','still',
  'stock','stone','store','storm','strand','stream','street','strike',
  'strip','stroke','suite','surge','swarm','sweep','sword','tail','tank',
  'tape','task','team','tempo','tent','term','test','theme','tide',
  'tier','tiger','tile','timber','token','tool','torch','touch','tower',
  'trace','track','trade','trail','train','trait','trap','trend','tribe',
  'trick','trust','tube','tune','valve','vault','vector','veil','verse',
  'vigor','vine','vision','voice','wall','ward','watch','water','wave',
  'web','wedge','wheel','wick','width','wind','wing','wire','wish',
  'wolf','wood','work','world','worth','wrap','yard','yield','zone',
];

// Generate adjective-noun pairs (sampling to keep slug count manageable)
const sampledAdj = ADJECTIVES.filter((_, i) => i % 3 === 0); // every 3rd
const sampledNouns = TECH_NOUNS.filter((_, i) => i % 5 === 0); // every 5th
for (const adj of sampledAdj) {
  for (const noun of sampledNouns) {
    SLUGS.add(`${adj}-${noun}`);
  }
}

// Verb-noun pairs
const TECH_VERBS = [
  'align','apply','back','bind','blend','blitz','bloom','bolt','boost',
  'break','bring','build','burn','buzz','call','camp','carry','cast',
  'catch','chain','charge','check','chip','chop','claim','clamp','clash',
  'clasp','claw','clear','click','climb','clip','clock','clone','close',
  'coast','code','coil','coin','color','command','compile','compress',
  'config','connect','control','convert','cook','copy','count','cover',
  'crack','craft','crash','crawl','cross','crush','cure','curl','dash',
  'deal','debug','decode','deploy','detect','dial','direct','dock',
  'double','draft','draw','dream','drift','drill','drive','drop','dump',
  'earn','edit','eject','emit','encode','engage','enter','equip','erase',
  'escape','evolve','expand','export','extract','feed','fetch','file',
  'fill','filter','find','fire','fit','fix','flag','flame','flash',
  'flex','flick','flip','float','flock','flood','flush','fly','focus',
  'fold','follow','force','forge','fork','form','forward','frame','freeze',
  'fuel','fuse','gain','gather','gauge','gear','get','give','glide',
  'glow','go','grab','grant','grasp','grind','grip','ground','group',
  'grow','guard','guide','hack','halt','hand','handle','hang','harbor',
  'haul','head','heat','help','hide','hike','hitch','hold','hook',
  'hop','host','hunt','hurl','hustle','ignite','import','index','input',
  'insert','inspect','install','inter','invent','invest','invoke','iron',
  'jam','jolt','jump','keen','keep','kick','kindle','knit','knock',
  'know','label','land','latch','launch','lay','lead','lean','leap',
  'learn','lend','level','lever','lift','light','limit','line','link',
  'list','live','load','lock','log','look','loop','loom','lose','lower',
];

const PAIR_NOUNS = ['bit','bug','cast','code','coin','data','dev','door','eye','fire',
  'flow','fox','gate','gem','grid','hawk','hub','hunt','jet','key',
  'lab','lane','leaf','lens','link','lock','loom','mark','mesh','mind',
  'mode','net','node','note','ops','owl','pad','path','peak','pier',
  'plan','plug','pod','port','rack','rail','ray','ring','rock','root',
  'sail','sand','scan','seed','ship','sign','slot','snap','spot','star',
  'step','sync','tail','tank','task','team','test','tide','tool','tree',
  'tune','view','vine','ward','wave','web','well','wind','wire','wolf',
  'work','zone'];

// Sample verb-noun pairs  
const sampledVerbs = TECH_VERBS.filter((_, i) => i % 4 === 0);
const sampledPairNouns = PAIR_NOUNS.filter((_, i) => i % 3 === 0);
for (const verb of sampledVerbs) {
  for (const noun of sampledPairNouns) {
    SLUGS.add(`${verb}-${noun}`);
  }
}

// Word + suffix patterns
const SUFFIX_WORDS = ['bright','cloud','code','core','craft','data','deep','dev',
  'dock','drive','edge','fire','flex','flow','grid','guide','hack',
  'hawk','helm','hire','hive','hunt','hyper','iron','jump','keen',
  'kick','lab','land','launch','layer','lead','leaf','level','lift',
  'light','line','link','live','lock','logic','loop','loom','mark',
  'mesh','meta','mind','mode','nerve','nest','node','note','orbit',
  'pace','pack','page','path','peak','pilot','pipe','plan','play',
  'plot','plug','point','port','post','power','press','pulse','push',
  'quest','rack','rail','range','ray','reach','relay','ring','rise',
  'rock','root','route','rush','sail','scale','scan','scope','scout',
  'seal','seed','sense','serve','shade','shape','share','shelf','shift',
  'ship','show','sight','sign','site','skill','slate','slice','slide',
  'slope','smart','snap','solve','sort','sound','source','space','span',
  'spark','speed','spike','spot','spring','squad','stack','stage','stamp',
  'stand','star','state','steam','steel','step','stock','stone','store',
  'storm','stream','stride','string','strip','style','suite','surge',
  'sweep','swift','sync','tail','tank','task','team','tempo','test',
  'tide','tiger','tile','timber','token','tool','torch','touch','tower',
  'trace','track','trade','trail','tree','trend','tribe','trust','tube',
  'tune','vault','vector','verse','view','vine','vision','voice','ward',
  'watch','wave','web','wheel','wick','wind','wing','wire','wish',
  'wolf','wood','work','world','worth','wrap','yard','zone'];

const SUFFIXES = ['ly','fy','io','ai','hq','app','ify','ize'];
for (const w of SUFFIX_WORDS.slice(0, 50)) {
  for (const s of SUFFIXES) {
    SLUGS.add(w + s);
  }
}

const slugArray = [...SLUGS];
console.log(`Generated ${slugArray.length} candidate slugs\n`);

// ============================================================
// ATS SCRAPING + APIs (same as previous waves)
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
  console.log('🔍 WAVE 19 — Adj-Noun pairs + Verb-Noun pairs + Suffix combos\n');
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
