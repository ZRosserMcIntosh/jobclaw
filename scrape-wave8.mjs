/**
 * scrape-wave8.mjs — WAVE 8: Even MORE boards from discovery + expanded names
 * 
 * Includes:
 *  - All discovered boards from discover-boards.mjs
 *  - Hundreds more tech company name variations
 *  - Aggressive slug patterns (company, companyio, companyhq, company-inc, etc.)
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave8-jobs.json';
const TIMEOUT = 6000;

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
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return r.ok ? r.json() : null;
  } catch { clearTimeout(timer); return null; }
}

const STRONG = /full.?stack|frontend|front.?end|react|next\.?js|typescript|node|javascript|web.?dev|software.?engineer|swe\b/i;
const GOOD = /engineer|developer|architect|platform|backend|python|golang|rust|mobile|ios|swift/i;
const WEAK = /devops|sre|data.?engineer|ml.?engineer|infra/i;
const SKIP = /intern\b|new.?grad|junior|entry.?level|director|vp\b|chief|head of|recruiter|sales|marketing|account.?exec|customer.?success|legal|finance|accounting|hr\b|people.?ops/i;

function roleScore(title) {
  if (SKIP.test(title)) return -1;
  if (STRONG.test(title)) return 3;
  if (GOOD.test(title)) return 2;
  if (WEAK.test(title)) return 1;
  return 0;
}

const REMOTE_KW = /remote|anywhere|latam|americas|global|worldwide|brazil|são paulo|distributed|work from home|wfh|emea|apac/i;
function isRemote(location) {
  if (!location || location === '') return true;
  return REMOTE_KW.test(location);
}

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

// ═══════════════════════════════════════════════════════════════
// MEGA BOARD LISTS — discovered + fresh guesses
// ═══════════════════════════════════════════════════════════════

const GH_BOARDS = [
  // From discover-boards.mjs validation
  'synthetaic','coreweave','algolia','chainguard','circleci','cortex','devrev',
  'harbor','lightrun','logicgate','mattermost','nebius','newrelic','nubank',
  'osano','phdata','radar','raven','reachdesk','roadie','scandit','shopmonkey',
  'singlestore','tigera','torq','trufflesecurity','workato',
  // More to try — common tech names (will fail silently if invalid)
  'anduril','applied-intuition','app-annie','applovin','arista','arm',
  'aurora','autonomous','bamboohr','bird','bitgo','blackberry',
  'block','bmc','box','bright-machines','cadence','capgemini',
  'celonis','ceros','chargebee','chownow','cision','clearbit',
  'clover','collibra','compugroup','contentstack','corelogic',
  'coupa','coupang','crossover','crowdin','crunchbase','d2l',
  'deel','degreed','demandbase','domo','druva','duolingo',
  'ecobee','egnyte','enigma','envision','ephesoft','equinix',
  'eventbrite','everfi','exabeam','exiger','expensify','f5networks',
  'featurespace','first-resonance','five9','flatiron','food52',
  'forter','foundry','fullstory','g2','gartner','gainsight',
  'genesys','getaround','glassdoor','gofundme','grammarly',
  'greenhouse','groq','handshake','healthgrades','headspin',
  'help-scout','hims','hive','hopin','housecanary','hunter',
  'hyperscience','ibotta','icims','ideo','immersive-labs',
  'imply','indeed','infobip','instabase','instructure',
  'integral-ad-science','iterable','jamf','jasper','jellyfish',
  'juniper-networks','justworks','kandji','kareo','kaseya',
  'keeper-security','kentik','kforce','kinaxis','klaviyo',
  'koho','lacework','latch','liferay','lime','liveoak',
  'logz','lucid','luxoft','lyra-health','magic-leap',
  'mailchimp','malwarebytes','marketo','matillion','melio',
  'mesa','metarouter','mimecast','modern-health',
  'momentive','moogsoft','movable-ink','moveworks','mparticle',
  'mutiny','national-pen','nearmap','netapp','netsuite',
  'netskope','nightfall','nimble','noom','nuance',
  'observeai','okendo','olo','on24','onbe','ontic','ookla',
  'openx','operasoftware','oreilly','outpost','owncloud',
  'packetfabric','palo-alto-networks','panther-labs','particle',
  'patch','payoneer','payu','peakon','peer39','pendo',
  'perception-point','persado','phenom','pine-labs','pipe',
  'plume','pluralsight','podium','power-home-remodeling',
  'precisely','primer','proofpoint','prosper','protegrity',
  'proterra','pushpay','quantum-metric','quora','quorum',
  'rapid7','recurly','redfin','redhat','relx','remora',
  'remote','repay','restream','resulticks','reveleer',
  'ring-central','riskalyze','rivian','rootly','roper',
  'rubrik','runway','saba','safe-security','sail-point',
  'salt-security','sauce-labs','scale-computing','scalyr',
  'schrodinger','sciencelogic','sealand','secureworks',
  'sendoso','sennder','seraphic','shift','shippit','shopify',
  'shutterstock','siemens-energy','sift','silk-road',
  'simpl','simpplr','singular','sisu','siterecon','skedulo',
  'sketch','skybox','smartbear','smartsheet','snap','snorkel',
  'socure','solid-power','soma','sonatype','sonos','spacex',
  'sprinklr','spring-health','square-enix','squarespace',
  'squire','stackpath','standard-ai','starburst','status-page',
  'strava','stronghold','sumo-logic','supernal','suse',
  'swimlane','sysdig','tableau','taleo','tanium','taskrabbit',
  'teachable','tenable','terminus','textio','the-trade-desk',
  'think-cell','thinkific','thoughtworks','tidal','tipalti',
  'toast','toggl','together','tonal','transcarent',
  'tremendous','truebill','trustpilot','turing','twilio',
  'typeface','udacity','udemy','unbabel','unilever',
  'upstart','userleap','uservoice','validere','varo',
  'vectra','verkada','vero','veritone','vimeo','virtuagym',
  'virus-total','vitally','vivint','volterra','vts',
  'walnut','wandb','wealthsimple','webpt','whoop','wikimedia',
  'wolt','wonder','woodmac','workboard','workiva',
  'workhuman','xactly','xendit','xometry','yext','yield-street',
  'yotpo','zapier','zenefits','zepto','ziprecruiter','zoominfo',
  'zymergen','zyte',
];

const ASHBY_BOARDS = [
  // From discover-boards.mjs validation
  'langfuse','browserbase','composio','baseten','gradient','astronomer',
  'conduct','conductorone','confluent','docker','doppler','goldsky',
  'greptile','helios','inkeep','kestra','mapbox','orbit','outerbounds',
  'radar','replicant','signoz','skyflow','slai','vcluster','wundergraph',
  // More to try
  'airplane','airbyte','alloydb','ambient','anima','appflowy','arbor',
  'archetype','arctic','argilla','arize','artie','atlan','autokitteh',
  'axle','baselime','berglas','bigeye','bladebug','blaze',
  'blink','bosquet','boxyhq','brightdata','bytewax',
  'campfire','cedar','cellarity','chainloop','chronicle',
  'clarifai','cladfy','clearfeed','clickzetta','clinia',
  'coderabbit','cogram','coherence','coil','comply',
  'context','coolify','coreflux','credal','crossmint',
  'cuda','cursor','cyclops','daisy','databento',
  'dataherald','datajoint','datarails','datature','delphi',
  'devbox','diffy','directai','dosu','double',
  'driftctl','drogue','dune','eartho','edgehog',
  'ekohe','elementary','eleven','embold','emerge',
  'encord','endgame','eon','epigraph','equo',
  'exoflare','fal','fastgen','firecrawl','firefly',
  'flockjay','flowerjs','forage','forethought','fossa',
  'foxglove','frameio','freshpaint','fulfill','gadget',
  'gallabox','gigapipe','gladly','gleen','glide',
  'godly','golem','gorilla','greenmask','gridium',
  'grist','growthloop','haiku','halfpipe','haystack',
  'headroom','heartex','hemnet','hengi','hermit',
  'highperformr','hived','hologram','hotplate','houseware',
  'hume','hyperbound','ice','illuminate','imbue',
  'impel','in-context','incorta','innerworks','integry',
  'intelli','invicti','invoke','isoflow','iteratively',
  'ixon','jamespot','jamsocket','jobot','julep',
  'kapiche','karini','keypup','kinde','kite',
  'koala','korbit','kubiya','ladder','latitude',
  'leandata','legit-security','lemon','lifetime','liminal',
  'litellm','livepeer','llama','logfire','logicmonitor',
  'luminai','lunary','magasin','manifest','mastra',
  'meadow','measure','mesh','metamaze','metaview',
  'minder','mirrorful','miso','mitta','mixtral',
  'monad','moonvalley','mutable','nebula','needle',
  'nestjs','netspring','nimbus','ninth','nomic',
  'normalize','northbeam','novata','nucleus','nulu',
  'oak','objectiv','octomind','omni','onemodel',
  'onlook','openlit','openreplay','opsera','orama',
  'orkes','osmosis','outverse','ozone','paladin',
  'panoramic','paraform','paragon','patchwork','payabli',
  'peak','peregrine','perimeter','persona','petalmd',
  'photon','pilot','pixis','plaid','plainsight',
  'ploomber','polychrome','predibase','primegen','prism',
  'protex','proton','pubgenius','pulse','purepm',
  'qatalog','qualio','quant','questbook','radar-app',
  'ramp','ravelin','readme','rebase','recall',
  'refact','relevance','relume','replicated','rerun',
  'resend','revelo','reviewpad','rigor','rill',
  'rithmio','robotec','rollout','roo','rossum',
  'routable','runway','safebase','sagess','samara',
  'scala','scarf','scope','seam','secfix',
  'seed','sema4','servicebell','settle','shadeform',
  'sieve','silna','simbian','simplisafe','sirdata',
  'sketch','sled','sliceline','snorkel','softr',
  'sourceday','sourcery','sparkle','speak','speck',
  'spline','spotdraft','sprinter','stainless','standard',
  'stitch','storage','strapi','subframe','sunbeam',
  'superagent','superlinked','surefire','surfe','sweep',
  'symmetric','synthflow','tabular','taktile','talon',
  'teampay','tembo','tensor','teradata','terraform',
  'textual','thena','throne','tidal','timekit',
  'titan','todesktop','tome','topaz','trellis',
  'truewind','trustworthy','turntable','twelve','typefully',
  'ultraviolet','unitary','upbound','upkeep','ureeka',
  'userflow','valence','valora','vapor','vaultik',
  'velvet','verdant','vertex','viable','vibe',
  'vidyo','vocode','voiceflow','voxel','waabi',
  'wandb','waterfall','wayflyer','weave','whalesync',
  'whist','wildcard','winglang','wirecutter','wisdomtree',
  'withcoherence','workflow','xano','yeager','yuma',
  'zenith','zepto','zigzag','zippin','zocdoc',
];

const LEVER_BOARDS = [
  // From discover-boards.mjs validation
  'factor','immuta','nrwl','scaleway','sonatype','stackhawk','tinybird',
  'verifiable','zilliz',
  // More to try
  'agora','aha','aiven','appcues','asapp','assembled','axonius',
  'barkbox','benchprep','bloomerang','bluecore','boardable',
  'bonterra','bravado','brightwheel','buildout','bumble',
  'calm','campfire','carrot','chainalysis','chargify',
  'chatwoot','checkout','chorus','clari','clipboard',
  'cockroach','compliant','contrast','conviva','creditkarma',
  'criteo','curated','dadeschools','dataminr','dbt-labs',
  'deepgram','deliver','dialect','digital-ocean','drift',
  'dsco','dv01','eco','empyrean','encamp',
  'epicor','eqrx','evisort','evocalize','fandom',
  'featureform','finalsite','first-advantage','forto','foundant',
  'fuel50','fusionops','ganymede','gather','genesys',
  'gladly','glitch','gocardless','gorgias','greenfly',
  'gremlin','grove','hackerone','harver','heap',
  'hearth','helix','hiive','holistics','hologram',
  'homeaway','homebase','hover','howl','i2group',
  'illumio','impartner','impira','incident','indicative',
  'infosum','injective','inspectorio','instrumental',
  'intelex','ironclad','itopia','jasper','jobandtalent',
  'jump','kaleido','karma','keen','keystone',
  'kindred','kinsta','kixeye','klarnabank','koho',
  'lambdatest','latch','leanplum','leverfi','linqia',
  'litmus','lockstep','login-radius','logzio','loomis',
  'luma','luminoso','maestro','mango','manifold',
  'markforged','marshmallow','mavenmachines','medallia','meesho',
  'mend','meta4','metarouter','microstrategy',
  'mighty-networks','mindbody','modal','moat','mosaic',
  'movable','moxion','mpulse','nerdwallet','netomi',
  'nexhealth','nextroll','nightfall','nodereal','novastone',
  'nozomi','numberai','observed','okendo','omatic',
  'omnidian','onbe','onepeloton','onto','openverse',
  'optum','orbcomm','ordergroove','otonomo','outbound',
  'outreach','overhaul','oyo','pacaso','parsley',
  'patch','patron','payfit','payscale','peakon',
  'perch','periscope-data','persefoni','pet-circle',
  'phreesia','ping-identity','plume','podium','preset',
  'primer','procore','prodigy-education','protolabs',
  'public','push','qualified','qualtrics','quandl',
  'raisely','rapid7','rasa','rattle','recurate',
  'reforge','relativity','reliance-matrix','resilience',
  'retrium','rinse','ripjar','roadmunk','rokt',
  'roper','rotunda','rover','rumble','safe',
  'salsa','samhsa','samsara','scale-api','schoology',
  'scratchpad','securonix','seismic','sendoso','sensor-tower',
  'sharp','shift','shipt','showpad','sidewalk',
  'signal','sigma-computing','simplehuman','sked-social',
  'skysilk','smarter','smartly','snackpass','socialchorus',
  'sofar','sourcegraph','spark','spectro-cloud','spiff',
  'spireon','spot','squarespace','stackadapt','stackpath',
  'stairwell','standard-metrics','starling','stensul',
  'storj','strava','streamyard','stride','strongarm',
  'superhuman','superside','sure','swiftly','symend',
  'syndio','systran','taboola','talkiatry','taskus',
  'teachable','terminus','terraform','textio','theoremone',
  'thrasio','tigergraph','tines','tonal','topcoder',
  'topia','tourradar','tradeshift','trax','treasure-data',
  'trialspark','tribal','truework','trustpilot','turing',
  'uniphore','unmind','urban-company','valimail','vantage',
  'varo-money','venafi','vida','viewpoint','vinli',
  'visier','volt','voluntas','walkme','wealthfront',
  'webflow','wild','willow','wistia','wiz',
  'wonder','woodmac','xactly','xero','yield',
  'yotpo','zafin','zapata','zenoti','zero-hash',
  'zocdoc','zuora','zywave',
];

// ═══════════════════════════════════════════════════════════════
function guessCompany(board) {
  return board.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function scrapeGreenhouse() {
  const unique = [...new Set(GH_BOARDS)];
  const all = [];
  let ok = 0;
  for (let i = 0; i < unique.length; i += 25) {
    const batch = unique.slice(i, i + 25);
    const results = await Promise.allSettled(
      batch.map(async (board) => {
        const d = await fetchJSON(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=false`);
        if (!d?.jobs) return [];
        ok++;
        return d.jobs
          .filter(j => isRemote(j.location?.name))
          .map(j => ({
            company: guessCompany(board),
            role: j.title,
            url: `https://job-boards.greenhouse.io/${board}/jobs/${j.id}`,
            atsType: 'greenhouse',
            location: j.location?.name || 'Remote',
          }));
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') all.push(...r.value);
    }
    process.stdout.write(`\r  GH: ${Math.min(i + 25, unique.length)}/${unique.length} (${ok} valid, ${all.length} jobs)`);
  }
  console.log(`\n  ✅ Greenhouse: ${ok} boards, ${all.length} remote jobs`);
  return all;
}

async function scrapeAshby() {
  const unique = [...new Set(ASHBY_BOARDS)];
  const all = [];
  let ok = 0;
  for (let i = 0; i < unique.length; i += 20) {
    const batch = unique.slice(i, i + 20);
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        const d = await fetchJSON(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
        if (!d?.jobs) return [];
        ok++;
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
      if (r.status === 'fulfilled') all.push(...r.value);
    }
    process.stdout.write(`\r  Ashby: ${Math.min(i + 20, unique.length)}/${unique.length} (${ok} valid, ${all.length} jobs)`);
  }
  console.log(`\n  ✅ Ashby: ${ok} boards, ${all.length} jobs`);
  return all;
}

async function scrapeLever() {
  const unique = [...new Set(LEVER_BOARDS)];
  const all = [];
  let ok = 0;
  for (let i = 0; i < unique.length; i += 20) {
    const batch = unique.slice(i, i + 20);
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        const d = await fetchJSON(`https://api.lever.co/v0/postings/${slug}?mode=json`);
        if (!Array.isArray(d) || d.length === 0) return [];
        ok++;
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
      if (r.status === 'fulfilled') all.push(...r.value);
    }
    process.stdout.write(`\r  Lever: ${Math.min(i + 20, unique.length)}/${unique.length} (${ok} valid, ${all.length} jobs)`);
  }
  console.log(`\n  ✅ Lever: ${ok} boards, ${all.length} remote jobs`);
  return all;
}

async function scrapeJobicy() {
  const tags = ['react','typescript','node','fullstack','python','javascript',
    'frontend','backend','devops','golang','rust','ruby','java','swift',
    'flutter','aws','docker','kubernetes','nextjs','vue','angular','svelte',
    'graphql','postgresql','redis','terraform','machine-learning',
    'data-engineering','php','scala','elixir','haskell','clojure','r',
    'matlab','sas','tableau','power-bi','snowflake','databricks',
    'spark','hadoop','kafka','airflow','dbt','fivetran',
    'salesforce','servicenow','workday','sap','oracle',
    'ios','android','react-native','flutter','xamarin',
    'unity','unreal','godot','game-dev',
    'security','penetration-testing','soc','siem','endpoint',
    'network','cloud','azure','gcp','multi-cloud',
    'blockchain','web3','solidity','defi','nft',
    'ai','llm','nlp','computer-vision','robotics',
    'product-manager','product-designer','ux','ui',
    'technical-writer','documentation','api',
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
  }
  console.log(`  ✅ Jobicy: ${all.length} jobs`);
  return all;
}

async function main() {
  console.log('🔍 WAVE 8 SCRAPER — Maximum Coverage\n');

  const [gh, ashby, lever, jobicy] = await Promise.all([
    scrapeGreenhouse(),
    scrapeAshby(),
    scrapeLever(),
    scrapeJobicy(),
  ]);

  const allJobs = [...gh, ...ashby, ...lever, ...jobicy];
  console.log(`\n📊 RAW: ${allJobs.length} jobs`);

  const seenUrls = new Set();
  const byUrl = allJobs.filter(j => {
    if (!j.url || seenUrls.has(j.url)) return false;
    seenUrls.add(j.url);
    return true;
  });
  console.log(`   After URL dedup: ${byUrl.length}`);

  const onePerCo = pickBestPerCompany(byUrl);
  console.log(`   After 1-per-company + blocklist + role filter: ${onePerCo.length}`);

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

  onePerCo.slice(0, 20).forEach((j, i) => {
    console.log(`   ${String(i+1).padStart(3)}. [${j.atsType.padEnd(10)}] ${j.company.padEnd(25)} — ${j.role.slice(0,60)}`);
  });
  if (onePerCo.length > 20) console.log(`   ... and ${onePerCo.length - 20} more`);

  writeFileSync(OUTPUT_PATH, JSON.stringify(onePerCo, null, 2));
  console.log(`\n✅ Saved ${onePerCo.length} jobs to ${OUTPUT_PATH}`);
}

main().catch(console.error);
