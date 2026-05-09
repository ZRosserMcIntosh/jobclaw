/**
 * scrape-wave12.mjs — WAVE 12: MEGA EXPANSION
 * 
 * Strategy: 
 * 1. Two-word compound slugs (verb+noun, adj+noun patterns)
 * 2. Known YC/startup naming conventions
 * 3. Tech company name patterns (e.g., "datadog", "pagerduty")
 * 4. Workable ATS (new platform!)
 * 5. Expanded Jobicy coverage
 * 6. Himalayas.app API
 * 7. Remoteok API
 */

import { writeFileSync, readFileSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave12-jobs.json';
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
// SLUG GENERATION: Two-word compound patterns
// ============================================================

const PREFIXES = [
  'air','all','any','auto','back','base','bit','blue','bright','cloud',
  'code','core','cross','cyber','data','deep','dev','digi','dock','edge',
  'ever','fast','fire','flex','fly','forge','front','full','gate','go',
  'grid','hack','hash','hyper','info','inter','iron','jet','key','lab',
  'lead','lean','light','link','live','logic','main','map','max','meta',
  'mind','mix','mod','multi','net','new','next','no','north','nova',
  'null','omni','one','open','opt','out','over','pace','path','peak',
  'pixel','play','pod','point','poly','pop','post','power','pre','prime',
  'pro','pulse','pure','quick','rad','rapid','raw','ray','real','red',
  'relay','ring','rise','rocket','root','run','rush','safe','sage','salt',
  'scale','scan','seed','sense','set','sharp','shift','ship','side','signal',
  'silver','six','sky','slate','slide','smart','snap','sol','solid','source',
  'spark','spec','speed','spot','spring','square','stack','stage','stand','star',
  'step','stock','stone','stop','stream','stride','strong','sum','super','surge',
  'swift','sync','sys','tail','tap','target','team','tech','ten','terra',
  'think','thread','tier','time','token','tool','top','tower','track','trans',
  'tree','tri','true','trust','turn','twin','ultra','uni','up','velo',
  'venture','vibe','vine','vital','volt','wave','web','west','white','wide',
  'wild','wind','wing','wire','wise','work','zen','zero','zip','zone',
];

const NOUNS = [
  'base','beam','bench','bird','block','board','book','bot','box','bridge',
  'byte','cart','chain','check','chip','cite','claim','cloud','cluster','code',
  'compass','config','connect','console','craft','creek','crew','cube','dash',
  'deck','desk','dock','dome','door','dot','draft','drum','dust','engine',
  'eye','factor','farm','fence','field','file','fin','flag','flame','fleet',
  'flex','flip','float','floor','flow','fly','fog','fold','font','forge',
  'fork','fort','frame','front','fuel','fund','fury','gate','gem','genie',
  'ghost','glass','globe','gold','grain','graph','grid','grip','grove','guard',
  'guide','guru','gust','hall','harbor','hatch','hawk','heap','helm','hero',
  'hive','hold','hook','hop','horn','host','hub','hunt','hut','io',
  'jack','jar','jet','jewel','jolt','joy','keep','kernel','kick','kit',
  'knot','lab','lake','lamp','lance','lane','lark','latch','layer','leaf',
  'lens','lever','light','lime','line','lion','list','lock','loft','loop',
  'loom','lore','lot','lynx','mast','mate','maze','mesh','mill','mine',
  'mint','mist','mode','monk','moon','moss','muse','nail','nest','node',
  'note','oak','ops','orbit','owl','pad','pane','pass','patch','path',
  'paw','peak','pier','pike','pin','pipe','pit','plan','plate','play',
  'plot','plug','point','pool','port','post','press','print','probe','proof',
  'prop','pulse','pump','push','quest','rack','raft','rail','rain','ram',
  'range','rank','ray','reef','reel','ridge','rift','rim','ring','road',
  'rock','rod','room','root','rope','row','sail','sand','saw','scale',
  'scope','seal','seed','shard','shed','shelf','shell','shield','shift','shore',
  'sight','sign','silk','silo','slab','slate','slice','slot','smith','snap',
  'soil','sort','span','spark','spec','spike','spin','spoke','spool','spoon',
  'spot','spring','spur','stack','staff','stage','stake','star','stem','step',
  'stick','stitch','stone','store','storm','strand','strap','stream','stride',
  'strip','strong','stud','suite','surge','swan','sweep','tail','tank','tape',
  'test','thatch','tide','tier','tile','timber','tip','token','tone','torch',
  'tower','trace','track','trail','trap','tree','trend','tribe','trim','tron',
  'trove','trunk','tube','tuck','tune','turn','vault','veil','vent','verse',
  'vest','vine','vista','void','volt','ward','ware','watch','wave','way',
  'weave','well','wheel','whirl','wick','wind','wing','wire','wolf','works',
  'wrap','yard','yoke','zone',
];

// Generate two-word compounds (prefix+noun, no separator for slug)
const COMPOUND_SLUGS = new Set();
// Use a selection — not all 170*200 = 34000, pick smart combos
const HOT_PREFIXES = ['air','auto','cloud','code','data','deep','dev','edge','fast',
  'fire','go','grid','hyper','iron','lead','live','meta','net','next','open',
  'over','path','pixel','pop','pro','pulse','rapid','safe','scale','smart',
  'snap','spark','stack','stream','super','swift','sync','tech','true','up',
  'web','zero'];
const HOT_NOUNS = ['base','board','bot','box','bridge','chain','cloud','code','craft',
  'dash','deck','dock','dot','engine','farm','field','fire','fleet','flip',
  'flow','forge','gate','graph','grid','hawk','hero','hive','hook','hub',
  'hunt','io','jet','kit','lab','lane','layer','lens','light','line','link',
  'lock','loft','loop','mesh','mill','mint','mode','nest','node','ops',
  'pad','path','pipe','point','pool','port','print','pulse','quest','raft',
  'ray','reef','ring','rock','room','scale','scope','seed','sense','shard',
  'shelf','shield','shift','sight','sign','slate','snap','source','spark',
  'spot','stack','star','storm','stream','suite','surge','tail','tank','tape',
  'tide','tier','token','tower','trace','track','tree','tribe','trove','tune',
  'vault','verse','view','vine','vista','ward','ware','watch','wave','way',
  'well','wire','wolf','works','yard','zone'];

for (const p of HOT_PREFIXES) {
  for (const n of HOT_NOUNS) {
    if (p !== n && (p + n).length >= 5 && (p + n).length <= 20) {
      COMPOUND_SLUGS.add(p + n);
    }
  }
}

// Also add known real company slug patterns
const KNOWN_PATTERNS = [
  // Real startup names we haven't tried
  'algolia','amplitude','anchorage','appian','apptio','asana','atrium','aura',
  'bamboo','benevity','bettercloud','bigpanda','bird','bitrise','blameless',
  'bloomreach','bonsai','brex','calendly','camunda','canva','chainalysis',
  'chili-piper','chronosphere','clickup','clubhouse','cockroach','codepath',
  'cohere','contentful','contrast','cribl','crowdstrike','deel','degreed',
  'deliveroo','deputy','descript','dialpad','dispatch','ditto','docebo',
  'drata','drift','drizly','dropbox','druva','earnin','egnyte','elastic',
  'envoy','eppo','ethos','everlaw','eze','factorial','fauna','featurespace',
  'fivetran','forter','freshworks','frontegg','glia','grammarly','gremlin',
  'guide','guru','harness','hasura','heap','hive','honeycomb','hugging-face',
  'hygraph','incident','instana','jellyfish','justworks','kandji','kindbody',
  'kustomer','lacework','lattice','launchdarkly','leandata','litmus','lob',
  'lucid','luma','luminary','matillion','medallia','method','metorik','miro',
  'mixpanel','mode','monday','motive','movable-ink','mux','narrativ','nearform',
  'nerdwallet','newrelic','nightfall','notion','nova','o1labs','observiq',
  'olo','omada','onestream','openai','optimizely','order','orion','orum',
  'outreach','paddle','pagerduty','papaya','pave','permit','persona',
  'phenom','pilot','planetscale','plaid','platform','plume','polly',
  'prefect','productboard','propel','proton','pulumi','quantum','ramp',
  'rapid7','recurly','reforge','remote','replicated','retool','rewind',
  'ripple','riva','roam','rocket-money','rula','runway','safeguard',
  'scale-ai','scalepad','seatgeek','sendbird','sentry','shopify','shortcut',
  'sigma','signalfire','simpl','sinch','smartbear','smartsheet','snorkel',
  'snowflake','sourcegraph','splitgraph','split','sprout-social','statuspage',
  'stellar','storyblok','stord','stripe','sumo-logic','superside','syndio',
  'talon','taskrabbit','tenable','terminus','thinkific','thoughtspot','thumbtack',
  'toast','toggl','toptal','traceable','transcarent','truework','trustpilot',
  'twilio','twingate','typeform','upbound','upstream','vanta','vercel',
  'vimeo','vonage','weights-biases','whatnot','whimsical','wikimedia','workato',
  'workiva','wrike','xero','yugabyte','zapier','zendesk','zep','zipline',
  'zoominfo','zuora',
  // More: crypto/web3/fintech names
  'alchemy','aleo','aptos','arbitrum','avalanche','axelar','biconomy','bitgo',
  'blockchain','blockdaemon','blocknative','blueyard','celestia','chainsafe',
  'circle','coinbase','compound','consensys','cosmos','dapper','dfinity',
  'eigenlayer','ethena','exodus','figment','fireblocks','gauntlet','gitcoin',
  'gnosis','goldfinch','hedera','immutable','injective','iosg','jumpcrypto',
  'lido','lightspark','magic-eden','makerdao','monad','moonpay','moralis',
  'mysten','near','nexo','nillion','novu','offchain','osmosis','paradigm',
  'phantom','polygon','rainbow','rarimo','scroll','solana','starknet',
  'starkware','subspace','sui','sygnum','syndica','tenderly','thirdweb',
  'uniswap','wormhole','yuga','zetachain',
  // AI companies
  'adept','ai21','anduril','anthropic','arize','assemblyai','bardeen',
  'baseten','cerebras','chai','character-ai','clarifai','cleanlab','coactive',
  'cognition','core-ai','coreweave','cursor','dbt-labs','deepgram','deepmind',
  'deepset','determined-ai','diffbot','dust','embark','fal','forethought',
  'glean','gretel','huggingface','humanloop','instabase','jasper','kore-ai',
  'langchain','lancedb','lightning-ai','llamaindex','luminal','lyzr',
  'marqo','mem','mindsdb','mistral','modal','modular','moveworks','nomic',
  'numbers-station','onnx','outerbounds','perplexity','pinecone','predibase',
  'replit','roboflow','runway-ml','scale','snorkelai','stability',
  'together-ai','unstructured','vectara','wandb','weights-and-biases','zilliz',
  // DevTools/Infrastructure
  'airbyte','airplane','aiven','akita','amplication','argo','astro',
  'auth0','authzed','backstage','baton','bearer','biome','buf','buildkite',
  'bunny','bytebase','calcom','cape','chainguard','coder','codespaces',
  'convex','coolify','cosmos-db','dagger','dapr','depot','devrev',
  'devzero','doppler','earthly','encore','env0','fermyon','fig','flipt',
  'fly','flux','gadget','garden','gitpod','grafana','hasura','hatch',
  'infisical','inngest','instill','ionic','keel','knock','kubecost',
  'kubeshop','lago','liveblocks','localstack','logfire','mint-lang',
  'neon','nhost','nitric','northflank','nuxt','ockam','okteto','ory',
  'oso','otterize','parca','piksel','plane','plural','porter','posthog',
  'preflight','prisma','pulumi','qovery','railway','redpanda','render',
  'resend','restate','rivet','rocket','rome','rspack','rudderstack',
  'seedcase','sequel','shopify-dev','shuttle','sidekick','snyk','spacelift',
  'speakeasy','sqlc','sst','stackblitz','stainless','steadybit','steep',
  'stytch','superblocks','supertokens','tango','tbd','temporal','tigris',
  'timescale','tooljet','trigger-dev','trpc','turbo','turso','typesense',
  'unkey','upstash','val-town','vapor','wasp','weaviate','wundergraph',
  'xata','zed','zeebe',
];

for (const slug of KNOWN_PATTERNS) {
  COMPOUND_SLUGS.add(slug);
}

// Remove any already-tried slugs from previous waves (we'll just let blocklist handle dupes)
const slugArray = [...COMPOUND_SLUGS];
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
// NEW: Workable ATS 
// ============================================================

async function scrapeWorkable(slugs) {
  const jobs = [];
  let valid = 0;
  // Workable uses apply.workable.com/{slug} and has a JSON API
  for (let i = 0; i < slugs.length; i += 30) {
    const batch = slugs.slice(i, i + 30);
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        // Workable API endpoint
        const d = await fetchJSON(`https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`, 6000);
        if (!d?.jobs?.length) return [];
        valid++;
        return d.jobs
          .filter(j => isRemote(j.location || j.city))
          .map(j => ({
            company: d.name || guessCompany(slug),
            role: j.title,
            url: `https://apply.workable.com/${slug}/j/${j.shortcode}/`,
            atsType: 'workable',
            location: j.location || j.city || 'Remote',
          }));
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') jobs.push(...r.value);
    }
    process.stdout.write(`\r  Workable: ${Math.min(i+30, slugs.length)}/${slugs.length} (${valid} valid)`);
  }
  console.log(`\n  ✅ Workable: ${valid} valid boards`);
  return jobs;
}

// ============================================================
// NEW: Job board APIs
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
    // small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
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
    console.log(`  ⚠️ RemoteOK: failed (${e.message})`);
    return [];
  }
}

async function scrapeHimalayas() {
  try {
    // Himalayas.app has a public jobs API
    const pages = [1, 2, 3, 4, 5];
    const all = [];
    const seen = new Set();
    for (const page of pages) {
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
    console.log(`  ⚠️ Himalayas: failed (${e.message})`);
    return [];
  }
}

async function scrapeJobsCollider() {
  // Arbeitnow / remote jobs API
  try {
    const d = await fetchJSON('https://www.arbeitnow.com/api/job-board-api', 10000);
    if (!d?.data?.length) { console.log('  ⚠️ Arbeitnow: no data'); return []; }
    const jobs = d.data
      .filter(j => j.remote === true)
      .map(j => ({
        company: j.company_name,
        role: j.title,
        url: j.url,
        atsType: 'custom',
        location: j.location || 'Remote',
      }));
    console.log(`  ✅ Arbeitnow: ${jobs.length} remote jobs`);
    return jobs;
  } catch (e) {
    console.log(`  ⚠️ Arbeitnow: failed (${e.message})`);
    return [];
  }
}

async function scrapeWWR() {
  // We Work Remotely - scrape their programming category
  try {
    const html = await fetchText('https://weworkremotely.com/categories/remote-programming-jobs.rss', 10000);
    if (!html) { console.log('  ⚠️ WWR: no data'); return []; }
    const jobs = [];
    const items = html.match(/<item>[\s\S]*?<\/item>/g) || [];
    for (const item of items) {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1];
      const link = item.match(/<link>(.*?)<\/link>/)?.[1];
      if (!title || !link) continue;
      // Title format is usually "Company: Role"
      const parts = title.split(':');
      const company = parts[0]?.trim() || 'Unknown';
      const role = parts.slice(1).join(':').trim() || title;
      jobs.push({
        company,
        role,
        url: link,
        atsType: 'custom',
        location: 'Remote',
      });
    }
    console.log(`  ✅ WWR Programming: ${jobs.length} jobs`);
    return jobs;
  } catch (e) {
    console.log(`  ⚠️ WWR: failed (${e.message})`);
    return [];
  }
}

async function scrapeWWRDesign() {
  try {
    const html = await fetchText('https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss', 10000);
    if (!html) return [];
    const jobs = [];
    const items = html.match(/<item>[\s\S]*?<\/item>/g) || [];
    for (const item of items) {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1];
      const link = item.match(/<link>(.*?)<\/link>/)?.[1];
      if (!title || !link) continue;
      const parts = title.split(':');
      const company = parts[0]?.trim() || 'Unknown';
      const role = parts.slice(1).join(':').trim() || title;
      jobs.push({ company, role, url: link, atsType: 'custom', location: 'Remote' });
    }
    console.log(`  ✅ WWR DevOps: ${jobs.length} jobs`);
    return jobs;
  } catch (e) {
    console.log(`  ⚠️ WWR DevOps: failed`);
    return [];
  }
}

async function scrapeWWRFullStack() {
  try {
    const html = await fetchText('https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss', 10000);
    if (!html) return [];
    const jobs = [];
    const items = html.match(/<item>[\s\S]*?<\/item>/g) || [];
    for (const item of items) {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1];
      const link = item.match(/<link>(.*?)<\/link>/)?.[1];
      if (!title || !link) continue;
      const parts = title.split(':');
      const company = parts[0]?.trim() || 'Unknown';
      const role = parts.slice(1).join(':').trim() || title;
      jobs.push({ company, role, url: link, atsType: 'custom', location: 'Remote' });
    }
    console.log(`  ✅ WWR Full-Stack: ${jobs.length} jobs`);
    return jobs;
  } catch (e) {
    console.log(`  ⚠️ WWR Full-Stack: failed`);
    return [];
  }
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('🔍 WAVE 12 — MEGA EXPANSION (compounds + APIs + new ATS)\n');

  // Run ATS board scraping and API scraping in parallel
  console.log('📡 Phase 1: ATS Board Scraping...');
  const [ashbyJobs, ghJobs, leverJobs, workableJobs] = await Promise.all([
    scrapeAshby(slugArray),
    scrapeGreenhouse(slugArray),
    scrapeLever(slugArray),
    scrapeWorkable(slugArray.slice(0, 500)), // Workable is slower, limit initial set
  ]);

  console.log('\n📡 Phase 2: Job Board APIs...');
  const [jobicyJobs, remoteOKJobs, himalayasJobs, arbeitnowJobs, wwrJobs, wwrDevOps, wwrFS] = await Promise.all([
    scrapeJobicy(),
    scrapeRemoteOK(),
    scrapeHimalayas(),
    scrapeJobsCollider(),
    scrapeWWR(),
    scrapeWWRDesign(),
    scrapeWWRFullStack(),
  ]);

  const allJobs = [
    ...ashbyJobs, ...ghJobs, ...leverJobs, ...workableJobs,
    ...jobicyJobs, ...remoteOKJobs, ...himalayasJobs, ...arbeitnowJobs,
    ...wwrJobs, ...wwrDevOps, ...wwrFS,
  ];
  console.log(`\n📊 RAW: ${allJobs.length} jobs`);

  // Dedup by URL
  const seenUrls = new Set();
  const byUrl = allJobs.filter(j => {
    if (!j.url || seenUrls.has(j.url)) return false;
    seenUrls.add(j.url);
    return true;
  });

  const onePerCo = pickBestPerCompany(byUrl);

  const atsOrder = { greenhouse: 0, ashby: 1, lever: 2, workable: 3, custom: 4 };
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
