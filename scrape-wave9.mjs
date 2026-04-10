/**
 * scrape-wave9.mjs — WAVE 9: Ultra-wide net
 * 
 * Strategy: Try HUNDREDS more company names from:
 *  - YC batch lists (W24, S24, W25)
 *  - Crunchbase top funded startups
 *  - AngelList/Wellfound popular companies
 *  - ProductHunt trending
 *  - GitHub trending organizations
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave9-jobs.json';
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
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return r.ok ? r.json() : null;
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

// ═══════════════════════════════════════════════════════════════
// ULTRA-WIDE CANDIDATE LISTS
// ═══════════════════════════════════════════════════════════════

const GH_ULTRA = [
  // Y Combinator W24/S24/W25 companies (known to use Greenhouse)
  'voiceflow','mem-labs','casetext','jasper-ai','luma-ai','lumalabs',
  'runway-ml','stability','covariant','covariantai','physical-intelligence',
  'worldcoin','world-coin','tools-for-humanity',
  'flexport','gusto','ginkgo','ginkgobioworks','convoy',
  'weave','weaveapi','twist','twistbioscience',
  'zip','ziphq','ashby','greenhouse-software','lever-co',
  'figmadesign','notionhq','canva-careers',
  // B2B SaaS (Series B+)
  'atrium','beehiiv-inc','cascade','centerstone','claranet',
  'clearco','closingcorp','cognism','comet-chat','comet',
  'cometchat','contractbook','creditas','crossbeam','cube-dev',
  'customerio','d2iq','dataiku','drata-inc','drugdev',
  'egnyte','eltropy','emma','enablement','envoy',
  'esentire','exactsciences','exostellar','extrahop',
  'feedzai','fenergo','firemon','firstbase','forma',
  'formagrid','freshdesk','freshsales','freshservice',
  'funnel','galacticlabs','gamalon','gamma','gathercontent',
  'genuity','geotab','gladly','gocanvas','gocardless',
  'goldcast','goodrx','gorillalogic','grasshopper',
  'grove-collab','guidepoint','guru','gympass','wellhub',
  'harvest','hasura','health-gorilla','helloSign',
  'helpshift','hevo','hone','hypr','immersa',
  'impressiondigital','increff','indriver','infobip',
  'innovapptive','insightsoftware','instride','integrations',
  'intellias','intellimize','intezer','ionic',
  'ironscales','itilite','ivanti','ixlayer','jacobs',
  'jet-brains','jetbrains','jiminny','jobs-api','jotform',
  'jump-cloud','kaltura','karat','kazoo','keap',
  'kensu','kindbody','knotel','komodo-health','kore',
  'kortext','kustomer','label-studio','launchnotes',
  'leadiq','lean-data','levelpath','librarypass',
  'lifesize','lilt','lineage','lingokids','litify',
  'logicmonitor','longtail-ux','looker','looop',
  'loop-returns','lucidchart','luxonis','lyftronics',
  'made-tech','magnetic','mailtrap','mango-voice',
  'manyChat','maplelms','mariadb','marketo',
  'marshmallow-group','mastery-charter','matik','matr',
  'maxio','maze','mediaocean','memfault','mentor',
  'mercari','metabase','metamask','methodfi',
  'metorik','mindtickle','mirrorfly','mixmax',
  'moengage','moesif','mollie','momentive',
  'monto','morecommerce','morningstar','motional',
  'motorola-solutions','moveworks','mparticle','multiverse',
  'municipal','mural','mutiny-hq','myob','narvar',
  'natterbox','navigatr','nebulab','netchex','netcore',
  'netomi','netskope','nexthink','nift','nimble-robotics',
  'noble','nortonlifelock','notarize','notion-2','notified',
  'nozomi-networks','ntt-data','nurx','nylas','observeai',
  'oddball','offchain','offer-ghostwriting','officevibe',
  'oleria','olivia','omada','onbe','onefootball',
  'onetrust','onfido','opentext','openverse-wp',
  'opsramp','optoro','oracle-netsuite','orbitera',
  'orderprotect','outmatch','outside-analytics','overjet',
  'ownbackup','owncloud','packs','page-group',
  'palantir-foundry','pareteum','parse','part-analytics',
  'partnerize','partnerstack','passport','patch-io',
  'pathstream','patient-point','patriot-software',
  'pavilion-data','peaxy','pecan','peerboard',
  'pepper-content','percona','permit','persona-ly',
  'petvisor','pharos','phenompeople','phocas-software',
  'pillar','pipl','pipefy','placer','plangrid',
  'platformsh','playsight','plecto','plesk','plume',
  'podcastle','pointclickcare','poka','policybazaar',
  'pondurance','poplar','portside','positec',
  'postclick','powerreviews','practicelink','pricefx',
  'printful','privacera','procurify','productboard',
  'productiv','progyny','proliant','pronounce',
  'proofhub','propeller','prospect','proxyclick',
  'punchh','purple-wifi','pushpay','qatalog-inc',
  'quantexa','quantum-workplace','quikr','quotient',
  'raken','ramp-inc','rancher','rapid7-inc',
  'rappi','raydiant','razorpay','reachlocal',
  'reachmail','readytalk','reallocation','realpage',
  'recently','reco','recurate','recurly-inc',
  'redcanary','redgate','redjam','redseal',
  'reflektion','relex','remitly-inc','remote-inc',
  'reonomy','replicon','reprise','requisition-pro',
  'researchgate','resident-home','resilinc','retently',
  'revacomm','revenue-io','reviewtrackers','revlifter',
  'revolut','ribon','ringcentral','riskified',
  'rivian-inc','robot','rockbot','rocketreach',
  'rootstock','rossum','rothy','routehappy',
  'rsa','rudderstack','runscope','rutterstack',
  'safebase','safetyculture','sailthru','sama',
  'samsara-inc','sanebox','sap-labs','saviynt',
  'scalefast','scalyr-inc','scanbot','scantrust',
  'sciencelogic-inc','scooteq','scoredata','scoutbee',
  'scratchpad','screencloud','scribd','seal-software',
  'securiti','securityscorecard','segmentio','seismic',
  'selligent','semaphore','sendoso-inc','sendspark',
  'sennder-inc','sensor-tower','sentinelone','servicenow',
  'servicerock','sesami','sezzle','sharethrough',
  'shaw-industries','shellboxes','shiftkey','shipa',
  'shopgate','shortcut-inc','showpad-inc','showroomprive',
  'sift-science','signalfx','signifyd','silverfort',
  'simplaex','simplr','simscale','site24x7',
  'sitecompli','siteimprove','skedler','skilljar',
  'skuad','skyboxsec','skylight','skyward',
  'sleeper','slickdeals','smartling','smartlook',
  'smartrecruiters','smartsheet-inc','smashfly',
  'snagajob','snappymob','socialtalent','softheon',
  'softwareone','solaris','solidfire','solvvy',
  'sonder-inc','sonus','sourcescrub','spaceiq',
  'sparkcognition','sparkpost','specright','speechmatics',
  'speedoc','spider-strategies','splitit','sportsdata',
  'springboard','springbig','sprinto','sprout-social',
  'square-inc','squire-technologies','stackadapt',
  'stackhawk','staffbase','staffjoy','starburst-data',
  'startupstack','statuspage','stellar','step-inc',
  'stoplight','stord','storj','stratasys',
  'strateos','streamlabs','streem','stride-consulting',
  'stripe-inc','strongdm','studysmarter','subspace',
  'sugarcrm','suite-spot','sumtotal','sunbit',
  'sundaysky','supplypike','surgere','survey-monkey',
  'surveylegend','suzy','svix-inc','swiftconnect',
  'swrve','symantec','syndica','sysomos',
  'taboola','talespin','talkwalker','tamr',
  'tandem','tango','tapfiliate','tapresearch',
  'taskus-inc','teads','teamgram','teamwork',
  'tech-mahindra','teemwurk','tegus','tekion',
  'teradata','terminus-inc','terrascope','testdome',
  'textkernel','textla','the-real-real','thena',
  'thenx','thinkhr','thirty-madison','thoughtexchange',
  'thryv','thunderhead','tibco','ticketmaster',
  'tidepool','tigera-inc','tilting-point','timescale-inc',
  'tintri','together-ai','tokenex','tokio-marine',
  'toll-free-forwarding','toptal','torcai','traceable',
  'trackman','tradeshift','transmit','tranzact',
  'treasuredata','treatwell','trend-micro','tresata',
  'trifacta','trillio','trim','trulioo','trustedid',
  'trustpilot-inc','truvalue','tulip','turo',
  'turvo','twingate','tyk','typetalk','ubiquity6',
  'udaan','uizard','unbounce','unily','uniqode',
  'unilog','unitq','upbound-inc','uppercue',
  'upside','urbanclap','urbansitter','userpilot',
  'usetiful','valence-inc','valr','valuecoders',
  'vangst','vantage-circle','varo-inc','vast-data',
  'vectorworks','vendr','venminder','veracross',
  'veraset','verdagy','veritas','verloop','veritone-inc',
  'versapay','vertafore','vertice','veryfi',
  'vessel','vibrant','vidmob','viewpoint-inc',
  'vimeo-inc','vindicia','vinta','virtual-health',
  'virtusa','visier-inc','vista-equity','vitally-inc',
  'vlocity','vmware','volansi','volley','vouch',
  'vrify','vue-storefront','vymo','wabbi','walrus',
  'wandera','warmly','wasp','watchful','waterfall',
  'wavelength','wayfair','weave-hq','webmd',
  'weights','wellthy','wepay','whatfix',
  'wheelhouse','whistic','widen','wild-apricot',
  'wildbit','wiliot','wilt','wingman','wise-inc',
  'wolfram','wonder-inc','wonderschool','woodpecker-co',
  'workboard-inc','workfront','workrise','workvivo',
  'worldremit','wow','wrike','wunderman',
  'xactware','xandr','xeno','xenoss','xero-inc',
  'xilinx','xmatters','xometry-inc','xos','xplor',
  'yakoa','yardi','yello','yext-inc','yieldmo',
  'yonder','yotpo-inc','youi','youthful','yousician',
  'zaius','zafgen','zamzam','zappi','zayo',
  'zedge','zendesk-inc','zenevents','zenoss',
  'zenpayroll','zenput','zetl','zetta','zextras',
  'zipari','zipdrug','zipline','zippia','zipwhip',
  'zivver','zocdoc','zoho-inc','zomato','zonda',
  'zonos','zoop','zoox','zscaler','zudy',
  'zumba','zuora-inc','zwift',
];

const ASHBY_ULTRA = [
  // AI/ML startups (2024-2025)
  'arcee','arise','bria','bytewave','cargo','chatgpt',
  'clarifai','clearly','clip','codestory','coframe',
  'cognition-ai','command','continual','cradle','cresta',
  'datachain','deep-origin','deepl','deepmind','dosu',
  'eightfold','equal','evervault','exafunction','fal-ai',
  'fireworks-ai','flower','foundational','futurehouse',
  'gather-ai','glaze','goose','grit','groundlight',
  'guardian','hallow','hamilton','harbor-ai','hive-ai',
  'hyperplane','ideogram','imbue','jigsaw','julep',
  'kira','koala-ai','kodiak','lamin','lastmile',
  'latent','lemur','lightning','liminal-ai','lmnt',
  'locofy','logicstar','luma','lyra','mage',
  'mango','marble','martian','merge-ai','mesa',
  'metabolic','metalab','midnight','mindsdb','mirascope',
  'modal-labs','morph','multimodal','navier','neosapience',
  'nim','nomic-ai','northstar','nova','nucleus-ai',
  'obsidian','octo-ai','olympus','omniscient','open-core',
  'operative','oracle-ai','orion','outerbase','outlines',
  'parallel','patron','penguin','pika','pixar',
  'playground','polymath','predbase','prism-ai','prompt',
  'quantum','quasar','radiant','raft','realm',
  'reboot','refuel','reka','relic','respell',
  'retro','reverie','revolt','robust','sage',
  'sakana','scalar','scale-ai','scribe','seed-ai',
  'sema','sentinel','shade','shift-ai','sierra',
  'signal-ai','simular','sketch-ai','slingshot','smith',
  'snowflake-ai','spark','spectrum','spiral','stack-ai',
  'stealth','steercode','stride','summit','surge',
  'sway','switch','synthesis','tactic','tavus',
  'tensor-ai','testament','theta','titan-ai','torch',
  'trace','trek','trinity','turbo','twelve-labs',
  'typeface','uform','umbra','unison','uplimit',
  'vanguard','vapor-ai','vector','venture','vertex-ai',
  'virtual','vivid','vortex','voyage','wave',
  'weaver','weka','whisper','willow','x-ai',
  'yonder-ai','zen','zephyr','zetta-ai','zodiac',
  // Dev tools 2024-2025
  'agentops','arcjet','autocode','backstage','bazel',
  'bit','bloop','bluesky','bruin','bun',
  'cabal','catalyst','chalk','charm','chirp',
  'clerk-dev','cloudcraft','codemod','codex','comet-dev',
  'comply-advantage','context-ai','cortex-dev','cosmo',
  'crossplane','cyclone','dagger-io','darklang','dash',
  'datadog-dev','dbt','decimal','devpod','devtool',
  'diagram','disco','dispatch','dolt','dynamo',
  'edge','encore','envio','epoch','evergreen',
  'fabric','falcon','fargate','firecracker','flame',
  'fleet','flip','flux','forge','fossil',
  'frontier','fullstack','fusion','galaxy','gate',
  'gleam','glimmer','globe','glow','grain',
  'graph','gravity','grove','gust','habitat',
  'halo','hammer','harbor-dev','harmony','harvest-dev',
  'haven','hawk','helix-dev','heron','hexagon',
  'horizon','houdini','hub','hybrid','hydra',
  'ignite','impulse','indent-dev','index','infrared',
  'inkdrop','insight','interlink','ion','iris',
  'ivy','jade','jasper-dev','jet','junction',
  'jupiter','karma-dev','kinetic','knight','kodex',
  'lander','lantern','laser','lattice-dev','launch',
  'lazer','legion','lens','lever-dev','lighthouse',
  'link','lion','liquid','lithium','loop',
  'lunar','lyric','magnet','mammoth','maple',
  'marina','mars','matrix','maven','mercury-dev',
  'meridian','meteor','micro','midnight-dev','mill',
  'mint','mirror','mocha','monarch','mono',
  'moonbeam','mosaic','motion','motive','nano',
  'native','nebula-dev','neon-dev','neptune','nexus',
  'nimbus-dev','node','nomad','north','nova-dev',
  'oasis','obsidian-dev','ocean','olive','omega',
  'onyx','opus','orbit-dev','origin','otter',
  'oxide','pacific','panda','panorama','parallel-dev',
  'parse','pathfinder','pattern','peak-dev','pearl',
  'phoenix','pillar-dev','pine','pioneer','pixel',
  'planet','plasma','pluto','polaris','polygon',
  'portal','presto','prime','proto','pulse-dev',
  'quasar-dev','quest','radar-dev','rainbow','raven-dev',
  'ray','reactor','reef','relay','render-dev',
  'retro-dev','ridge','ripple','rocket','root',
  'ruby','sail','sapphire','saturn','scout',
  'sequoia','shadow','shell','shield','signal',
  'silver','siren','slate','snow','solar',
  'sonic','spark-dev','sphere','spire','spring',
  'star','stellar-dev','stone','storm','strata',
  'studio','summit-dev','sun','swift','synth',
  'tango-dev','terra','thunder','tide','timber',
  'titan-dev','topaz','torch-dev','tower','trail',
  'tribune','trident','trophy','turbo-dev','twilight',
  'ultra','unified','universe','upstream','urban',
  'vanguard-dev','vault','velocity','venture-dev','verde',
  'vibe-dev','vine','violet','vision','vital',
  'vivid-dev','void','volt','vortex-dev','vulcan',
  'warden','wave-dev','web','whisper-dev','wild',
  'wind','wing','winter','wire','wolf',
  'wonder','zenith-dev','zero','zinc','zone',
];

const LEVER_ULTRA = [
  // Known Lever users
  'nerdwallet','netlify','kong','zapier','circleci',
  'calendly','lattice','webflow','figma','loom',
  'outreach','gong','iterable','census','fivetran',
  'metabase','airbyte','n8n','temporal','camunda',
  'snyk','algolia','contentful','miro','airtable',
  'twilio','intercom','zendesk','hubspot','freshworks',
  'docusign','asana','monday','clickup','pagerduty',
  'sentry','amplitude','mixpanel','gitlab','vercel',
  'close','copper','attio','folk','clay',
  'activecampaign','convertkit','hashnode','devto',
  'ably','pusher','livekit','daily','mux','cloudinary',
  'modal','replicate','buildship','flutterflow','retool',
  'deno','bun','railway','koyeb','speakeasy-api',
  'storybook','chromatic','launchdarkly','statsig',
  'rudderstack','hightouch','chatwoot','crisp','helpscout',
  'linear','shortcut','height','factor','immuta',
  'nrwl','scaleway','sonatype','stackhawk','tinybird',
  'verifiable','zilliz',
  // Additional Lever boards to try
  'affirm','allbirds','andela','appcues','applied',
  'asapp','axonius','benchling','birdeye','bluecore',
  'braintree','brightwheel','calm-com','carta','chainalysis',
  'checkout-com','chorus-ai','clari-ai','clubhouse',
  'cockroach-labs','contrast-security','conviva','criteo',
  'datadog-careers','dataminr','deel-com','deliverr',
  'dialpad','digital-ocean','drift','eco','epicor',
  'evisort','fanduel','farmwise','five9','forto',
  'gather-ai','genesys','gladly-inc','glitch',
  'gocardless','gorgias-inc','greenhouse-io','gremlin',
  'grove-hr','hackerone-careers','harver','heap-inc',
  'hiive','holistics-inc','homebase-com','hover-inc',
  'illumio','impartner','impira','indicative',
  'injective','inspectorio-inc','instrumental',
  'ironclad','jobandtalent','kaltura','keen-io',
  'kindred-inc','kinsta','lambdatest','latch-inc',
  'linqia','litmus','lockstep','logz-io',
  'luma','maestro','manifold','marshmallow',
  'medallia','meesho','mend','mercari',
  'mighty-networks','mindbody-careers','moat','mosaic',
  'moxion','nerdwallet-inc','netomi','nexhealth',
  'nightfall-ai','nodereal','nozomi','numberai',
  'observed','okendo','omnidian','onbe','onepeloton',
  'onto-innovation','openverse','optum','orbcomm',
  'outbound','overhaul','oyo','pacaso','patch-inc',
  'patron','payfit','payscale','peakon','perch',
  'persefoni','phreesia','ping-identity','podium-inc',
  'preset-io','primer-inc','procore-inc','protolabs',
  'qualified-inc','qualtrics','raisely','rapid7-careers',
  'rasa','recurate','reforge','relativity',
  'resilience-inc','rinse','ripjar','roadmunk',
  'rokt','rover','scale-api','schoology','scratchpad',
  'securonix','seismic-inc','sendoso','sensor-tower-inc',
  'showpad','sigma-computing','sked-social','snackpass',
  'sofar','sourcegraph-careers','spectro-cloud','spiff',
  'stackadapt','stairwell','strava','streamyard',
  'superhuman','superside','sure-inc','swiftly',
  'syndio','taboola','talkiatry','taskus','teachable-inc',
  'terminus','textio','thrasio','tines','tonal-inc',
  'topia','tradeshift','trax','trialspark',
  'trustpilot','turing-com','uniphore','unmind',
  'valimail','varo-money-inc','venafi','vida',
  'visier','walkme','wealthfront','wild-inc',
  'wistia','wonder','xactly','yotpo',
  'zenoti','zocdoc','zuora',
];

// ═══════════════════════════════════════════════════════════════

async function scrapeGreenhouse() {
  const unique = [...new Set(GH_ULTRA)];
  const all = [];
  let ok = 0;
  for (let i = 0; i < unique.length; i += 30) {
    const batch = unique.slice(i, i + 30);
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
    process.stdout.write(`\r  GH: ${Math.min(i + 30, unique.length)}/${unique.length} (${ok} valid, ${all.length} jobs)`);
  }
  console.log(`\n  ✅ Greenhouse: ${ok} boards, ${all.length} remote jobs`);
  return all;
}

async function scrapeAshby() {
  const unique = [...new Set(ASHBY_ULTRA)];
  const all = [];
  let ok = 0;
  for (let i = 0; i < unique.length; i += 25) {
    const batch = unique.slice(i, i + 25);
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
    process.stdout.write(`\r  Ashby: ${Math.min(i + 25, unique.length)}/${unique.length} (${ok} valid, ${all.length} jobs)`);
  }
  console.log(`\n  ✅ Ashby: ${ok} boards, ${all.length} jobs`);
  return all;
}

async function scrapeLever() {
  const unique = [...new Set(LEVER_ULTRA)];
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
    'frontend','backend','devops','golang','rust','java','swift',
    'flutter','aws','docker','kubernetes','nextjs','vue','angular',
    'graphql','redis','terraform','machine-learning','data-engineering',
    'php','scala','elixir','ios','android','react-native',
    'security','cloud','azure','gcp','blockchain','web3',
    'ai','llm','nlp','computer-vision','product-manager',
    'technical-writer','api','ruby','c-sharp','dotnet',
    'spring-boot','django','flask','fastapi','laravel',
    'wordpress','shopify-dev','magento','drupal',
    'selenium','cypress','playwright','testing',
    'embedded','firmware','fpga','vhdl','verilog',
    'networking','linux','unix','bash','powershell',
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
  console.log('🔍 WAVE 9 ULTRA-WIDE SCRAPER\n');

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

  writeFileSync(OUTPUT_PATH, JSON.stringify(onePerCo, null, 2));
  console.log(`\n✅ Saved ${onePerCo.length} jobs to ${OUTPUT_PATH}`);
}

main().catch(console.error);
