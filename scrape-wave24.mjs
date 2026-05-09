/**
 * scrape-wave24.mjs — WAVE 24: Crunchbase-style company names + tech unicorn lists
 *
 * Strategy: Scrape company names from known tech unicorn databases,
 * Series A-D funded startups, and common SaaS naming patterns.
 * Focus on 2-word hyphenated company slugs and well-known tech names.
 */

import { writeFileSync, readFileSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave24-jobs.json';
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

// More real company names from tech unicorn / startup lists
const COMPANIES = [
  // Fintech & Payments
  'brex','chime','current','dave','digits','divvy','finch','gusto','jeeves',
  'jiko','just-works','lending-club','marqeta','melio','mercury','modern-treasury',
  'moov','mpower','nova-credit','plaid','privacy','ramp','razorpay','recurly',
  'routable','runway-financial','slope','square','tabapay','tally','tipalti',
  'treasury-prime','unit','varo','venmo','wealthfront','wise','zeta',
  // DevTools & Infrastructure
  'airplane','alchemy','algolia','appsmith','argo','auth0','biome','buildkite',
  'bytebase','cabal','camunda','chainguard','chronosphere','cicada','clerk',
  'cloudflare','codacy','coder','convex','corcel','couchbase','cypress',
  'dagster','datadog','depot','devzero','doppler','earthly','edgedb','encore',
  'env0','equinix','ergomake','estuary','fern','fermyon','firehydrant',
  'flagsmith','flightcontrol','flipt','flox','fn','fuel','garden','gitpod',
  'grafana','hasura','hookdeck','hoppscotch','humio','immuta','infisical',
  'inngest','instill','ionic','jetbrains','keel','knock','koyeb','kubecost',
  'kubeshark','launchdarkly','liveblocks','localstack','logfire','loki',
  'materialize','metabase','milvus','mintlify','modal','monit','motif',
  'nango','neon','netlify','nhost','nightfall','northflank','novu','octopus',
  'ookla','openreplay','opentelemetry','ory','outerbase','overmind','paddle',
  'pagerduty','pangea','parcel','permit','pi-hole','pinecone','planetscale',
  'plasmo','polaris','porter','portkey','posthog','prefect','prisma','psc',
  'pulumi','qdrant','questdb','qovery','railway','raycast','redpanda',
  'refine','render','replay','replit','resend','retool','rivet','roboflow',
  'rudderstack','salto','sanity','sauce-labs','scarf','schematic','seed',
  'semgrep','sentry','serverless','sidekick','signoz','smallstep','snyk',
  'sourcegraph','spacelift','speakeasy','sst','stackblitz','stainless',
  'steampipe','stedi','step','storj','stream','supabase','svix','tailscale',
  'teable','temporal','term','terraform','thirdweb','tigris','timescale',
  'tinybird','toast','trigger','turbot','turso','typeform','typesense',
  'unkey','upbound','upstash','val-town','vectara','vercel','vessel',
  'wasp','webiny','windmill','wundergraph','xata','yepcode','zed','zenml',
  // AI / ML
  'adept','ai21','anyscale','arize','assemblyai','baseten','borealis',
  'cerebras','character','civitai','clarifai','coactive','cohere','coreweave',
  'cursor','dagger-ai','databricks','deepgram','deepl','elicit','fireworks',
  'flux','galileo','glean','gong','gradient','greptile','groq','hugging-face',
  'humanloop','jasper','labelbox','langchain','langfuse','langsmith','latitude',
  'lightning','llama-index','luma','magic','martian','mathpix','mistral',
  'modular','mosaic-ml','nomic','noteable','obsidian','ollama','openpipe',
  'parea','petal','phind','pinecone','playground','predict-io','qdrant',
  'quillbot','replicate','respell','runway-ml','sambanova','scales','shaped',
  'shield-ai','snorkel','stability','stack-ai','superagent','tabnine',
  'together','trieve','unstructured','v7','vellum','verifiable','wandb',
  'weights-biases','writer','xai','zilliz',
  // Security & Identity
  'abnormal','aqua','armis','bitwarden','bolster','canarytokens','cerby',
  'chainguard','cmd','cofense','corsha','crowdstrike','cybereason','cycode',
  'dashlane','deep-instinct','drata','egress','elastic-security','enso',
  'exabeam','flashpoint','forta','gitguardian','grip','huntr','island',
  'jupiterone','kolide','lacework','material-security','netskope','nightfall',
  'noname','orca','oxide','panther','pentera','phylum','piiano','probely',
  'rapid7','red-canary','salt-security','secret-double-octopus','securiti',
  'silverfort','snyk','sonatype','stairwell','stackhawk','strata','tanium',
  'tenable','tessian','tines','transmit','truffle','vanta','vault-speed',
  'vectra','wiz',
  // E-commerce & Marketplaces
  'airtable','algolia','attentive','bazaarvoice','bigcommerce','bolt',
  'cart','catch','classy','commercetools','doordash','fabric','faire',
  'fast-simon','fastly','gather','gorgias','grin','instacart','kafka',
  'klaviyo','loop-returns','lyft','mapbox','melio','nacelle','nuvemshop',
  'ordergroove','osa','packhelp','postscript','privy','rebuy','recharge',
  'rokt','sanity','seel','sezzle','shipbob','shippo','shopify','shopper',
  'smile','sniffies','square','stitch-labs','stockx','stripe','tapcart',
  'threekit','trivago','uber','underdog','vetcove','violet','whatnot','wish',
  'yotpo','zipline',
  // Health & Wellness Tech
  'alan','alma','amwell','calibrate','carbon-health','cerebral','cityblock',
  'color','devoted','eden','elation','ginger','headspace','hims-hers',
  'hone','included-health','layers','luma-health','maven','mend','modern-health',
  'nomi','omada','one-medical','open-loop','osmind','parsley','peers',
  'quartet','rally-health','regard','ro','simplepractice','sprinter','talkiatry',
  'transcarent','truepill','virta','wellth','wheel',
  // HR & People
  'ashby','bamboohr','breezy','carta','checkr','culture-amp','deel',
  'eightfold','gem','greenhouse','gusto','hibob','humaans','justworks',
  'lattice','lever','loxo','namely','oyster','paychex','personio',
  'remote','rippling','sapling','sequoia-people','teal','trinet','workrise',
  'zenefits',
  // Data & Analytics
  'amplitude','census','clearbit','cube','databricks','dbt-labs','deepnote',
  'estuary','firebolt','fivetran','grouparoo','hex','hightouch','holistics',
  'immuta','indicative','lightdash','looker','metabase','mixpanel','mode',
  'motherduck','observed','omni','orchest','popsql','preql','preset','re-data',
  'rudderstack','segment','sigma-computing','snowflake','starburst',
  'startree','superset','synq','tinybird','transform','trino',
  // Collaboration & Productivity
  'almanac','asana','beehiiv','cal-com','canva','chronicle','clickup','coda',
  'craft','descript','dovetail','figma','gather','grain','height','hey',
  'hive','linear','loom','miro','mmhmm','mural','notion','pitch','plural',
  'productboard','range','reclaim','rows','scribe','shortcut','slite',
  'taskade','tella','tuple','whimsical','wrike','yac',
];

for (const name of COMPANIES) SLUGS.add(name);

// Additional patterns: {word}labs, {word}hq, {word}io
const TECH_WORDS = [
  'acme','aero','alpha','anchor','apex','arc','atom','aurora','avro','axis',
  'azure','banner','beacon','beam','bit','blaze','bliss','bolt','boost',
  'bridge','bright','build','buzz','cache','carbon','cargo','cedar','chain',
  'cipher','circuit','claim','cloud','cobalt','codex','compass','config',
  'convoy','copper','cosmos','craft','crane','crate','creek','crest','crisp',
  'cross','crystal','current','dagger','delta','depot','derive','digit',
  'dispatch','dock','domain','drift','driver','druid','echo','edge','eight',
  'ember','engine','envoy','epoch','equal','ether','falcon','fathom','fiber',
  'field','finch','flare','fleet','flight','float','forge','forma','fossil',
  'frame','frost','garden','gather','ghost','glacier','glade','glide','globe',
  'glow','grade','grain','graph','grove','guild','harbor','haven','hawk',
  'helix','horizon','hydra','ignite','impact','index','indigo','infra',
  'inlet','insight','intent','iris','island','ivory','jasper','jolt','karma',
  'kernel','kinetic','knight','lake','lance','launch','layer','ledge',
  'legend','lever','light','locus','logic','lucid','lunar','lynx','magnet',
  'manor','marble','marsh','matrix','meadow','metric','micro','mirror',
  'mist','mocha','module','moment','mosaic','motion','nebula','nexus',
  'nimble','noble','nova','nucleus','oak','ocean','olive','omega','onyx',
  'orbit','origin','osprey','oxide','oxygen','panda','panel','parcel',
  'parse','patch','pearl','pebble','pelican','phoenix','pilot','pine',
  'pivot','plank','plume','pocket','portal','presto','prime','prism',
  'propel','proxy','pulse','quartz','quest','radar','radius','raven',
  'reach','realm','redis','reef','relay','render','ridge','ripple','river',
  'robin','rocket','rover','rudder','runway','rustic','sable','scale',
  'scout','scroll','secure','sequoia','shadow','shell','shield','signal',
  'silver','sketch','slate','sleek','smart','solar','solid','sonic','south',
  'spark','sphere','spike','spiral','splash','spoke','spring','square',
  'stack','stage','stake','stark','steel','stellar','stone','storm','stratum',
  'strive','summit','surge','swift','symbol','tango','tether','thorax',
  'thread','thrust','timber','torch','tower','trace','trail','transit',
  'trend','trident','trust','turbo','umbra','unity','upwind','valley',
  'vapor','vault','vector','velvet','venture','vertex','vessel','vigor',
  'vital','vivid','vortex','voyage','warden','wave','weave','wedge',
  'zenith','zephyr'
];

const SUFFIXES = ['labs','hq','io','ai','app','dev','co','tech','cloud','data','ops','api'];

for (const word of TECH_WORDS) {
  SLUGS.add(word);
  for (const suf of SUFFIXES) {
    SLUGS.add(word + suf);
    SLUGS.add(word + '-' + suf);
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
  console.log('🔍 WAVE 24 — Tech Unicorns + Company Slug Patterns\n');
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
