/**
 * scrape-wave22.mjs — WAVE 22: Exhaustive common English words as ATS slugs
 *
 * Strategy: Take the most common 4-8 letter English words and try them all.
 * Many tech companies use simple English words as names.
 * Also includes longer compound words and "-ly" pattern names.
 */

import { writeFileSync, readFileSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave22-jobs.json';
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
// SLUG GENERATION — Common English 4-8 letter words
// ============================================================

const SLUGS = new Set();

// Common English words that companies might use as names
const WORDS = [
  // 4-letter tech-adjacent
  'able','acre','aged','aide','ally','arch','area','army','auto','axle',
  'bale','band','bank','barn','base','bath','beam','bear','bell','belt',
  'bend','bike','bind','bird','bite','blog','blow','blur','boat','body',
  'bold','bolt','bomb','bond','bone','book','boom','boot','bore','boss',
  'bout','bowl','brag','brew','bulk','bump','burn','bush','busy','buzz',
  'cafe','cage','cake','calm','camp','cape','card','care','cart','case',
  'cash','cast','cave','cell','chat','chip','chop','cite','city','clad',
  'clan','clap','claw','clay','clip','clot','clue','club','coal','coat',
  'code','cog','coil','coin','cold','colt','comb','come','cone','cook',
  'cool','cope','copy','cord','core','cork','corn','cost','coup','cowl',
  'crab','crew','crop','crow','cube','cult','curb','cure','curl','cute',
  'dale','dame','damp','dare','dark','data','dawn','deal','dean','dear',
  'debt','deck','deed','deem','deep','deer','demo','deny','desk','dial',
  'dice','diet','dime','dine','dire','dirt','disc','dish','dock','dome',
  'done','doom','door','dose','dove','down','drag','drip','drop','drum',
  'dual','duck','duel','dune','dusk','dust','duty','dwell','dyed',
  'each','earl','earn','ease','east','easy','echo','edge','edit','envy',
  'epic','even','ever','evil','exam','exec','exit','expo','face','fact',
  'fade','fail','fair','fake','fall','fame','farm','fast','fate','fawn',
  'fear','feat','feed','feel','fern','file','fill','film','find','fine',
  'fire','firm','fish','flag','flat','flaw','fled','flew','flex','flip',
  'flit','flog','flow','foam','foil','fold','folk','fond','font','fool',
  'foot','ford','fore','fork','form','fort','foul','four','fowl','free',
  'frog','from','fuel','full','fund','fuse','fury','fuzz','gain','gait',
  'gala','gale','gall','game','gang','garb','gate','gave','gaze','gear',
  'gene','gift','gild','gilt','girl','gist','give','glad','glee','glen',
  'glib','glow','glue','gnat','gnaw','goal','goat','gold','golf','gone',
  'good','gore','grab','grit','grip','grow','gulf','gust','gaze',
  'hack','hail','hair','hale','half','hall','halt','hand','hang','hare',
  'hark','harm','harp','haze','head','heal','heap','hear','heat','heed',
  'heel','heir','held','helm','help','herb','herd','here','hero','hers',
  'hide','high','hike','hill','hilt','hind','hint','hire','hold','hole',
  'holy','home','hone','hood','hook','hope','horn','hose','host','hour',
  'howl','hubs','hued','huge','hull','hung','hunt','hurl','hymn',
  'icon','idle','inch','info','into','iris','iron','isle','item',
  'jack','jade','jail','jars','java','jazz','jest','join','joke','jolt',
  'jury','just','keen','keep','kelp','kept','kern','kick','kind','king',
  'kite','knack','knee','knit','knob','knot','know',
  'lace','lack','laid','lake','lamb','lamp','land','lane','lark','lash',
  'last','late','lawn','lead','leaf','leak','lean','leap','left','lend',
  'lens','lent','levy','liar','lick','lien','lieu','life','lift','like',
  'limb','lime','limp','line','link','lint','lion','list','live','load',
  'loaf','loan','lock','lode','loft','logo','long','look','loom','loop',
  'lore','lose','loss','lost','loud','love','luck','lump','lure','lurk',
  'lush','lust','lynx',
  'mace','made','maid','mail','main','make','male','malt','mane','many',
  'mare','mark','mars','mash','mask','mass','mast','mate','maze','mead',
  'meal','mean','meat','meet','meld','melt','memo','mend','menu','mere',
  'mesh','mess','mild','mile','milk','mill','mind','mine','mint','mire',
  'miss','mist','mite','moat','mock','mode','mold','molt','monk','mood',
  'moon','moor','more','moss','most','moth','move','much','mule','murk',
  'muse','must','mute',
  'nail','name','nape','near','neat','neck','need','nest','news','next',
  'nice','nick','nine','node','none','noon','norm','nose','note','noun',
  'null',
  'oath','obey','odds','odor','oink','once','only','onto','opal','open',
  'opts','oral','orca','oven','over','owed','owes','owns',
  'pace','pack','pact','page','paid','pail','pain','pair','pale','palm',
  'pane','park','part','pass','past','path','pave','pawn','peak','peal',
  'pear','peat','peek','peel','peer','pelt','pend','perk','pest','pick',
  'pier','pike','pile','pill','pine','pink','pipe','plan','play','plea',
  'plod','plot','plow','ploy','plug','plum','plus','pock','poem','poet',
  'pond','pool','poor','pope','pops','pore','pork','port','pose','post',
  'pour','pout','pray','prey','prod','prop','prow','pull','pulp','pump',
  'punk','pure','push',
  'quad','quay','quip','quit','quiz',
  'race','rack','raft','rage','raid','rail','rain','rake','ramp','rang',
  'rank','rant','rare','rash','rate','rave','rays','read','real','reap',
  'rear','reed','reef','reel','rein','rely','rend','rent','rest','rich',
  'ride','rift','rime','rind','ring','riot','ripe','rise','risk','rite',
  'road','roam','roar','robe','rock','rode','role','roll','roof','room',
  'root','rope','rose','rove','rude','ruin','rule','rung','ruse','rush',
  'rust',
  'sack','safe','sage','said','sail','sake','sale','salt','same','sand',
  'sane','sank','sash','save','scan','scar','seal','seam','seed','seek',
  'seen','self','sell','send','sent','sept','shed','shin','ship','shoe',
  'shop','shot','show','shut','sick','side','sift','sigh','sign','silk',
  'sill','silo','silt','sine','sing','sink','sire','site','size','slab',
  'slam','slap','sled','slid','slim','sling','slip','slit','slob','slot',
  'slow','slug','slum','slur','snap','snip','snow','soak','soap','soar',
  'sock','sofa','soft','soil','sold','sole','solo','some','song','soon',
  'soot','sore','sort','soul','soup','sour','span','spar','spec','sped',
  'spin','spit','spot','spur','stab','stag','star','stay','stem','step',
  'stew','stir','stop','stub','stud','suck','suit','sulk','sums','sung',
  'sunk','sure','surf','swap','swim','swop',
  'tack','tact','tail','take','tale','talk','tall','tame','tank','tape',
  'taps','task','taxi','teak','team','tear','tell','tend','tent','term',
  'test','text','than','them','then','thin','this','tick','tide','tidy',
  'tied','tier','tile','till','tilt','time','tiny','tire','toad','toil',
  'told','toll','tomb','tone','took','tool','tops','tore','torn','toss',
  'tour','tram','trap','tray','tree','trek','trim','trio','trip','trod',
  'trot','true','tube','tuck','tuft','tulip','tune','turf','turn','tusk',
  'twin','type',
  'ugly','undo','unit','unto','upon','urge','used','user',
  'vain','vale','vane','vary','vase','vast','veil','vein','vent','verb',
  'very','vest','vial','vice','view','vine','void','volt','vote','vowl',
  'wade','wage','wail','wait','wake','walk','wall','wand','want','ward',
  'warm','warn','warp','wary','wash','wasp','wave','wavy','waxy','weak',
  'weal','wear','weed','week','weep','weld','well','went','were','west',
  'whet','whim','whip','whom','wick','wide','wife','wild','will','wilt',
  'wily','wind','wine','wing','wink','wipe','wire','wise','wish','wisp',
  'with','woke','wolf','wood','wool','word','wore','work','worm','worn',
  'wove','wrap','wren',
  'yard','yarn','year','yell','yoga','yoke','your',
  'zany','zeal','zero','zinc','zone','zoom',
  // 5-8 letter words that are common company names
  'about','above','adapt','after','again','agent','agile','agree','alarm',
  'alert','align','alive','allow','alone','alter','angel','angle','anvil',
  'apply','arena','armor','array','arrow','asset','atlas','audio','audit',
  'award','badge','basic','batch','beach','bench','berry','blend','bless',
  'block','bloom','board','bonus','booth','bound','boxer','brace','brain',
  'brand','brave','break','brick','brief','bring','broad','brook','brush',
  'buddy','build','burst','cabin','cable','cache','camel','candy','cargo',
  'carry','cedar','chain','chair','chalk','charm','chart','chase','cheap',
  'check','chess','chief','child','chill','chord','chunk','civic','claim',
  'clash','class','clean','clear','clerk','click','climb','clock','clone',
  'close','cloth','cloud','coach','coast','color','comma','coral','count',
  'court','cover','craft','crane','crash','cream','creek','crest','crime',
  'cross','crowd','crown','crush','curve','cycle','dairy','dance','darts',
  'debut','decor','delay','delta','dense','depot','derby','draft','drain',
  'dream','dress','drill','drink','drive','drone','dwarf','eager','early',
  'earth','eight','elite','ember','empty','equal','equip','error','essay',
  'event','every','exact','exile','extra','fable','facet','faith','fancy',
  'feast','fence','fiber','field','fifth','fight','final','flame','flash',
  'fleet','flesh','flint','float','flock','flood','floor','flora','flour',
  'fluid','flute','focal','focus','force','forge','forum','found','frame',
  'frank','fresh','front','frost','fruit','gauge','ghost','giant','given',
  'glade','glare','glass','gleam','glide','globe','gloss','glyph','going',
  'grace','grade','grain','grand','grant','grape','graph','grasp','grass',
  'grave','graze','great','green','greet','grief','grill','grind','gripe',
  'grove','grown','guard','guess','guest','guide','guild','habit','handy',
  'happy','haven','hazel','heart','helix','hence','heron','hoist','honey',
  'horse','hotel','hover','human','humid','hyper','ideal','image','imply',
  'inbox','index','indie','inner','input','intro','ivory','judge','juice',
  'knack','knelt','knock','known','label','lance','large','laser','latch',
  'later','laugh','layer','learn','lease','ledge','legal','level','lever',
  'light','linen','llama','local','lodge','logic','lotus','lower','lucid',
  'lunar','lunch','major','maker','manor','maple','march','match','maybe',
  'mayor','medal','media','mercy','merge','merit','metal','meter','might',
  'mimic','minor','model','money','moose','moral','motor','mound','mount',
  'mouse','mouth','mural','music','nerve','never','noble','noise','north',
  'notch','novel','nurse','ocean','occur','offer','olive','onset','opera',
  'orbit','order','organ','other','outer','owner','oxide','ozone','paint',
  'panel','paper','parse','party','paste','patch','pause','pearl','penny',
  'petal','phase','phone','photo','piano','piece','pilot','pinch','pixel',
  'place','plain','plane','plant','plate','plaza','plead','plumb','plume',
  'point','polar','porch','pound','power','press','price','pride','prime',
  'print','prior','prize','probe','proof','prose','proud','prove','proxy',
  'pulse','punch','pupil','purse','quake','queen','query','quest','queue',
  'quick','quiet','quota','quote','radar','radio','raise','rally','ranch',
  'range','rapid','ratio','reach','ready','realm','rebel','refer','reign',
  'relax','relay','renew','reply','rider','ridge','rifle','right','rigid',
  'risky','rival','river','robin','robot','rocky','rouge','round','route',
  'royal','ruler','rumor','rural','salad','sandy','sauce','scale','scene',
  'scent','scope','score','scout','sense','serve','shade','shaft','shake',
  'shame','shape','share','shark','sharp','shave','shelf','shell','shift',
  'shine','shirt','shock','shore','short','shout','shrub','sight','sigma',
  'since','sixth','sixty','sized','skill','skull','slate','sleep','slice',
  'slide','slope','smart','smell','smile','smoke','snack','solar','solid',
  'solve','sonic','south','space','spare','spark','speak','speed','spell',
  'spend','spice','spike','spine','spoke','sport','spray','squad','stack',
  'staff','stage','stain','stake','stall','stamp','stand','stark','start',
  'state','stave','stays','steam','steel','steep','steer','stern','still',
  'stock','stone','stool','store','storm','story','stove','strap','straw',
  'stray','strip','strum','stuck','study','stuff','stump','style','sugar',
  'suite','super','surge','swamp','swarm','sweep','sweet','swift','swing',
  'sword','taken','taste','teach','tempo','thank','theft','theme','thick',
  'thing','think','third','thorn','those','three','threw','throw','thumb',
  'tiger','tight','timer','title','token','torch','total','touch','tough',
  'tower','toxic','trace','track','trade','trail','train','trait','tramp',
  'trash','tread','treat','trend','trial','tribe','trick','troop','truck',
  'truly','trunk','trust','truth','tulip','twice','twist','ultra','uncle',
  'under','union','unite','unity','until','upper','upset','urban','usage',
  'usual','utter','valid','valor','value','vapor','vault','verse','vigor',
  'viral','visit','vivid','vocal','voice','voter','watch','water','weave',
  'wedge','weigh','whale','wheat','wheel','where','which','while','white',
  'whole','whose','width','witch','world','worry','worse','worst','worth',
  'wound','wreck','yield','young','youth',
];

for (const w of WORDS) SLUGS.add(w);

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
  const tags = ['react','typescript','node','fullstack','python','javascript','frontend','backend','golang','rust','java','aws','docker','kubernetes','ai','llm','devops','cloud','mobile','web','security','blockchain','fintech','saas','remote','machine-learning','data-engineering','ios','android','ruby','rails','vue','angular','svelte','nextjs','graphql','terraform'];
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
  console.log('🔍 WAVE 22 — Common English words as ATS slugs\n');
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
