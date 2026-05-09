/**
 * scrape-wave11.mjs — WAVE 11: Compound names, abbreviations, and variations
 * 
 * Strategy: tech companies often use compound words, abbreviations, or 
 * creative spellings. Also try -hq, -io, -ai, -labs, -dev suffixes.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave11-jobs.json';
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

// Compound tech names + suffix variants
const BASE_WORDS = [
  'air','all','any','app','arc','art','auto','back','base','beam',
  'bench','best','big','bit','black','blue','board','boost','box','brain',
  'bright','broad','build','care','center','chart','check','chief','city','class',
  'clear','click','clip','close','club','coach','color','command','connect','content',
  'control','cook','cool','copy','count','cover','cross','crowd','crystal','custom',
  'cyber','daily','dark','dash','deal','deck','deep','desk','direct','disk',
  'dream','drive','drop','east','easy','edge','end','energy','event','ever',
  'exact','express','eye','face','fair','fast','feed','field','file','fill',
  'find','fine','fire','first','fit','five','fix','flash','flat','flight',
  'float','floor','fly','focus','food','foot','force','form','forward','four',
  'free','front','full','fun','fund','gain','game','gap','general','get',
  'glass','global','go','gold','good','grab','grand','great','green','group',
  'grow','growth','guard','guide','gut','half','hand','hang','hard','head',
  'health','heart','heat','help','hero','high','hill','hit','hold','home',
  'hot','house','human','hunt','hyper','ice','idea','image','impact','in',
  'info','inner','insight','instant','intel','inter','iron','item','jack','jet',
  'job','join','joy','jump','just','keep','kind','king','kit','know',
  'lab','land','large','last','late','launch','law','lead','lean','learn',
  'left','less','level','life','lift','lime','link','list','little','live',
  'local','logic','long','look','love','low','luck','magic','main','make',
  'manage','map','mark','market','mass','master','match','max','mean','media',
  'meet','member','mind','mini','mint','mix','mob','modern','money','moon',
  'more','motion','motor','mount','move','much','multi','music','near','need',
  'net','new','next','night','nine','no','north','note','now','number',
  'offer','office','on','one','only','open','opt','order','organic','origin',
  'out','outer','over','own','pace','pack','page','pair','paper','park',
  'part','pass','path','pay','peace','pen','perfect','permit','pick','piece',
  'place','plan','plant','play','plaza','plus','pocket','point','pop','post',
  'power','press','prime','print','pro','product','profit','project','proof',
  'prop','public','pull','pump','pure','push','put','quality','quest','quick',
  'quiet','quote','race','rack','rain','raise','range','rank','rate','raw',
  'reach','read','ready','real','record','red','reel','rent','report','rest',
  'result','rich','ride','right','rise','road','rock','roll','room','round',
  'row','rule','run','rush','safe','sage','sale','sample','sand','save',
  'say','screen','search','seat','second','secure','see','self','sell',
  'send','sense','serve','set','shape','share','sharp','sheet','shift','ship',
  'shop','short','show','side','sight','sign','silver','simple','single','site',
  'six','size','skill','skin','sky','sleep','slide','slim','slow','small',
  'smart','smooth','snap','social','soft','solid','sort','sound','source','south',
  'space','speak','speed','spend','spot','square','stable','staff','stage','stand',
  'standard','star','start','state','station','stay','steady','step','stock','stone',
  'stop','store','story','straight','street','stretch','strike','string','strong',
  'studio','style','sub','success','sugar','sum','sun','super','supply','support',
  'sure','surf','surge','sweet','swift','swing','system','table','tag','tail',
  'take','talent','talk','tall','tank','tap','target','task','taste','tax',
  'teach','team','tech','tell','ten','term','test','text','thick','thin',
  'think','third','thread','three','throw','tick','tie','tight','time','tip',
  'title','today','together','tone','tool','top','total','touch','tour','tower',
  'town','trace','track','trade','train','travel','treat','trend','trial','tribe',
  'trick','trigger','trip','true','trust','try','tune','turn','twelve','twin',
  'twist','two','type','ultra','under','union','unique','unit','up','upper',
  'urban','use','user','value','vault','venture','verify','version','very','view',
  'vine','vision','visit','vital','voice','walk','wall','want','warm','watch',
  'water','wave','way','wealth','wear','web','week','weight','well','west',
  'wheel','white','whole','wide','wild','win','wind','wire','wise','wish',
  'wonder','wood','word','work','world','wrap','write','yard','year','zero',
  'zip','zone','zoom',
];

// Tech suffixes
const SUFFIXES = ['', '-ai', '-io', '-hq', '-labs', '-dev', '-app'];

// Generate all combinations (but limit to reasonable set)
// Only use suffix variants for first 100 base words to keep it manageable
const ALL_SLUGS = new Set();
for (const word of BASE_WORDS) {
  ALL_SLUGS.add(word);
}
// Add suffix variants for shorter/more likely company names
const SHORT_BASES = BASE_WORDS.filter(w => w.length <= 5);
for (const word of SHORT_BASES.slice(0, 80)) {
  for (const suffix of SUFFIXES) {
    ALL_SLUGS.add(word + suffix);
  }
}

const slugArray = [...ALL_SLUGS];
console.log(`Generated ${slugArray.length} candidate slugs\n`);

async function scrapeAll() {
  const allJobs = [];
  
  // Ashby (highest success rate)
  let ashbyOk = 0;
  for (let i = 0; i < slugArray.length; i += 35) {
    const batch = slugArray.slice(i, i + 35);
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
    process.stdout.write(`\r  Ashby: ${Math.min(i+35, slugArray.length)}/${slugArray.length} (${ashbyOk} valid)`);
  }
  console.log(`\n  ✅ Ashby: ${ashbyOk} valid boards`);

  // Greenhouse
  let ghOk = 0;
  const ghBefore = allJobs.length;
  for (let i = 0; i < slugArray.length; i += 40) {
    const batch = slugArray.slice(i, i + 40);
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
    process.stdout.write(`\r  GH: ${Math.min(i+40, slugArray.length)}/${slugArray.length} (${ghOk} valid)`);
  }
  console.log(`\n  ✅ GH: ${ghOk} valid boards`);

  // Lever
  let leverOk = 0;
  for (let i = 0; i < slugArray.length; i += 30) {
    const batch = slugArray.slice(i, i + 30);
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
    process.stdout.write(`\r  Lever: ${Math.min(i+30, slugArray.length)}/${slugArray.length} (${leverOk} valid)`);
  }
  console.log(`\n  ✅ Lever: ${leverOk} valid boards`);

  return allJobs;
}

async function scrapeJobicy() {
  const tags = ['react','typescript','node','fullstack','python','javascript',
    'frontend','backend','golang','rust','java','aws','docker','kubernetes',
    'nextjs','vue','angular','graphql','machine-learning','ai','llm',
    'ruby','php','scala','ios','android','security','cloud',
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
  console.log('🔍 WAVE 11 — Compound + Suffix Brute Force\n');

  const [boards, jobicy] = await Promise.all([
    scrapeAll(),
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
