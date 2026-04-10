/**
 * scrape-wave25.mjs — WAVE 25: Numeric + Abbreviated company names
 *
 * Strategy: Companies with numbers (8x8, 6sense, 1Password, 99designs),
 * 2-3 letter abbreviations, and common tech naming patterns like
 * {verb}{noun}, {adj}{noun} single-word compounds.
 */

import { writeFileSync, readFileSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave25-jobs.json';
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

// Companies with numbers in their names
const NUMBERED = [
  '1password','1point21','2checkout','2u','3box','3m','3pillar','42','4cast',
  '4imprint','5ly','6river','6sense','7bridges','7shifts','8base','8bitdo',
  '8flow','8x8','9count','10up','10x-genomics','15five','17zuoye','1stdibs',
  '1010data','21vianet','23andme','24-7','247ai','2gether','2nd-gear',
  '3play-media','42crunch','42technologies','4d','4degrees','500px','511',
  '5x','60decibels','6connex','6-degrees','7digital','7-eleven','72-sold',
  '8th-wall','9fin','99designs','99minutos',
];

// {Verb}{Noun} compound names (popular startup pattern)
const VERB_NOUN = [
  'buildfire','buildkite','buildzoom','catchpoint','chainstack','clockwork',
  'clicksend','clickfunnels','clickhouse','codeclimate','codestream',
  'codesignal','crunchbase','crossbeam','crowdstrike','dashbird','deskpro',
  'dialpad','docusign','driveway','eventbrite','filepath','fireblocks',
  'flowspace','flywheel','folderly','formstack','framenet','freshworks',
  'getlabs','groovecar','growthbook','guidepoint','hackrank','headcount',
  'helpshift','hireright','hirelogic','holdstation','icedrive','jumpcloud',
  'kickboard','kickstarter','laserfiche','liftoff','livestorm','lockstep',
  'makeswift','markforged','matchcraft','mindbridge','movespring','netspring',
  'openphone','openview','outreach','packfleet','pageproof','parkwhiz',
  'passfort','paylocity','playvox','plugshare','podcastle','pushpay',
  'reachdesk','ringcentral','risecalendar','rollworks','runscope','sailpoint',
  'scaleai','sealdata','searchlight','sellfire','sendgrid','sendbird',
  'sendoso','shipmonk','shopmonkey','showpad','sightmachine','singlewire',
  'slackline','snaplogic','sparkpost','stackpath','starfish','startree',
  'steerpath','stickermule','storecove','storefront','streamsets','talkdesk',
  'taskrabbit','teachable','teampay','thinkcyte','touchbistro','trackstar',
  'tradeshift','travelport','trustpilot','turnstile','twingate','typeform',
  'uploadcare','watchguard','webflow','workboard','workfront','workrise',
  'yieldstreet',
];

// Compound words (no hyphen) - popular naming pattern
const COMPOUNDS = [
  'afterpay','airbase','airbnb','airship','airtable','appfire','appfolio',
  'backblaze','bandwidth','basecamp','beamery','benchmark','betterment',
  'birdeye','blackbird','blackrock','blockchain','bluecrew','blueground',
  'bluepoint','blueshift','blueyard','bookkeeper','braintree','brightedge',
  'brighthire','broadcom','buyerquest','bytedance','carecloud','cargoone',
  'cashapp','castlight','centercode','chainlink','checkpoint','clearcover',
  'clearpoint','cloudflare','coindesk','colossyan','comerica','contently',
  'coolfire','cratedb','crossover','darkbeam','datadome','deepscribe',
  'directiq','doorbell','dreamhost','drizly','dropbox','duckbill','earthlink',
  'easypost','edgecase','endpoint','engagedly','eventbrite','evertrue',
  'factset','fairmarkit','fastspring','firebolt','fireeye','firstbase',
  'firstround','fishtown','fleetcor','flipkart','flockjay','flywire',
  'footprint','formlabs','foxpass','freightos','freshpet','frontline',
  'fullstory','fundera','gamechanger','gearbox','glassdoor','globant',
  'goldfinch','graylog','greenlight','gridspace','growthloop','guardrails',
  'hackajob','headspace','healthify','heartbeat','helpscout','highspot',
  'homelight','hopscotch','hubspot','hyperion','icebreaker','instabase',
  'ironclad','jetstack','joyride','jumpstart','justcall','justworks',
  'keystone','kickboard','kindbody','kingsway','landbot','landgrid',
  'lastpass','launchpad','lendingclub','liferaft','lightbend','lightspeed',
  'limelight','locksmith','logicgate','longshot','lookahead','mailgun',
  'mainstreet','mapquest','mattermost','meshcloud','metalab','mindtickle',
  'moonfrog','moonpay','nearfield','netdata','newfront','newsbreak',
  'nightowl','ninjavan','nubank','onelogin','onespace','openspace',
  'overbond','overhaul','overflow','overstory','packetfabric','parkbee',
  'passbase','pathlight','payoneer','peacock','pingboard','plangrid',
  'podpoint','priceline','proofpoint','pushowl','rainforest','reachify',
  'redpoint','ringover','ripplematch','riskified','roadmunk','rockset',
  'rootstock','safeguard','saleshood','saltstack','sandstorm','scalefast',
  'seamless','seedcamp','seismic','serverfarm','sharepoint','shipyard',
  'shortlist','sidecar','sightline','silkroad','singlepoint','skyflow',
  'slackbot','smartbear','smartcat','smartsheet','snapcraft','snowflake',
  'softbank','soundcloud','sparkfun','spotinst','starboard','starlink',
  'statuspage','stockpile','stoneridge','stoplight','stormwind','streamline',
  'strikeforce','sunlight','sunstone','superblocks','surfline','sweetgreen',
  'taskflow','taxbit','teamwork','techstars','testcraft','textline',
  'tidepool','timberland','topbloc','touchstone','tradedesk','trendmicro',
  'triplewhale','truckstop','trustwave','uberflip','underdog','unitedmasters',
  'vaultree','vendasta','viewpoint','voiceflow','wealthbox','westpac',
  'whitehat','wildfire','windhaven','wingman','wireguard','workshare',
  'worldcoin','yardstick','zeroboard','zipline','zoominfo',
];

for (const s of [...NUMBERED, ...VERB_NOUN, ...COMPOUNDS]) SLUGS.add(s);

// 2-3 letter abbreviations that could be company slugs
const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
for (const a of letters) {
  for (const b of letters) {
    SLUGS.add(a + b); // 2-letter: aa, ab, ac...
  }
}
// Popular 3-letter combos only (not all 17k possibilities)
const THREE_LETTER = [
  'aaa','abc','acl','acm','acs','adp','aew','afn','agc','aig','aim','air',
  'ajr','akf','alb','amc','ami','amp','ams','ant','api','app','apt','arb',
  'arc','arm','art','ash','ask','atc','att','aud','ava','aws','axe','axl',
  'bam','ban','bar','bat','bci','bdg','bee','ben','bet','bfi','bgc','big',
  'bin','bio','bis','bit','bkr','blk','blz','bmc','bmg','bmo','bnp','bob',
  'bok','bom','box','bpm','brb','brn','bsc','bsx','btn','bud','bug','bus',
  'buy','bwt','cab','cam','cap','car','cat','cbs','ccl','cdn','ceo','cgn',
  'chi','cim','cis','cli','cls','cmd','cmp','cms','cna','cni','cnx','cod',
  'cog','com','con','cop','cor','cox','cpu','crm','cru','csc','css','csv',
  'ctc','ctr','cup','cvs','dab','dag','dam','dao','dap','dat','dbx','dec',
  'del','dev','dex','dfs','dig','dim','dip','dis','diy','dlr','dms','dns',
  'doc','dom','dot','dps','dry','dsp','dtr','duo','dvr','dxc','ear','eat',
  'ebs','eco','edp','ehr','elf','elm','emi','enc','eng','eos','epc','erp',
  'ess','etc','eth','etl','eur','evo','ewt','eye','fab','fam','fan','far',
  'fax','fbi','fdn','fig','fin','fit','fix','flg','fly','fob','fog','fox',
  'frm','fst','ftc','ftx','fun','fur','fyi','gab','gal','gap','gas','gcp',
  'gen','geo','get','gig','gin','git','glu','gmb','gns','gnu','gob','gov',
  'gps','gpu','grn','gui','gun','gut','gym','hab','hat','hbo','hcl','hdl',
  'hex','hgv','hip','hit','hiv','hmm','hms','hog','hop','hot','hpc','hrs',
  'hub','hue','ibm','ice','ics','ide','ids','ifs','img','inc','ink','inn',
  'int','ion','ios','iot','ipo','irl','irs','isc','isp','iss','ivy','jab',
  'jam','jar','jaw','jay','jet','jig','jit','job','jog','joy','jpm','jsx',
  'key','kid','kin','kit','kms','lab','lac','lag','lap','law','lay','lcd',
  'led','leg','let','lib','lid','lin','lip','lit','llc','llm','log','lok',
  'lot','low','lts','mac','mad','mag','man','map','max','may','med','meg',
  'mem','met','mgm','mic','mid','min','mir','mit','mix','mlb','mls','mob',
  'mod','mol','mom','mop','mos','mov','mpc','mri','msg','msp','mtn','mud',
  'mug','mvp','nab','nap','nba','ncr','nda','neo','net','new','nfc','nfl',
  'nft','ngo','nih','nit','nlp','noc','nor','not','now','npm','nps','nrg',
  'nsa','nsf','nsp','ntc','nxt','oak','oat','odd','ode','ofr','ohm','oil',
  'old','one','ong','ons','ooh','opc','ops','opt','orb','org','orm','osb',
  'oss','otc','out','ova','ovh','owl','own','oxo','pad','pan','par','pat',
  'paw','pay','pbi','pcb','pci','pdf','peg','pen','per','pet','pgp','phi',
  'pic','pid','pig','pin','pip','pir','pit','pix','pkg','plc','plt','plx',
  'pod','pop','pot','pow','ppc','ppm','pro','pry','psi','pub','pug','put',
  'pvt','pwc','qat','qos','qty','que','rad','rag','ram','ran','rap','rat',
  'raw','ray','rcm','rds','rec','red','ref','reg','rem','rep','res','rev',
  'rex','rgb','rig','rim','rio','rip','rks','rms','rnc','rng','rob','roc',
  'rod','roe','roi','rom','rot','row','rpc','rpm','rps','rsm','rss','rtb',
  'rtc','rto','rts','rug','rum','run','rut','rvn','rye','sac','sad','sag',
  'sap','sat','saw','sba','sbi','sci','sdk','sea','sec','seg','sem','sep',
  'seq','ses','set','sew','sfr','sha','she','sho','shy','sig','sim','sin',
  'sip','sir','sit','six','ski','sky','sms','soc','sol','son','sop','sos',
  'sow','sox','spa','spy','sql','src','srm','ssl','sso','ste','stm','stp',
  'str','stx','sub','sue','sum','sun','sup','sur','svb','svg','swf','sys',
  'tab','tag','tan','tap','tar','tax','tcp','tea','ted','ten','tex','ths',
  'tic','tie','til','tin','tip','tls','tnt','toe','ton','too','top','tor',
  'tot','tow','toy','tps','try','tsx','ttl','tub','tug','tux','tvs','two',
  'txt','udp','umi','uni','uno','ups','url','urn','usb','usd','use','usp',
  'uxo','vai','val','van','var','vat','vcr','vcs','vet','via','vid','vim',
  'vin','vip','vis','viz','vnc','vol','von','vox','vpn','vps','vue','wad',
  'wan','war','wax','way','web','wen','wet','who','wig','win','wit','wiz',
  'wok','won','woo','wow','xml','xor','yak','yam','yap','yaw','yep','yes',
  'yet','yew','yin','you','zag','zap','zen','zig','zip','zoo',
];
for (const s of THREE_LETTER) SLUGS.add(s);

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
  console.log('🔍 WAVE 25 — Numbered Companies + Compounds + Abbreviations\n');
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
