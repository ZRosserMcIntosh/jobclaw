/**
 * scrape-wave18.mjs — WAVE 18: Number-word combos + SaaS pattern words + Music/Art/Science terms
 *
 * Strategy:
 * 1. Number-word combos (7shifts, 8base, 6sense pattern)
 * 2. Common SaaS product words (dock, beam, cast, etc. with suffixes)
 * 3. Music/art/science terms (tempo, cadence, rhythm, prism, helix)
 * 4. Double words with "and" ("salt-and-pepper" style → "bread", "butter")  
 * 5. Short 3-letter words (ace, arc, apt, axe, etc.)
 * 6. Tech portmanteau words (Spotify-style blends)
 */

import { writeFileSync, readFileSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave18-jobs.json';
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

// 1. Number-word combos
const NUMS = ['1','2','3','4','5','6','7','8','9','10','11','12','13','15','20','21','42','99','100','360','404','500'];
const NUM_WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','twenty','hundred'];
const WORDS_FOR_NUMS = ['shift','sense','base','signal','cloud','stack','path','flow','point','grid','step','mile','star','bear','fox','bit','day','way','line','spark'];
for (const n of NUMS) {
  for (const w of WORDS_FOR_NUMS.slice(0, 10)) {
    SLUGS.add(n + w);
    SLUGS.add(w + n);
  }
}
for (const nw of NUM_WORDS) {
  for (const w of WORDS_FOR_NUMS.slice(0, 8)) {
    SLUGS.add(nw + w);
    SLUGS.add(nw + '-' + w);
  }
}

// 2. Music/Art/Science terms
const SCIENCE_ART = [
  'acumen','allegro','alto','amplitude','andante','anthem','apex','aria',
  'axiom','ballad','bass','baton','cadence','calliope','canvas','cello',
  'chord','chorus','cipher','circuit','clef','codex','concord','crescendo',
  'crucible','crystal','curator','decibel','dialect','diction','duet',
  'echo','element','ellipse','emblem','encore','enigma','ensemble','epoch',
  'equinox','ether','eureka','fable','factor','ferment','fibonacci','fidelity',
  'filament','flux','formula','forte','fractal','fusion','galactic','genome',
  'glyph','gradient','gravitas','harmonic','helix','hexagon','hymn','icon',
  'ignition','impulse','index','infinity','ion','isotope','kaleidoscope',
  'keynote','kinesis','lattice','lexicon','lumen','lyric','mantra','matrix',
  'melody','memoir','metaphor','meter','micro','mnemonic','modular','molecule',
  'momentum','mosaic','motif','muse','nebula','nexus','nimbus','notation',
  'nova','nucleus','octave','omega','opus','orbit','origin','overture',
  'palette','paradox','parallax','particle','pattern','pendulum','phantom',
  'photon','pixel','planck','plasma','plexus','polymer','praxis','precept',
  'prelude','prism','prodigy','prologue','proton','pulse','quanta','quantum',
  'quasar','quill','radiant','radius','ratio','reflex','relay','render',
  'resonance','rhapsody','rhythm','riddle','rubric','rune','saga','schema',
  'scribe','scroll','signal','silhouette','siren','sketch','sonata','sonic',
  'sonar','soprano','spectrum','spiral','stanza','strata','strobe','summit',
  'symphony','syntax','tableau','tempo','tensor','theorem','thesis','timbre',
  'tonic','totem','treble','tribute','trilogy','tripod','trope','tuning',
  'umbra','unison','valve','vector','velocity','venture','verse','vertex',
  'vibrant','vigil','virtuoso','vortex','wavelength','zenith','zephyr',
];

for (const word of SCIENCE_ART) {
  SLUGS.add(word);
}

// 3. Three-letter words (many companies are 3-letter names)
const THREE_LETTER = [
  'ace','act','add','age','ago','aid','aim','air','all','ant','ape','apt',
  'arc','ark','arm','art','ash','ask','awe','axe','bay','bed','bet','bid',
  'big','bit','bow','box','bud','bug','bus','buy','cab','cam','cap','car',
  'cat','cog','cop','cow','cry','cub','cup','cur','cut','dam','dew','dig',
  'dim','dip','dog','dot','dry','dub','due','dug','dun','duo','dye','ear',
  'eat','egg','ego','elm','emu','end','era','eve','ewe','eye','fad','fan',
  'far','fat','fax','fed','fee','few','fig','fin','fir','fit','fix','fly',
  'foe','fog','fop','for','fox','fry','fun','fur','gab','gag','gal','gap',
  'gas','gem','get','gig','gin','gnu','god','got','gum','gun','gut','guy',
  'gym','had','ham','hat','hay','hem','hen','her','hew','hex','hid','him',
  'hip','hit','hog','hop','hot','how','hub','hue','hug','hum','hut','ice',
  'icy','ill','imp','ink','inn','ion','ire','irk','ivy','jab','jag','jam',
  'jar','jaw','jay','jet','jig','job','jog','joy','jug','jut','keg','ken',
  'key','kid','kin','kit','lab','lad','lag','lap','law','lay','lea','led',
  'leg','let','lid','lie','lip','lit','log','lot','low','lug','mad','map',
  'mar','mat','maw','may','men','met','mid','mix','mob','mod','mop','mow',
  'mud','mug','nab','nag','nap','net','new','nil','nip','nit','nod','nor',
  'not','now','nun','nut','oak','oar','oat','odd','ode','off','oft','ohm',
  'oil','old','one','opt','orb','ore','our','out','owe','owl','own','pad',
  'pal','pan','pap','par','pat','paw','pay','pea','peg','pen','per','pet',
  'pew','pie','pig','pin','pit','ply','pod','pop','pot','pow','pox','pro',
  'pry','pub','pug','pun','pup','pus','put','qua','rag','ram','ran','rap',
  'rat','raw','ray','red','ref','rib','rid','rig','rim','rip','rob','rod',
  'roe','rot','row','rub','rug','rum','run','rut','rye','sac','sad','sag',
  'sap','sat','saw','say','sea','set','sew','shy','sin','sip','sir','sis',
  'sit','six','ski','sky','sly','sob','sod','son','sop','sot','sow','soy',
  'spa','spy','sty','sub','sue','sum','sun','sup','tab','tad','tag','tan',
  'tap','tar','tat','tax','tea','ten','the','tie','tin','tip','tit','toe',
  'ton','too','top','tot','tow','toy','try','tub','tug','tun','two','urn',
  'use','van','vat','vet','vex','via','vie','vim','vow','wad','wag','war',
  'was','wax','way','web','wed','wet','who','wig','win','wit','woe','wok',
  'won','woo','wow','yak','yam','yap','yaw','yea','yes','yet','yew','yip',
  'you','zap','zed','zen','zig','zip','zoo',
];

for (const w of THREE_LETTER) {
  SLUGS.add(w);
}

// 4. Tech portmanteau / blend words (Spotify-style)
const PORTMANTEAU = [
  'amplifi','appointy','asana','atera','atlassian','basecamp','beehiiv',
  'betterment','bitly','blinkist','booksy','calendly','canopy','capterra',
  'chatwoot','circleci','clickup','cloudinary','codeium','contentstack',
  'convertkit','datadog','digistore','docsend','doodle','drawio','dropzone',
  'easyship','engagio','eventbrite','evergreen','expandi','flodesk','freshdesk',
  'grammarly','gridsome','growthbar','gumroad','helpjuice','helpwise','hotlink',
  'hubstaff','instabug','integromat','invoicely','jobber','jotform','klenty',
  'lastpass','leankit','lessonly','linktree','livekit','loomly','mailchimp',
  'mailerlite','mailtrap','manychat','mindmeister','monday','moosend','notionhq',
  'nutshell','ontraport','outgrow','pandadoc','paperform','pardot','paychex',
  'paylocity','paymo','peakon','pendo','pingdom','pipedrive','pitchbook',
  'podia','printful','privy','proofhub','pushover','quickbooks','reachdesk',
  'rebrandly','recurly','renderforest','restream','retently','ringcentral',
  'rocketreach','salesflare','salesforce','samcart','scorpion','seedprod',
  'sellsy','sendgrid','sendinblue','serpstat','shipbob','shipstation',
  'signaturely','simvoly','sketchdeck','skillshare','sleeknote','smartlook',
  'sprinklr','squarespace','stackadapt','startinfinity','statuspage',
  'storyblok','streamyard','survicate','swipepages','teamwork','teachable',
  'textmagic','thinkific','tidio','timetastic','toggl','trainual',
  'translatepress','tweetdeck','typebot','unscreen','userflow','userpilot',
  'venngage','vidnoz','viraltag','visme','wistia','woocommerce','wordtune',
  'workflowy','yoast','zenchat','zocdoc','zyro',
];

for (const p of PORTMANTEAU) SLUGS.add(p);

// 5. More known companies from various sources
const MORE_COMPANIES = [
  'abnormal','acquia','aha','airship','aiven','alation','algorithmia','allbirds',
  'amplemarket','anyscale','apero','appfire','appian','archera','arize','armis',
  'atlan','attentive','axon','bazaarvoice','benevity','betterup','bigcommerce',
  'bizzabo','block','blockdaemon','bloom','bluevine','boldstart','bright',
  'builderai','bynder','calix','cameo','cape','carta','cedar','celsius',
  'ceros','chameleon','chargebee','chronosphere','clari','clearco','cleverly',
  'clockwork','clubhouse','codility','cohesity','community','compliant',
  'contentgine','coreweave','costar','cube','curology','darktrace','dataiku',
  'dataminr','devoted','dialpad','divvy','docebo','dragonfly','drift',
  'dumpling','eightfold','elastic','element','emotive','endpoint','enigma',
  'envision','ethos','exact','exiger','expel','extend','fathom','feather',
  'fellow','fidelity','finicity','fireblocks','flock','flow','follow',
  'forethought','formed','foundry','frontier','galileo','gamma','glia',
  'golden','grail','gremlin','grove','groww','guide','guru','handle',
  'harbor','harvest','hero','highspot','hive','homebase','hopscotch',
  'humio','hunter','hyper','illumin','immersive','imprint','incode',
  'instawork','integrate','invoca','island','jellysmack','karat','keeper',
  'kindbody','koala','kore','lacework','laika','lambdatest','lane',
  'lattice','layer','levelpath','levity','lilt','limeade','litmus',
  'liveperson','logz','lookout','luminai','mainstreet','mavenlink','medely',
  'megaport','metarouter','mews','mindtickle','mirakl','miro','modern',
  'momentive','monto','mosaic','motif','motus','mural','navan','netomi',
  'nightwatch','nimbella','notion','observe','octane','omada','ontra',
  'openpath','orca','outreach','outschool','oyster','pacaso','paladin',
  'patch','pave','pax','persona','phenom','plaid','platform','plivo',
  'porter','prelude','profitwell','propel','proton','qualified','quince',
  'radar','rappi','reachable','recurly','relay','remote','render',
  'rentable','rho','ripple','roadmap','rootstock','rosetta','runway',
  'safebase','salesloft','salt','sardine','scale','sealevel','sendoso',
  'sharpen','shelf','shippo','sidekick','signify','simplisafe','sisu',
  'smartbear','snappy','socialchorus','solink','sourcegraph','spendesk',
  'spire','splash','springboard','sprout','standard','stellar','stitch',
  'strive','subway','superside','surfline','sweep','symbl','synthesis',
  'tanium','taskus','tessian','thoropass','tiger','timber','tonal',
  'toptal','tracelink','transcend','trax','treehouse','truebill','trunk',
  'trustpilot','turbonomic','ultimate','unqork','upsend','upside','urban',
  'vault','velociti','vendr','vercel','vertex','video','vital','voxel',
  'walkme','wanderlust','warmly','watchful','wayflyer','weave','whisper',
  'wildcard','wishlist','wonderschool','workrise','workstream','worthy',
  'xendit','xometry','yield','yonder','zamboni','zeitgeist','zing','zipline',
];

for (const c of MORE_COMPANIES) SLUGS.add(c);

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
  console.log('🔍 WAVE 18 — Numbers + Science/Art + 3-letter + Portmanteau + More companies\n');
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
