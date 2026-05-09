/**
 * scrape-wave10.mjs — WAVE 10: Scrape from WorkAtAStartup, Wellfound, etc.
 * 
 * NEW approach: fetch actual directories of companies + their ATS links
 * Plus: brute-force more Greenhouse/Ashby/Lever slugs from tech company names
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave10-jobs.json';
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
// WAVE 10 — Yet another batch of company name guesses
// Focus: common English words that tech companies use as names
// ═══════════════════════════════════════════════════════════════

// Companies named after common words (very common in tech)
const WORD_SLUGS = [
  // Nature/Space
  'aurora','bamboo','bloom','canyon','cascade','cedar','cloud','coral',
  'crystal','cypress','dawn','delta','drift','dune','echo','ember',
  'falcon','flame','flora','forge','frost','garden','glacier','grove',
  'harbor','harvest','haven','horizon','island','ivy','jasmine','kelp',
  'lark','leaf','light','lotus','maple','meadow','mesa','mist',
  'moss','oak','oasis','ocean','olive','orchid','palm','peak',
  'pine','pond','prism','rain','reef','ridge','river','root',
  'sage','sand','shore','sky','slate','snow','spring','sprout',
  'stone','storm','summit','terra','thunder','tide','timber','torch',
  'trail','tree','valley','vine','wave','willow','wind','winter',
  // Objects/Concepts
  'anchor','arrow','atlas','axle','badge','banner','beacon','bell',
  'blade','block','bloom','bolt','bond','bridge','canvas','cape',
  'chain','charm','cipher','circle','cipher','climb','clock','code',
  'coin','compass','core','craft','crown','cube','dash','dial',
  'dome','door','edge','engine','fiber','field','flag','flare',
  'flow','frame','gate','gear','gem','glow','grid','guide',
  'halo','hammer','helm','hive','hook','hub','ink','iron',
  'jar','jet','key','kite','knot','lamp','lane','layer',
  'lens','lever','line','link','lock','loop','magnet','map',
  'mark','mask','maze','mesh','mill','mint','mirror','mold',
  'nest','net','node','note','orbit','panel','patch','path',
  'pearl','pier','pilot','pipe','pixel','plan','plate','plug',
  'pod','point','pole','pool','port','post','power','press',
  'pulse','quill','radar','rail','ray','relay','ring','rod',
  'rope','route','rule','sail','scale','scope','seal','seed',
  'shaft','shell','shift','sign','silk','silo','slab','slot',
  'snap','socket','spark','spool','stack','stage','stamp','stand',
  'stem','step','stitch','strip','strut','switch','tab','tag',
  'tape','thread','tile','toggle','tool','track','trap','tube',
  'valve','vault','veil','vent','verge','vest','view','vine',
  'wand','web','wedge','wheel','wick','wing','wire','zone',
  // Animals
  'ant','bear','bee','bird','bull','cat','cobra','crow','deer',
  'dog','dove','dragon','eagle','elk','falcon','fish','fox',
  'frog','goat','hawk','heron','horse','jaguar','lion','lynx',
  'mantis','moth','orca','osprey','otter','owl','panda','parrot',
  'pelican','phoenix','python','raven','robin','salmon','seal',
  'shark','snake','spider','squid','stag','swan','tiger','turtle',
  'viper','wasp','whale','wolf','wren','zebra',
  // Tech-y words
  'agile','alpha','amp','apex','arc','auto','axiom','base',
  'beta','bit','byte','cache','calc','chip','circuit','click',
  'clone','cluster','codec','cog','config','console','crypto',
  'data','debug','deploy','dev','digit','docker','flux',
  'gamma','git','glitch','graph','hack','hash','hex','http',
  'hyper','index','input','kernel','lambda','link','log','loop',
  'macro','matrix','mega','meta','micro','mode','module','nano',
  'neural','nexus','node','null','omega','open','output','packet',
  'parse','patch','ping','pixel','query','queue','ram','render',
  'root','runtime','scalar','schema','script','server','session',
  'signal','socket','source','stack','string','struct','sync',
  'syntax','system','table','tensor','thread','token','trace',
  'tuple','type','ultra','unit','unix','vector','version','virtual',
  'void','web','widget','wire','zero',
  // Colors  
  'amber','azure','black','blue','bronze','brown','cobalt','copper',
  'coral','crimson','cyan','ebony','emerald','gold','green','grey',
  'indigo','ivory','jade','lavender','lilac','lime','magenta',
  'maroon','navy','ochre','olive','onyx','orange','pearl','pink',
  'plum','purple','red','rose','ruby','rust','saffron','sapphire',
  'scarlet','silver','teal','topaz','turquoise','violet','white','yellow',
  // Adjectives companies use
  'agile','bold','bright','clear','clever','cool','deep','fast',
  'fresh','good','grand','great','happy','keen','kind','lean',
  'light','live','loud','lucky','major','mighty','neat','noble',
  'open','prime','pure','quick','rapid','real','rich','safe',
  'sharp','simple','smart','smooth','solid','steady','super','sure',
  'sweet','swift','true','vast','vital','vivid','warm','wise',
];

// Deduplicate and create all 3 ATS variants
const ALL_SLUGS = [...new Set(WORD_SLUGS)];

async function bruteForceBoards() {
  const allJobs = [];
  
  console.log(`Testing ${ALL_SLUGS.length} word-based slugs across GH/Ashby/Lever...\n`);
  
  // Greenhouse
  let ghOk = 0;
  for (let i = 0; i < ALL_SLUGS.length; i += 40) {
    const batch = ALL_SLUGS.slice(i, i + 40);
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        const d = await fetchJSON(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`);
        if (!d?.jobs?.length) return [];
        ghOk++;
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
      if (r.status === 'fulfilled') allJobs.push(...r.value);
    }
    process.stdout.write(`\r  GH: ${Math.min(i+40, ALL_SLUGS.length)}/${ALL_SLUGS.length} (${ghOk} valid, ${allJobs.length} jobs)`);
  }
  console.log(`\n  ✅ GH: ${ghOk} valid boards`);

  // Ashby
  const jobsBefore = allJobs.length;
  let ashbyOk = 0;
  for (let i = 0; i < ALL_SLUGS.length; i += 30) {
    const batch = ALL_SLUGS.slice(i, i + 30);
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        const d = await fetchJSON(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
        if (!d?.jobs?.length) return [];
        ashbyOk++;
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
      if (r.status === 'fulfilled') allJobs.push(...r.value);
    }
    process.stdout.write(`\r  Ashby: ${Math.min(i+30, ALL_SLUGS.length)}/${ALL_SLUGS.length} (${ashbyOk} valid, ${allJobs.length - jobsBefore} jobs)`);
  }
  console.log(`\n  ✅ Ashby: ${ashbyOk} valid boards`);

  // Lever
  const jobsBefore2 = allJobs.length;
  let leverOk = 0;
  for (let i = 0; i < ALL_SLUGS.length; i += 25) {
    const batch = ALL_SLUGS.slice(i, i + 25);
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        const d = await fetchJSON(`https://api.lever.co/v0/postings/${slug}?mode=json`);
        if (!Array.isArray(d) || !d.length) return [];
        leverOk++;
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
      if (r.status === 'fulfilled') allJobs.push(...r.value);
    }
    process.stdout.write(`\r  Lever: ${Math.min(i+25, ALL_SLUGS.length)}/${ALL_SLUGS.length} (${leverOk} valid, ${allJobs.length - jobsBefore2} jobs)`);
  }
  console.log(`\n  ✅ Lever: ${leverOk} valid boards`);

  return allJobs;
}

async function scrapeJobicy() {
  const tags = ['react','typescript','node','fullstack','python','javascript',
    'frontend','backend','devops','golang','rust','java','swift',
    'flutter','aws','docker','kubernetes','nextjs','vue','angular',
    'graphql','redis','terraform','machine-learning','data-engineering',
    'php','scala','elixir','ios','android','react-native',
    'security','cloud','azure','gcp','blockchain','web3',
    'ai','llm','nlp','computer-vision','ruby','c-sharp','dotnet',
    'spring-boot','django','flask','fastapi','laravel',
    'wordpress','selenium','cypress','testing',
    'embedded','linux','networking',
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
  console.log('🔍 WAVE 10 — Word-based Brute Force Discovery\n');

  const [boards, jobicy] = await Promise.all([
    bruteForceBoards(),
    scrapeJobicy(),
  ]);

  const allJobs = [...boards, ...jobicy];
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

  writeFileSync(OUTPUT_PATH, JSON.stringify(onePerCo, null, 2));
  console.log(`\n✅ Saved ${onePerCo.length} jobs to ${OUTPUT_PATH}`);
}

main().catch(console.error);
