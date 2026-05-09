/**
 * scrape-wave15.mjs — WAVE 15: Dictionary words + animal/plant/nature names
 * 
 * Strategy:
 * 1. Animal names (common tech company naming pattern)
 * 2. Greek/Latin roots (common in biotech, enterprise)
 * 3. Color + material combos
 * 4. Nature/geography terms
 * 5. Mythology/historical figures
 * 6. Food/drink terms (surprisingly common)
 * 7. Musical terms
 * 8. Two-word hyphenated pairs from previous valid boards + new words
 */

import { writeFileSync, readFileSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/wave15-jobs.json';
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

const SLUGS = new Set();

// Animals (extremely common tech company names)
const ANIMALS = [
  'aardvark','albatross','alpaca','anaconda','anchovy','ant','antelope',
  'ape','armadillo','asp','baboon','badger','barracuda','basilisk','bat',
  'bear','beaver','beetle','bison','bobcat','buffalo','bull','bunny',
  'butterfly','camel','canary','caribou','cat','caterpillar','chameleon',
  'cheetah','chimp','chinchilla','cicada','clam','cobra','cockatoo',
  'cod','condor','coral','cougar','cow','coyote','crab','crane',
  'cricket','crow','cuckoo','dachshund','dalmatian','deer','dingo',
  'dodo','dog','dolphin','donkey','dove','dragon','dragonfly','duck',
  'eagle','eel','elephant','elk','emu','ermine','falcon','ferret',
  'finch','firefly','flamingo','fly','fox','frog','gazelle','gecko',
  'gerbil','giraffe','gnu','goat','goldfish','goose','gorilla',
  'grasshopper','grizzly','grouper','grouse','gull','hamster','hare',
  'hawk','hedgehog','heron','herring','hippo','hornet','horse',
  'hound','hummingbird','hyena','ibis','iguana','impala','jackal',
  'jaguar','jay','jellyfish','kangaroo','kestrel','kingfisher','kiwi',
  'koala','komodo','krill','ladybug','lamb','lark','lemming','lemur',
  'leopard','lion','lizard','llama','lobster','locust','loon','lynx',
  'macaw','magpie','mallard','mammoth','manatee','manta','mantis',
  'marlin','marmot','marten','mastiff','meerkat','mink','minnow',
  'mockingbird','mole','monarch','mongoose','monkey','moose','moth',
  'mouse','mule','narwhal','newt','nighthawk','ocelot','octopus',
  'okapi','opossum','orangutan','orca','oriole','osprey','ostrich',
  'otter','owl','ox','oyster','panda','panther','parakeet','parrot',
  'partridge','peacock','pelican','penguin','pheasant','pig','pigeon',
  'pike','piranha','platypus','polar','pony','poodle','porcupine',
  'porpoise','possum','prawn','puma','python','quail','rabbit',
  'raccoon','ram','raptor','rat','rattlesnake','raven','ray',
  'reindeer','rhino','roadrunner','robin','rooster','sailfish',
  'salamander','salmon','sardine','scorpion','seahorse','seal',
  'shark','sheep','shrimp','skunk','sloth','slug','snail','snake',
  'snapper','sparrow','spider','squid','squirrel','stag','stallion',
  'starfish','stingray','stork','sturgeon','swan','swift','swordfish',
  'tapir','termite','tern','terrier','tiger','toad','toucan','trout',
  'tuna','turkey','turtle','unicorn','viper','vulture','wallaby',
  'walrus','warthog','wasp','weasel','whale','whippet','wildcat',
  'wolf','wolverine','wombat','woodpecker','wren','yak','zebra',
];

// Nature/geography
const NATURE = [
  'alpine','amber','ash','aspen','aurora','autumn','avalanche','bamboo',
  'basalt','bay','birch','blaze','blizzard','bloom','blossom','boulder',
  'breeze','brook','canyon','cascade','cave','cedar','cherry','cliff',
  'cloud','clover','coast','coral','cosmos','cove','creek','crest',
  'crystal','cypress','daisy','delta','desert','dew','drift','dune',
  'echo','ember','equinox','fern','fjord','flame','flora','forest',
  'frost','galaxy','garden','glacier','glen','granite','grove','gust',
  'harbor','hazel','heath','hill','hollow','horizon','hurricane','ice',
  'iris','island','ivy','jade','jasmine','jungle','kelp','lake',
  'lava','leaf','lily','lotus','lunar','magnolia','maple','marsh',
  'meadow','mesa','mist','monsoon','moss','mountain','nova','oak',
  'oasis','ocean','olive','onyx','orchid','palm','peak','pebble',
  'pine','plume','pond','prairie','quartz','rain','rapids','ravine',
  'reef','ridge','ripple','river','rose','sage','sand','savanna',
  'sequoia','shore','sierra','snow','solstice','spring','spruce',
  'stellar','storm','stream','summit','sunflower','surf','tempest',
  'thistle','thorn','thunder','tide','timber','topaz','tornado','trail',
  'tundra','twilight','valley','vine','violet','volcano','waterfall',
  'wave','willow','wind','winter','zenith',
];

// Mythology/historical
const MYTHOLOGY = [
  'achilles','aegis','aether','ajax','apollo','arcane','archon','argon',
  'argus','artemis','athena','atlas','aurora','avalon','catalyst',
  'centaur','cerberus','chimera','cipher','cosmos','daemon','delphi',
  'echo','elixir','enigma','epoch','eureka','exodus','fenris','genesis',
  'golem','grail','griffin','helios','hercules','hermes','hydra',
  'icarus','infinity','iris','kronos','labyrinth','lancer','legion',
  'loki','lucid','lyra','magi','mantra','marathon','medusa','mercury',
  'merlin','minotaur','muse','nebula','nemesis','nexus','nimbus',
  'nirvana','norse','nova','nucleus','nyx','odyssey','olympus',
  'omega','oracle','orion','pandora','pegasus','phoenix','pluto',
  'polaris','prism','prodigy','prometheus','proteus','quantum',
  'quest','relic','revenant','rune','saga','sentinel','seraph',
  'siren','solaris','specter','sphinx','spirit','templar','terminus',
  'thor','titan','totem','trident','trinity','valiant','vanguard',
  'venom','venture','vertex','vigil','viking','vortex','wraith',
  'zenith','zephyr','zeus',
];

// Food/Drink (surprisingly common)
const FOOD = [
  'acorn','almond','apple','apricot','avocado','bagel','banana',
  'barley','basil','berry','biscuit','bread','brownie','butter','cake',
  'candy','caramel','cashew','celery','cherry','chestnut','chili',
  'cinnamon','citrus','clove','cocoa','coconut','coffee','cookie',
  'corn','cream','crouton','cumin','curry','custard','doughnut','fig',
  'ginger','grape','guava','hazel','herb','honey','jam','kale',
  'lemon','lime','mango','maple','melon','mint','mocha','mushroom',
  'mustard','nutmeg','oat','olive','onion','orange','papaya','parsley',
  'peach','peanut','pear','pepper','pickle','pie','plum','potato',
  'pretzel','pumpkin','raisin','raspberry','rice','rosemary','saffron',
  'sage','salt','sesame','sorbet','spice','spinach','strawberry',
  'sugar','sushi','syrup','taffy','tamarind','tangerine','thyme',
  'toast','toffee','tomato','truffle','turnip','vanilla','walnut',
  'wasabi','wheat','yam',
];

// Materials/Textures
const MATERIALS = [
  'alloy','brass','bronze','carbon','ceramic','chalk','chrome','clay',
  'cobalt','concrete','copper','cork','cotton','crystal','diamond',
  'fabric','fiber','flint','glass','gold','granite','graphite','gypsum',
  'hemp','iron','ivory','jade','leather','linen','marble','mercury',
  'metal','mica','neon','nickel','nylon','onyx','opal','pearl',
  'pewter','platinum','porcelain','quartz','rubber','rust','satin',
  'silk','silver','slate','steel','stone','suede','teak','tin',
  'titanium','tungsten','velvet','vinyl','wax','zinc','zircon',
];

// Add all single-word slugs
for (const list of [ANIMALS, NATURE, MYTHOLOGY, FOOD, MATERIALS]) {
  for (const word of list) {
    SLUGS.add(word);
  }
}

// Add -ai, -io, -hq, -labs, -tech suffixes for shorter words
const ALL_WORDS = [...ANIMALS, ...NATURE, ...MYTHOLOGY, ...FOOD, ...MATERIALS];
const SHORT_WORDS = ALL_WORDS.filter(w => w.length <= 6);
const SUFFIXES = ['-ai', '-io', '-hq', '-labs', '-tech', '-app'];
for (const word of SHORT_WORDS.slice(0, 200)) {
  for (const suffix of SUFFIXES) {
    SLUGS.add(word + suffix);
  }
}

// More real companies to try
const MORE_REAL = [
  'abridge','actualbudget','adaface','adalo','addgene','addsearch',
  'admincontrol','adoptopenjdk','adrenal','advancedmd','aerial',
  'aerotime','affable','agility','agoda','agorapulse','aha-io',
  'aiven','akeneo','akiflow','albato','alcami','alertmedia',
  'alexpress','alignable','alinma','alkami','allegory','allegro',
  'allspice','alma','almanac','alohi','altium','altus',
  'alyssa','amarillo','ambient','ambrosia','amino','amity',
  'amplemarket','anchore','andalusia','animoto','annex','anomalo',
  'antidote','apiflash','apiture','apna','appfigures','appfluence',
  'appian-corp','applango','applify','appspace','appvance',
  'aquiline','arangodb','arcana','arcentry','archbee','arctype',
  'ardoq','arena-ai','ariel','arize-ai','arkose','armis',
  'armorblox','arnon','arrive','artie','artisan','artlist',
  'artsy-net','ascent','ashling','asite','atera','athennian',
  'atlas-health','atlis','atomi','attract','audible','augury',
  'aurelia','aurigo','ausmed','autify','automata','automox-inc',
  'autonomy','avail-medsystems','avalara','avantax','avaya',
  'avenga','aven','averity','avetta','aviso-ai','awake',
  'axiom-zen','ayasdi','azara','azure-power','b-labs',
  'backflip','backstop','bakkt','balsamiq','bandwidth',
  'bankable','barrel','basin','batch-io','baton-sys',
  'batterii','baxter','bazaar','beagle','bearaby','beeswax',
  'beforepay','behold','bellhop','benify','better-up',
  'beyondtrust','bigeye-data','billtrust','biocatch','biosig',
  'birchbox','birdseye','bisnode','bitbucket','bitdefender',
  'bitly','bitmovin','bitpanda','bitsight-tech','bizzabo',
  'blackbaud','blackberry','blackhawk','blackkite','blackswan',
  'blancco','blastpoint','blazemeter','blend-labs','blenheim',
  'blinkit','blockdaemon-io','blockstream','bluecore','bluedot',
  'bluefin','blueground','blueink','blueprint-health','bluesight',
  'bluetrace','bluevine','blurr','boardable','boardvantage',
  'boclips','bodyport','bold-com','boldly','bolt-financial',
  'bombardier','bonitasoft','booksy','boom-supersonic','booster',
  'bosun','botpress','boundless','boxhero','brainbox','brainjar',
  'brainspace','braintrust','brandfetch','brandwatch','bravado',
  'breadfast','breakline','breezy','bridgecrew','brightcove',
  'brightedge','brightmachines','brightpearl','brikl','brivo',
  'broadcom','broadleaf','broadlume','broadstep','builtin',
  'bumble','bunnyshell','bureauworks','bureauxpress','bushel',
  'buyk','bynder','cabin-ai','cadent','caldera','calibrate',
  'callisto','callminer','calmly','cambly','campfire','canopy-tax',
  'capacityinc','capeanalytics','capsolver','capterra','carato',
  'carbyne','cardata','careem','caresyntax','cargowise',
  'cashapp','castlight','catalant','catapult','cathexis',
  'causeway','cedar-gate','cegid','celestica','celo','celonis',
  'centrical','cequence','cerebri','cerevel','ceridian','certara',
  'certinia','cesium','chalkboard','changeengine','channelape',
  'chapter','chargepoint','chartbeat','checkbook','checkpoint',
  'chefling','chemwatch','cherwell','chestnote','chipper-cash',
  'chord','chronobank','cimpress','circana','circularboard',
];
for (const slug of MORE_REAL) SLUGS.add(slug);

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
    for (const r of results) if (r.status === 'fulfilled') jobs.push(...r.value);
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
        return d.jobs.filter(j => isRemote(j.location?.name)).map(j => ({
          company: guessCompany(slug), role: j.title,
          url: `https://job-boards.greenhouse.io/${slug}/jobs/${j.id}`,
          atsType: 'greenhouse', location: j.location?.name || 'Remote',
        }));
      })
    );
    for (const r of results) if (r.status === 'fulfilled') jobs.push(...r.value);
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
        return d.filter(j => isRemote(j.categories?.location)).map(j => ({
          company: guessCompany(slug), role: j.text,
          url: j.hostedUrl || j.applyUrl,
          atsType: 'lever', location: j.categories?.location || 'Remote',
        }));
      })
    );
    for (const r of results) if (r.status === 'fulfilled') jobs.push(...r.value);
    process.stdout.write(`\r  Lever: ${Math.min(i+30, slugs.length)}/${slugs.length} (${valid} valid)`);
  }
  console.log(`\n  ✅ Lever: ${valid} valid boards`);
  return jobs;
}

async function scrapeJobApis() {
  const all = [];
  
  // Jobicy
  const tags = ['react','typescript','node','fullstack','python','javascript',
    'frontend','backend','golang','rust','java','aws','docker','kubernetes',
    'ai','llm','devops','cloud','mobile','web','security','blockchain',
    'fintech','saas','startup','remote','senior','staff','architect'];
  const seen = new Set();
  for (const tag of tags) {
    const d = await fetchJSON(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${tag}`, 8000);
    if (!d?.jobs) continue;
    for (const j of d.jobs) {
      if (seen.has(j.id)) continue;
      seen.add(j.id);
      all.push({ company: j.companyName, role: j.jobTitle, url: j.url, atsType: 'custom', location: j.jobGeo || 'Remote' });
    }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`  ✅ Jobicy: ${all.length} jobs`);

  // RemoteOK
  try {
    const rok = await fetchJSON('https://remoteok.com/api', 15000);
    if (Array.isArray(rok)) {
      const jobs = rok.filter(j => j.position && j.company && j.url).map(j => ({
        company: j.company, role: j.position,
        url: j.url.startsWith('http') ? j.url : `https://remoteok.com${j.url}`,
        atsType: 'custom', location: j.location || 'Remote',
      }));
      all.push(...jobs);
      console.log(`  ✅ RemoteOK: ${jobs.length} jobs`);
    }
  } catch { console.log('  ⚠️ RemoteOK: failed'); }

  // WWR
  const wwrCats = ['remote-programming-jobs','remote-full-stack-programming-jobs',
    'remote-devops-sysadmin-jobs','remote-back-end-programming-jobs','remote-front-end-programming-jobs'];
  const wwrSeen = new Set();
  let wwrCount = 0;
  for (const cat of wwrCats) {
    try {
      const html = await fetchText(`https://weworkremotely.com/categories/${cat}.rss`, 10000);
      if (!html) continue;
      const items = html.match(/<item>[\s\S]*?<\/item>/g) || [];
      for (const item of items) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1];
        const link = item.match(/<link>(.*?)<\/link>/)?.[1];
        if (!title || !link || wwrSeen.has(link)) continue;
        wwrSeen.add(link);
        const parts = title.split(':');
        all.push({ company: parts[0]?.trim() || 'Unknown', role: parts.slice(1).join(':').trim() || title, url: link, atsType: 'custom', location: 'Remote' });
        wwrCount++;
      }
    } catch {}
  }
  console.log(`  ✅ WWR: ${wwrCount} jobs`);

  // Arbeitnow
  try {
    for (let page = 1; page <= 5; page++) {
      const d = await fetchJSON(`https://www.arbeitnow.com/api/job-board-api?page=${page}`, 10000);
      if (!d?.data?.length) break;
      const jobs = d.data.filter(j => j.remote === true).map(j => ({
        company: j.company_name, role: j.title, url: j.url, atsType: 'custom', location: j.location || 'Remote',
      }));
      all.push(...jobs);
      if (page === 1) console.log(`  ✅ Arbeitnow: ${jobs.length}+ remote jobs`);
    }
  } catch { console.log('  ⚠️ Arbeitnow: failed'); }

  // Himalayas
  try {
    const hSeen = new Set();
    for (let page = 1; page <= 15; page++) {
      const d = await fetchJSON(`https://himalayas.app/jobs/api?page=${page}&limit=50`, 10000);
      if (!d?.jobs?.length) break;
      for (const j of d.jobs) {
        const id = j.id || j.title + j.companyName;
        if (hSeen.has(id)) continue;
        hSeen.add(id);
        all.push({ company: j.companyName, role: j.title, url: j.applicationUrl || j.url || `https://himalayas.app/jobs/${j.id}`, atsType: 'custom', location: 'Remote' });
      }
    }
    console.log(`  ✅ Himalayas: scraped`);
  } catch { console.log('  ⚠️ Himalayas: failed'); }

  return all;
}

async function main() {
  console.log('🔍 WAVE 15 — Dictionary Words + Animals + Nature + Mythology\n');

  console.log('📡 Phase 1: ATS Board Scraping...');
  const [ashbyJobs, ghJobs, leverJobs] = await Promise.all([
    scrapeAshby(slugArray),
    scrapeGreenhouse(slugArray),
    scrapeLever(slugArray),
  ]);

  console.log('\n📡 Phase 2: Job Board APIs...');
  const apiJobs = await scrapeJobApis();

  const allJobs = [...ashbyJobs, ...ghJobs, ...leverJobs, ...apiJobs];
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
