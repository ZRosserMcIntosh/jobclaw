/**
 * scrape-wave13.mjs — WAVE 13: Hyphenated compounds + Real company directories
 * 
 * Strategy:
 * 1. Hyphenated two-word slug combos (word1-word2 patterns)
 * 2. Known tech companies from Crunchbase-style naming
 * 3. Fortune/Forbes tech lists naming patterns  
 * 4. Geographic tech hub companies
 * 5. Additional niche job APIs
 */

import { writeFileSync, readFileSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave13-jobs.json';
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

// High-value first words in tech company names
const FIRST = [
  'abstract','active','agile','alpha','apex','arctic','atlas','atomic',
  'basis','beacon','beta','binary','bloom','bold','bridge','bright',
  'carbon','cascade','cedar','chain','cipher','civic','clear','climb',
  'cobalt','comet','common','compass','copper','coral','crest','crown',
  'crystal','current','curve','dawn','delta','dense','detect','devote',
  'double','drone','dusk','dynamo','echo','element','elite','ember',
  'emerge','enable','envision','epoch','equal','eternal','euler','evolve',
  'exact','exceed','falcon','fiber','field','finite','flare','fleet',
  'float','focus','forge','found','frame','frost','fusion','gamma',
  'gather','general','giant','glacier','glow','golden','granite','gravity',
  'green','grove','harbor','harvest','haven','helix','heron','hidden',
  'hollow','honey','horizon','humble','ignite','image','impact','index',
  'indigo','infinite','inner','inspire','invoke','island','ivory','jasper',
  'kite','lantern','lattice','launch','lava','layer','legacy','level',
  'liberty','light','linear','lively','logic','lunar','lyric','magnet',
  'maple','marble','matter','medium','mental','mercury','method','metric',
  'micro','middle','mighty','mineral','mirror','modern','moment','motion',
  'mountain','multiply','native','natural','nebula','nimble','noble','notion',
  'nucleus','number','ocean','olive','omega','onward','optimal','orange',
  'orbital','origin','osprey','outer','outpost','oxide','pacific','panda',
  'paper','parallel','particle','pattern','pebble','phoenix','pine','pivot',
  'planet','plasma','plaza','pluto','pocket','polaris','polygon','portal',
  'praxis','presto','prism','proton','purple','quartz','radar','radius',
  'rally','raven','realm','rebel','redwood','reflex','regal','relay',
  'render','resolve','reveal','rhythm','ridge','ripple','river','robin',
  'rocket','rover','royal','rubric','runway','rustic','sable','safari',
  'sage','saturn','scalar','scout','sentry','sequel','seven','shadow',
  'sierra','sigma','silk','simpl','sketch','slate','solar','sonar',
  'sphere','spiral','spruce','stable','stellar','stitch','storm','strata',
  'summit','surge','symbol','synth','tactic','talon','temple','tensor',
  'terra','theta','timber','titan','topaz','torch','trace','transit',
  'traverse','tropic','turbo','twilight','union','upper','urban','valor',
  'vector','velvet','venture','vertex','violet','virtual','vision','vivid',
  'vortex','voyage','walnut','warden','whisper','widget','willow','wisdom',
  'wonder','zenith','zephyr',
];

// High-value second words
const SECOND = [
  'ai','analytics','api','app','arc','arena','base','bay','beam','bear',
  'berry','bit','block','bloom','blue','board','bolt','bond','book','boost',
  'born','bound','bow','brain','bridge','bug','byte','cap','care','cast',
  'chain','check','chip','circle','city','claim','class','click','clip',
  'cloud','cluster','co','code','coin','core','craft','creek','crew','cross',
  'cube','data','deck','deep','den','dev','digital','dock','dome','drive',
  'drop','dust','dynamics','edge','effect','element','energy','engine',
  'eye','factor','fall','farm','fast','feed','field','file','fin','fire',
  'fish','fit','five','flag','flame','flash','flat','fleet','flex','flight',
  'flip','float','flow','fly','focal','fold','force','forge','form','fort',
  'fox','frame','front','fuel','fund','gate','gem','gen','ghost','gift',
  'glow','goal','gold','grade','graph','green','grid','grip','group',
  'grove','guard','guide','guru','hack','hall','harbor','hat','hawk','heap',
  'helm','hero','hive','hook','hop','host','hub','hunt','hut','inc',
  'insight','io','jack','jar','jet','joy','jump','keep','key','kick',
  'kit','lab','lake','lamp','land','lane','lark','launch','lead','leaf',
  'lens','lever','lift','light','lime','line','link','lion','list','live',
  'lock','loft','logic','loop','lore','lot','lynx','maker','map','mark',
  'mart','mate','max','media','mesh','mill','mind','mine','mint','mist',
  'mix','mode','monk','moon','motion','muse','nail','nest','net','nine',
  'node','note','nova','now','oak','one','ops','orbit','os','owl',
  'pack','pad','pane','park','pass','patch','path','pay','peak','pier',
  'pilot','pin','pipe','pixel','place','plan','plate','play','plot',
  'plug','plus','pod','point','pool','port','post','power','press','print',
  'probe','proof','prop','pulse','push','quest','rack','raft','rail',
  'rain','ram','range','rank','ray','realm','reef','reel','ridge','rift',
  'rim','ring','rise','road','rock','rod','room','root','rope','row',
  'run','rush','sail','sand','saw','scale','scope','sea','seal','seed',
  'sense','serve','set','shade','shard','shed','shelf','shell','shield',
  'shift','ship','shop','shore','shot','side','sight','sign','silk','silo',
  'sky','slab','slate','slice','slot','smith','snap','soil','sort','sound',
  'space','span','spark','spec','sphere','spike','spin','spoke','spot',
  'spring','spur','square','stack','stage','stake','star','stem','step',
  'stick','stone','store','storm','strand','strap','stream','stride','strip',
  'strong','studio','suite','sun','surf','surge','swan','sweep','sync',
  'systems','tail','tank','tap','task','team','tech','test','text','tide',
  'tier','tile','timber','tip','token','tone','tool','top','torch','tower',
  'trace','track','trail','trap','tree','trend','tribe','trim','tron',
  'trove','true','trunk','tube','tune','turn','vault','veil','vent','verse',
  'vest','view','vine','vista','void','volt','ward','ware','watch','wave',
  'way','weave','web','well','west','wheel','whirl','wick','wind','wing',
  'wire','wise','wolf','wood','works','world','wrap','yard','yoke','zone',
];

// Generate hyphenated combos: pick smart pairings
// Focus on adj/verb + noun patterns that real companies use
const TECH_FIRSTS = [
  'abstract','active','agile','alpha','apex','atlas','atomic','basis',
  'beacon','beta','bright','carbon','cascade','cedar','chain','cipher',
  'civic','clear','cobalt','comet','compass','copper','coral','crystal',
  'current','dawn','delta','detect','double','echo','element','ember',
  'enable','envision','equal','evolve','falcon','fiber','finite','flare',
  'fleet','forge','found','frame','frost','fusion','gamma','gather',
  'glacier','golden','granite','gravity','green','grove','harbor','harvest',
  'haven','helix','hidden','hollow','horizon','humble','ignite','impact',
  'index','indigo','infinite','inner','inspire','invoke','ivory','jasper',
  'kite','lantern','lattice','launch','lava','layer','legacy','level',
  'liberty','light','linear','logic','lunar','lyric','magnet','maple',
  'marble','matter','medium','mercury','method','metric','mirror','modern',
  'moment','motion','mountain','native','nebula','nimble','noble','notion',
  'nucleus','ocean','olive','omega','onward','optimal','orange','orbital',
  'origin','osprey','outer','oxide','pacific','panda','parallel','particle',
  'pattern','pebble','phoenix','pine','pivot','planet','plasma','pocket',
  'polaris','portal','prism','proton','purple','quartz','radar','radius',
  'rally','raven','realm','rebel','redwood','reflex','relay','render',
  'resolve','reveal','rhythm','ridge','ripple','river','robin','rocket',
  'rover','royal','runway','sable','safari','sage','saturn','scalar',
  'scout','sentry','sequel','seven','shadow','sierra','sigma','silk',
  'simpl','sketch','slate','solar','sonar','sphere','spiral','spruce',
  'stable','stellar','stitch','storm','strata','summit','surge','symbol',
  'synth','tactic','talon','temple','tensor','terra','theta','timber',
  'titan','topaz','torch','trace','transit','tropic','turbo','twilight',
  'union','upper','urban','valor','vector','velvet','venture','vertex',
  'violet','virtual','vision','vivid','vortex','voyage','walnut','warden',
  'whisper','widget','willow','wisdom','wonder','zenith','zephyr',
];

const TECH_SECONDS = [
  'ai','analytics','api','app','base','beam','bit','block','board','bolt',
  'brain','bridge','byte','chain','check','chip','cloud','cluster','code',
  'core','craft','dash','data','deck','deep','dev','dock','drive','drop',
  'edge','engine','eye','farm','field','fire','fleet','flex','flip','flow',
  'fly','forge','frame','front','gate','gem','ghost','glow','graph','grid',
  'grip','guard','guide','hawk','heap','helm','hero','hive','hook','hop',
  'host','hub','hunt','io','jet','key','kit','lab','lane','layer','leaf',
  'lens','light','line','link','lock','loft','logic','loop','mesh','mill',
  'mine','mint','mist','mode','moon','moss','muse','nest','net','node',
  'note','ops','orbit','owl','pad','path','peak','pier','pilot','pipe',
  'pixel','play','plug','point','pool','port','press','print','probe',
  'pulse','push','quest','rack','raft','rail','ray','reef','ring','rise',
  'rock','root','sail','sand','scale','scope','seal','seed','sense','shard',
  'shelf','shell','shield','shift','shore','sight','sign','silk','silo',
  'slate','slice','smith','snap','sort','source','space','spark','spec',
  'spike','spoke','spot','spring','stack','stage','stake','star','stem',
  'step','stick','stone','store','storm','stream','stride','strip','suite',
  'surge','sweep','sync','tail','tank','tap','task','team','tech','test',
  'text','tide','tier','tile','tip','token','tone','tool','top','tower',
  'trace','track','trail','tree','trend','tribe','trim','tron','trove',
  'trunk','tube','tune','turn','vault','verse','view','vine','vista',
  'void','volt','ward','ware','watch','wave','way','weave','web','well',
  'wheel','wick','wind','wing','wire','wise','wolf','works','wrap','yard',
  'zone',
];

// Generate hyphenated pairs (these are different from wave12 which did no-hyphen)
const SLUGS = new Set();

// Smart hyphenated combos — pick ~3000 most likely
const TOP_FIRSTS = TECH_FIRSTS.slice(0, 60);
const TOP_SECONDS = TECH_SECONDS.slice(0, 60);

for (const a of TOP_FIRSTS) {
  for (const b of TOP_SECONDS) {
    if (a !== b) SLUGS.add(`${a}-${b}`);
  }
}

// Additional known real companies not yet tried (researched from LinkedIn, Glassdoor, etc.)
const REAL_COMPANIES = [
  // SaaS/Cloud companies
  'accel-robotics','acquia','addepar','aha','airgap','airtable','akka',
  'alcide','aleph-zero','algosec','altair','anchore','angi','anomali',
  'aporeto','appfire','applause','applovin','appsmith','aqua-security',
  'arcadia','argyle','armor','armory','artsy','assembly','astro-digital',
  'attentive','automox','avanade','aviatrix','axiom','backblaze',
  'baton-systems','bazaarvoice','beam-dental','beekeeper','bill-com',
  'billfire','bird-rides','blackline','blend','block-fi','bluevoyant',
  'bombora','bonfire','boosted','brainly','branch','brave','breeze',
  'brightflag','britive','buildium','bungie','button','cais',
  'calm','candid','capacitor','capsule','cargurus','carta','cedar-ai',
  'centercode','cerebral','chainalysis','channelmix','chargify','checkout',
  'chorus','chronosphere','cin7','citrix','clearbit','clockwise',
  'cloudflare','coalfire','codefresh','cofactor','cognizant','cohesity',
  'cohesion','collectly','column-tax','commerce-tools','compstak',
  'conductor','confluent','contentstack','continual','contrast-security',
  'conviva','cortica','couchbase','crafton','crisp','crossbeam',
  'crowdtap','crunchbase','curated','customer-io','cyberhaven',
  'cybereason','cypress','d2iq','dashboard','databricks','dataiku',
  'dataminr','datavisor','dayforce','deepwatch','definitive-logic',
  'demandbase','demostack','density','descartes','desert-lion',
  'devada','devsisters','digital-ocean','digital-river','divvy',
  'docusign','dolby','doordash','doximity','dremio','drivewealth',
  'dropship','duolingo','ebanx','ecobee','edcast','eightfold',
  'emburse','emerge-interactive','emissary','enigma','enverus',
  'episode-six','equal-experts','equilibrium','everly-health',
  'everquote','evident','evolent','exabeam','exclaimer',
  'expanse','expel','extreme-networks','fabric','factset','fair-square',
  'fastly','featured','fieldwire','figma','final','finch','fintual',
  'first-resonance','five9','fiveable','fivetran','fix-health',
  'flat','flexport','flock-safety','flutterwave','focal-point',
  'folio','forgerock','formstack','forward','foundry','foxglove',
  'fractal','freshpet','fullstory','galactica','garner-health',
  'genies','geomagical','ghost-autonomy','ginkgo','gladly','glass-box',
  'globalization-partners','glomex','gorilla-logic','government',
  'gpt','gradle','grafana-labs','grain','graphite','greenbiz',
  'greenhouse-software','grip-security','grist','grove-collaborative',
  'growth-loop','guideline','gusto','habito','happy-cog','harbor',
  'healthie','heartflow','heron-data','hightouch','hivemq','holdex',
  'holistic-ai','homebase','honest','hoodoo','horizon-robotics',
  'housecanary','humi','hypercontext','ibotta','ice-cream','ideal',
  'illuminate','imprint','incode','indeed','index-exchange','indico',
  'inflection','infralight','innovid','insightly','integral-ad',
  'integration','intellicheck','intercom','interior-define',
  'internalio','invert','io-global','iovation','iron-mountain',
  'iterable','ivalua','jellysmack','jetbrains','joby-aviation',
  'junction','jupiterone','juul','kaltura','karat','keeper',
  'kensho','ketch','kickstarter','kinaxis','kinetic','kion',
  'klue','knack','knowbe4','kolide','konnect','kount',
  'kustomer-inc','lark','launchable','leanix','lemma','lemonade',
  'liftoff','lightstep','lime','limeade','linework','lithic',
  'logdna','logz','lookout','loop-returns','lucidworks','luxe',
  'machine-zone','maestro','magicleap','mailgun','mainstreet',
  'makerbot','malwarebytes','manifold','mapbox','marqeta',
  'mattermost','mavenlink','mealpal','measurabl','meetup',
  'melio','membrane','meta-networks','metabase','metaphor',
  'metrist','mighty-networks','millennium','mimecast','mixmax',
  'modern-health','modern-treasury','molecule','monetize',
  'moonfare','mosaic','mouser','mparticle','multi-media',
  'mural','mushroom','mutiny','narrative','navan','nearmap',
  'nectar','netdata','netlify','netomi','neuralink','neustar',
  'next-insurance','nextgen','nextroll','niche','nightfall-ai',
  'nimble-robotics','noom','noredink','notarize','nubank',
  'nuro','observe','okcupid','okta','olive-ai','omnidian',
  'ontra','openphone','opensea','operant','opposable',
  'orca-security','ordermark','osmosis','overhaul','overstory',
  'ownbackup','oxio','oye-hoye','palantir','palo-alto',
  'pandadoc','paperless-post','parabol','paragon','particle',
  'patchstack','pathlight','patron','pave-inc','paycor',
  'peach-finance','peloton','pendo','pennylane','percept',
  'periscope-data','petcube','phreesia','pier','pine-labs',
  'pivotal','pixie','placer','planful','plangrid','plot',
  'pocketed','podium','postscript','pour-me-coffee','powerrev',
  'praetorian','precision','primacy','primer','privacera',
  'procore','productsup','profitwell','project44','proterra',
  'prove','provenance','proxima','pulley','puppet','purecloud',
  'quantiphi','quantum-metric','quarantine','querio','quilt',
  'quora','radical','rainfocus','rambus','rapyd','rattle',
  'reachout','realtyone','recidiviz','redfin','redpanda',
  'refine','registry','reliance','reltio','remitly','render-inc',
  'replicate','resolver','resource','retrium','revel',
  'reveal-security','ribbon-health','ridgeline','rightway',
  'ripjar','rivian','roadie','rockbot','rode','ronin',
  'root-insurance','roper','rosetta-stone','rothy','round',
  'rovio','rubicon','rula-health','safebase','safegraph',
  'salsify','sanctum','sanity','sauce-labs','savvy','scalyr',
  'scribe','scroll','securonix','seedfi','selfbook','sellics',
  'semgrep','seqera','sequel-io','setpoint','sharethrough',
  'shef','shellpoint','shift-technology','shopmonkey','sift',
  'signal-advisors','signifyd','sila','simpplr','simplisafe',
  'singular','sixfold','skydio','smartling','smartrent',
  'smith-ai','smokeball','snapdocs','snowplow','social-native',
  'socure','softchoice','solidus','solve','sonder','sorcero',
  'sourceday','spendesk','splice','spot-ai','spotdraft',
  'springbig','springboard','squarespace','stacker','stampli',
  'standard-ai','standvast','starling','starmind','statusbrew',
  'steer','step-finance','stoplight','stormforge','storydoc',
  'stratifyd','streamline','streaks','stride-health','string',
  'strivr','structure','stuzo','subsplash','sudowrite',
  'suger','sumologic','sundial','superb','superbloom',
  'surfline','surveymonkey','sustain','switchboard','symbl',
  'symmetry','synack','synapse','tabapay','tabular','tackle',
  'tailor-brands','tamr','tanium','tealium','teamsnap',
  'tenstorrent','testfit','textio','thankful','thesis',
  'thinkcyte','thirty-madison','thomasnet','thoropass',
  'thoughtful','tidelift','tigerconnect','tines','tonal',
  'torq','toybox','transcend','transfix','treasure-data',
  'treatwell','trellis','trella','tremendous','tresata',
  'tricentis','trivago','truewerk','trulioo','trustradius',
  'tumblr','turbonomic','turnstile','turo','turtl','twistlock',
  'unbabel','uniphore','unit-finance','untether','upkeep',
  'uplift','upstream-security','uptycs','urbantz','vail',
  'validere','valuize','vast-data','vena','venafi','verbit',
  'verdant','veriforce','veritas','versatile','vesta',
  'viable','vidyard','viewpoint','visier','vizient','vmware',
  'vonage-inc','voxel','vyond','walkme','warp','waymark',
  'webflow','wellthy','whatfix','whoop','wistia','workboard',
  'workrise','xactly','xometry','yalo','yext','zafran',
  'zenefits','zepto','zest-ai','ziprecruiter','zocdoc','zscaler',
];

for (const slug of REAL_COMPANIES) {
  SLUGS.add(slug);
}

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

// ============================================================
// Job board APIs (expanded)
// ============================================================

async function scrapeJobicy() {
  const tags = [
    'react','typescript','node','fullstack','python','javascript',
    'frontend','backend','golang','rust','java','aws','docker','kubernetes',
    'nextjs','vue','angular','graphql','machine-learning','ai','llm',
    'ruby','php','scala','ios','android','security','cloud','devops',
    'data-science','product','design','ux','mobile','web','api',
    'microservices','serverless','terraform','linux','sql','nosql',
    'redis','kafka','spark','hadoop','airflow','dbt','analytics',
    'crypto','blockchain','defi','web3','nft','smart-contracts',
    'fintech','healthtech','edtech','saas','startup','remote',
    'senior','staff','principal','lead','manager','architect',
    'infrastructure','platform','reliability','observability',
    'embedded','firmware','hardware','robotics','computer-vision',
    'natural-language-processing','deep-learning','reinforcement-learning',
  ];
  const seen = new Set();
  const all = [];
  for (const tag of tags) {
    const d = await fetchJSON(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${tag}`, 8000);
    if (!d?.jobs) continue;
    for (const j of d.jobs) {
      if (seen.has(j.id)) continue;
      seen.add(j.id);
      all.push({
        company: j.companyName,
        role: j.jobTitle,
        url: j.url,
        atsType: 'custom',
        location: j.jobGeo || 'Remote',
      });
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
    const jobs = d
      .filter(j => j.position && j.company && j.url)
      .map(j => ({
        company: j.company,
        role: j.position,
        url: j.url.startsWith('http') ? j.url : `https://remoteok.com${j.url}`,
        atsType: 'custom',
        location: j.location || 'Remote',
      }));
    console.log(`  ✅ RemoteOK: ${jobs.length} jobs`);
    return jobs;
  } catch (e) {
    console.log(`  ⚠️ RemoteOK: failed`);
    return [];
  }
}

async function scrapeWWR() {
  const categories = [
    'remote-programming-jobs',
    'remote-full-stack-programming-jobs',
    'remote-devops-sysadmin-jobs',
    'remote-back-end-programming-jobs',
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
        const company = parts[0]?.trim() || 'Unknown';
        const role = parts.slice(1).join(':').trim() || title;
        all.push({ company, role, url: link, atsType: 'custom', location: 'Remote' });
      }
    } catch {}
  }
  console.log(`  ✅ WWR: ${all.length} jobs`);
  return all;
}

async function scrapeArbeitnow() {
  try {
    const all = [];
    for (let page = 1; page <= 3; page++) {
      const d = await fetchJSON(`https://www.arbeitnow.com/api/job-board-api?page=${page}`, 10000);
      if (!d?.data?.length) break;
      const jobs = d.data
        .filter(j => j.remote === true)
        .map(j => ({
          company: j.company_name,
          role: j.title,
          url: j.url,
          atsType: 'custom',
          location: j.location || 'Remote',
        }));
      all.push(...jobs);
    }
    console.log(`  ✅ Arbeitnow: ${all.length} remote jobs`);
    return all;
  } catch (e) {
    console.log(`  ⚠️ Arbeitnow: failed`);
    return [];
  }
}

async function scrapeHimalayas() {
  try {
    const all = [];
    const seen = new Set();
    for (let page = 1; page <= 10; page++) {
      const d = await fetchJSON(`https://himalayas.app/jobs/api?page=${page}&limit=50`, 10000);
      if (!d?.jobs?.length) break;
      for (const j of d.jobs) {
        const id = j.id || j.title + j.companyName;
        if (seen.has(id)) continue;
        seen.add(id);
        all.push({
          company: j.companyName,
          role: j.title,
          url: j.applicationUrl || j.url || `https://himalayas.app/jobs/${j.id}`,
          atsType: 'custom',
          location: 'Remote',
        });
      }
    }
    console.log(`  ✅ Himalayas: ${all.length} jobs`);
    return all;
  } catch (e) {
    console.log(`  ⚠️ Himalayas: failed`);
    return [];
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('🔍 WAVE 13 — Hyphenated Compounds + Real Companies + APIs\n');

  console.log('📡 Phase 1: ATS Board Scraping...');
  const [ashbyJobs, ghJobs, leverJobs] = await Promise.all([
    scrapeAshby(slugArray),
    scrapeGreenhouse(slugArray),
    scrapeLever(slugArray),
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
