/**
 * scrape-wave23.mjs — WAVE 23: VC Portfolio Companies Round 2
 *
 * Strategy: More real company names from VC portfolios, AngelList, TechCrunch 
 * lists, Forbes Cloud 100, Inc 5000 tech, Deloitte Fast 500, etc.
 * This approach had 14.2% ATS hit rate in wave 17 — best of all strategies.
 */

import { writeFileSync, readFileSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave23-jobs.json';
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
// SLUG GENERATION — Real company names from VC portfolios & tech lists
// ============================================================

const SLUGS = new Set();

// Sequoia, a16z, Greylock, Benchmark, Kleiner Perkins, Lightspeed, Accel, etc. portfolio companies
const REAL_COMPANIES = [
  // B2B SaaS & Cloud (Forbes Cloud 100 style)
  'abnormal-security','absorb','acquia','aha','airslate','akeneo','algolia','alloy',
  'amplitude','anaplan','appcues','appfire','appian','aptean','aqua-security',
  'arcserve','arize-ai','armis','articulate','attentive','automox','avalara',
  'axon','bamboohr','bazaarvoice','bettercloud','bigid','bitrise','blackline',
  'bluecore','blueshift','bmc','boldstart','bombora','bonusly','box',
  'braze','brightcove','bullhorn','calendly','cato-networks','celigo','census',
  'chainalysis','chargebee','chili-piper','chorus','chronosphere','cin7',
  'clari','clearbit','click-up','clockwise','cobalt','coda','cohesity',
  'coin-metrics','comet-ml','comet','comply-advantage','confluent','contentsquare',
  'contrast-security','corelight','coupa','cribl','crossbeam','cue-health',
  'customer-io','cypress','dagster','dagger','darktrace','data-dog','dataiku',
  'datarobot','deel','deepnote','degreed','deliverect','demandbase','devo',
  'digitalocean','disco','dispatch','docebo','document-crunch','dovetail',
  'drift','druva','duo-security','dutchie','e-sputnik','elastic','electric-ai',
  'elevated-signals','endpoint-health','enigma','envoy','eqt','essentials',
  'euclid','everbridge','exabeam','exclaimer','expensify','factual','fairshake',
  'featurespace','figment','finix','fireblocks','five9','fiveline','flock-safety',
  'florence','flywheel','forecast','forethought','forter','freshworks','front',
  'fusion-risk','g2','gather','genesys','glia','global-relay','globality',
  'go-nimbly','gocardless','gold-sky','goodtime','gorilla','gorgias','grafana',
  'grain','grammarly','greenhouse','grid','grin','growthloop','guide-cx',
  'gusto','h1-insights','handle-global','harness','hasura','heap','hive',
  'holistic-ai','honeycomb','hookdeck','human-interest','hunter','hyperscience',
  'icertis','illuminate','immuta','impact','incident-io','indeed','inflection',
  'injective','inmobi','instawork','intellimize','invoca','iron-mountain',
  'isle','ivalua','jam-city','jasper','jellyfish','jumpcloud','juniper',
  'justworks','keen','keeptruckin','kentik','kepler-group','kinaxis','kisi',
  'klar','klaviyo','knock','komodor','kustomer','labelbox','lacework',
  'launchdarkly','leandata','leanix','ledger','lendbuzz','lever','lightbend',
  'linear','liveaction','lob','logz','loopio','lowcoders','loxo','lucid',
  'luma-health','lumigo','mable','made-tech','magic-eden','mango-health',
  'mapbox','matterport','maven-clinic','melio','mend','mercari','meta-router',
  'method','mews','mighty-networks','mimecast','mindbody','mirror','mitek',
  'mode','modern-health','momentive','monday','monte-carlo','motherduck',
  'moveworks','multiverse','mural','nacelle','nav','navan','nearmap',
  'neat','netify','netlify','new-relic','newfront','next-insurance','nexthink',
  'nightfall','nimble','nium','notarize','notion','nucleus','observe',
  'obsidian','od2','ohi','olo','omni','on24','once-hub','onetrust',
  'orca-security','ordr','osmind','outbound-ai','outreach','ownbackup',
  'pacaso','pager-duty','papaya-global','parallelz','paragon','parse-ly',
  'patch','pathai','patreon','pavilion','paxata','paxos','peakon','pendo',
  'percolate','persado','personio','phenompeople','pilot','pipe','planet',
  'playtika','plivo','podium','postman','posthog','preqin','presto',
  'productboard','proof-point','propel','protex-ai','puma-security','puppet',
  'pypestream','qualified','quantum-metric','quora','ramp','rapid7','readme',
  'recurly','red-canary','redhorse','relate','relay-payments','reliance',
  'remote','render','replicated','request','restream','retool','revolut',
  'rill','ripple','rippling','riskalyze','rootly','rubrik','rudderstack',
  'runway','samsara','sanity','sauce-labs','scalyr','scribe','seismic',
  'semrush','sendbird','sendoso','sentry','sequin','shippo','shopmonkey',
  'shortcut','sigma-computing','signifyd','silverfort','simpo','singlestore',
  'site-improve','skillsoft','snorkel','snyk','sonatype','sourcegraph',
  'spectral','split','spot-ai','spot-hero','spotinst','square','squarespace',
  'stackhawk','standard-ai','starburst','stardog','stitch-fix','stormglass',
  'storyblok','strapi','strava','stripe','substack','superblocks','suzy',
  'swiftly','swoogo','synaptic','sysdig','talkdesk','tanium','tap-bio',
  'tenable','tenx','terakeet','tessian','tetrate','the-trade-desk','thinkific',
  'thoropass','threekit','timber','tines','toast','toggl','token-metrics',
  'tonal','toolbox','transmit-security','treasure-data','trilogy','triple-whale',
  'trivago','truework','trulioo','tumblr','turnitin','twilio','twingate',
  'unbabel','uniphore','unit','uscreen','userback','userpilot','vanta',
  'vast-data','vercel','verkada','vetcove','veza','vidyard','virtual-mind',
  'visier','vivid-seats','vonage','vouch','walrus','warp','wasabi',
  'watchful','wayflyer','webflow','whatfix','whistic','wiz','workato',
  'workday','workrise','wrike','wundergraph','xano','xata','yext',
  'zego','zensurance','zeplin','zero-hash','zipwhip','zoominfo','zuora',
  // Newer Y Combinator companies (not in wave 17)
  'airbyte','airplane','alchemy','anchore','aptos','baseten','braintrust',
  'buildkite','bus-patrol','cabal','cal-com','capacitor','cargo','cavela',
  'cerebral','chord','cofactr','commonroom','coral','credal','deepgram',
  'defer','devrev','double','draftbit','dragonfly','earthly','elementary',
  'encore','endgame','epoch','fey','fireflies','flatfile','flipt','flutterflow',
  'fern','foxglove','galileo','gather-ai','glean','golden','great-expectations',
  'groundcover','hatchet','haystack','highlight','hive-mind','hollow','hub-spot',
  'hyperline','immersive-labs','infisical','instill','jan-ai','kai-analytics',
  'langchain','langfuse','latchel','lattice','leapfrog','lightspark','liminal',
  'liveblocks','lutra','mage','magic-patterns','magicbell','markprompt','materialize',
  'mayday','meadow','mem','meow','metabase','metronome','mintlify','mirror-world',
  'modal','multiwoven','nango','neon','nimbus','nomic','northflank','notable',
  'nu-bank','numerade','nylas','oneflow','oneleet','orb','outverse','ozone',
  'paladin','paradime','parcel','pattern','peregrine','pinecone','plandex',
  'plasmo','polar','polaris','pomelo','portkey','posit','prefect','primer',
  'prisma','prismdata','public','pulumi','qdrant','questdb','railway','rasa',
  'ray','reboot','redpanda','refine','reforged','relevance','replit','resemble',
  'resend','respell','rivet','roboflow','rutter','salus','sanctuary','scale-ai',
  'schematic','semaphore','sensible','sequel','shopify','sidekick','slang',
  'sleek','small-step','snorkel-ai','snowflake','sourcery','spacelift',
  'speakeasy','spell','stainless','steadybit','stedi','stealth','steer',
  'stories','storj','stream','supabase','superwall','svix','swim','tab',
  'tabnine','tailscale','temporal','terra','thoughtspot','tigris','timescale',
  'transpose','trieve','trigger','turbot','turso','typeform','uffizzi',
  'unkey','upbound','val-town','vectara','verifiable','vessel','vital',
  'wasp','webiny','windmill','wundergraph','xata','yepcode','zed','zenml',
  // Remote-first companies (Flexjobs, Remotive top lists)
  'aha','airbyte','algorand','along','angi','appsmith','articulate','atlassian',
  'auth0','automattic','axonius','basecamp','belfry','benevity','betterment',
  'bitly','bookingcom','brilliant','buffer','bumble','bustle','canva','ceros',
  'chainalysis','circleci','clevertech','cloudbees','codacy','coinbase','coursera',
  'crowdstrike','customer-io','dbt','deel','descript','digit','discord',
  'doordash','dropbox','duolingo','elastic','etsy','evernote','faire',
  'fastly','figma','fivetran','fleetsmith','flexport','fly-io','formstack',
  'fullstory','ghost','github','gitlab','glossier','go-fund-me','godaddy',
  'grain','grammarly','gumroad','hashicorp','heroku','hired','hotjar',
  'hubstaff','ifttt','indeed','instacart','intercom','invision','jira',
  'khan-academy','kickstarter','knack','lemonade','loom','lyft','mailchimp',
  'mango','masterclass','medium','mercury','meta','microsoft','mixpanel',
  'modern-treasury','modus-create','moz','namely','netlify','niantic','noom',
  'okta','ollie','onepassword','openai','pagerduty','palantir','peloton',
  'plaid','pluralsight','postclick','privy','process-street','product-hunt',
  'protocol-labs','puppet','quizlet','reddit','remote-com','salesforce',
  'scrapinghub','scribd','seatgeek','shopify','skillshare','slack','sourcegraph',
  'spacex','spotify','squarespace','stitch-data','stride','stripe','superside',
  'survey-monkey','teachable','testgorilla','the-zebra','time-doctor','toggl',
  'toptal','trello','tripactions','trustpilot','twitch','udemy','upwork',
  'veeva','venmo','vistaprint','vmware','voiceflow','webex','wikimedia',
  'wolfram','wordpress','workiva','xero','yelp','zapier','zendesk','zillow',
  'ziprecruiter','zoom',
];

for (const name of REAL_COMPANIES) SLUGS.add(name);

// Also try without hyphens and with hyphens variations
const extras = [];
for (const s of SLUGS) {
  if (s.includes('-')) extras.push(s.replace(/-/g, ''));
  else if (s.length > 6) {
    // Try splitting long names
    const mid = Math.floor(s.length / 2);
    extras.push(s.slice(0, mid) + '-' + s.slice(mid));
  }
}
for (const e of extras) SLUGS.add(e);

// Tech company suffixes for slug generation
const BASES = [
  'acre','aero','algo','apex','aqua','arch','aura','axis','byte','calc',
  'cell','chai','chip','cite','clay','cleo','coda','coil','comm','cord',
  'ctrl','cube','curo','dash','dawn','deck','deft','dell','dime','dock',
  'dose','drift','echo','edge','emit','epic','etch','ever','exec','expo',
  'fern','fire','fish','flex','flip','flux','foam','font','fuel','fuse',
  'gate','gear','gild','glow','grab','grid','grit','halo','hash','hawk',
  'haze','heap','helm','hex','hive','hue','icon','info','iris','isle',
  'jade','jazz','jump','keel','keen','kern','kind','kite','knot','lace',
  'lake','lane','lark','leaf','leap','lend','lens','lift','lime','link',
  'loft','loom','lore','luna','lynx','mage','maps','mark','maze','meld',
  'mesh','mica','mill','mind','mint','mist','mole','mood','moss','muse',
  'myth','nano','nest','next','node','nova','null','oaks','oath','onyx',
  'opus','orb','otto','owl','pact','palm','park','path','peak','pier',
  'pine','pipe','plan','plot','plug','plum','pole','poll','pond','port',
  'post','pour','prod','prop','pure','quad','quay','raft','rain','ramp',
  'reef','rely','repo','rest','rift','ring','rise','root','rose','ruby',
  'rune','rush','sage','sail','salt','sand','scan','seed','self','silk',
  'silo','site','slab','snap','soar','soma','span','spec','spin','spur',
  'star','stem','stir','sway','swim','sync','tact','tale','tang','tape',
  'teal','tier','tile','tone','torq','trek','true','tune','turn','twin',
  'vale','vane','vary','veil','vent','verb','vest','vine','volt','wade',
  'wake','wand','ward','warp','wave','weld','well','whip','wide','wind',
  'wire','wren','yard','yarn','yawn','zeal','zinc','zone'
];

const SUFFIXES = ['hq','io','ai','app','labs','co','dev','ly','fy','ify','ity','er','or','ware','ery','ist','ism'];

for (const base of BASES) {
  for (const suf of SUFFIXES) {
    SLUGS.add(base + suf);
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
  const tags = ['react','typescript','node','fullstack','python','javascript','frontend','backend','golang','rust','java','aws','docker','kubernetes','ai','llm','devops','cloud','mobile','web','security','fintech','saas','remote','machine-learning','data-engineering','ios','android','ruby','rails','vue','angular','nextjs','graphql','terraform','blockchain','crypto','defi','web3','product-manager','ux','design','growth','analytics'];
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
  console.log('🔍 WAVE 23 — VC Portfolio Companies Round 2\n');
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
