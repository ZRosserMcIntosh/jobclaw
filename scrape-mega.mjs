/**
 * scrape-mega.mjs — MEGA SCRAPER for 1400+ applications
 * 
 * Strategy:
 *  1. Use curated mega-lists of Greenhouse/Ashby/Lever boards
 *  2. Filter: remote-friendly roles matching full-stack/frontend/backend/SWE
 *  3. 1 best job per company, skip blocklist
 *  4. Output: /tmp/mega-wave-jobs.json
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';

const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT_PATH = '/tmp/mega-wave-jobs.json';
const TIMEOUT = 8000;

// Load blocklist
const BLOCKLIST = new Set(
  existsSync(BLOCKLIST_PATH)
    ? JSON.parse(readFileSync(BLOCKLIST_PATH, 'utf8')).map(c => c.toLowerCase().trim())
    : []
);
console.log(`🚫 Blocking ${BLOCKLIST.size} companies\n`);

async function fetchJSON(url, ms = TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return r.ok ? await r.json() : null;
  } catch { clearTimeout(timer); return null; }
}

// ── Role relevance scoring ──
const STRONG = /full.?stack|frontend|front.?end|react|next\.?js|typescript|node|javascript|web.?dev|software.?engineer|swe\b/i;
const GOOD   = /engineer|developer|architect|platform|backend|python|golang|rust|mobile|ios|swift/i;
const WEAK   = /devops|sre|data.?engineer|ml.?engineer|infra/i;
const SKIP   = /intern\b|new.?grad|junior|entry.?level|director|vp\b|chief|head of|recruiter|sales|marketing|account.?exec|customer.?success|legal|finance|accounting|hr\b|people.?ops/i;

function roleScore(title) {
  if (SKIP.test(title)) return -1;
  if (STRONG.test(title)) return 3;
  if (GOOD.test(title)) return 2;
  if (WEAK.test(title)) return 1;
  return 0;
}

const REMOTE_KW = /remote|anywhere|latam|americas|global|worldwide|brazil|são paulo|distributed|work from home|wfh|emea|apac/i;

function isRemote(location) {
  if (!location || location === '') return true; // empty = assume remote
  return REMOTE_KW.test(location);
}

function pickBestPerCompany(jobs) {
  const byCompany = {};
  for (const j of jobs) {
    const key = j.company.toLowerCase().trim();
    if (BLOCKLIST.has(key)) continue;
    const score = roleScore(j.role);
    if (score < 0) continue; // skip bad matches
    if (!byCompany[key] || score > roleScore(byCompany[key].role)) {
      byCompany[key] = j;
    }
  }
  return Object.values(byCompany).filter(j => roleScore(j.role) >= 1);
}

// ═══════════════════════════════════════════════════════════════
// GREENHOUSE — 500+ boards (curated mega-list)
// ═══════════════════════════════════════════════════════════════
const GH = [
  // ── Already proven in previous waves ──
  'doppler','render','sentry','temporal','clerkdev','workos','calcom','mintlify',
  'zedindustries','replit','anysphere','gitpod','coder','dagger','buf',
  'anthropic','openai','cohere','huggingface','replicate','wandb','stabilityai',
  'mistral','togetherai','perplexityai','character','jasper','deepgram',
  'assemblyai','elevenlabs','runwayml','anyscale',
  'plaid','ramp','mercury','affirm','transferwise','marqeta','column','lithic','stytch',
  'brexhq','nuvei','remitly',
  'figma','canva','miro','clickup','notionhq','coda','pitch',
  'cloudflare','fastly','digitalocean','elastic','mongodb','cockroachlabs',
  'clickhouse','influxdata','timescale',
  'vanta','1password','snyk','wizinc','crowdstrike','drata','secureframe','cribl',
  'tailscale','goteleport',
  'dbtlabsinc','fivetran','hex','montecarlodata','census','hightouch','metabase',
  'deel','oysterhr','papayaglobal','omnipresent','remofirst','lattice','cultureamp',
  'shopify','bigcommerce','faire','etsy','poshmark','stockx',
  'twilio','sendbird','stream',
  'roblox','epicgames','unity3d',
  'alchemy','chainalysis','consensys','circle','uniswaplabs','aptoslabs',
  'offchainlabs','phantom','magiceden','immutable','avalabs',
  'automattic','hashicorp','kong','algolia','contentful','sanity','storyblok',
  'ghost','readme','gitbook','liveblocks','postman','retool','scaleai','rippling',
  'posthog','zapier','carta','hotjar','toggl','grafanalabs',
  'navan','airwallex','bettercloud',
  'headspace','ro','includedhealth',
  'webflow','gitlab','gusto','airtable','vercel',
  'turso','denolandinc','prisma','mux',
  'netlify','launchdarkly','sourcegraph91','neondatabase',
  'railway','resend','inngest','axiom','planetscale',
  'browserstack','datadog','stripe','brex','coinbase',
  'linear','supabase','discord',
  'airbyte','prefect','dagster','camunda','n8n',
  'snorkelai','labelbox','benchling',
  'asana','palantir','snowflake','databricks',
  'pagerduty','amplitude','mixpanel','heap',
  'square','adyen','checkout',
  'docusign','pandadoc',
  'calendly','gong','salesloft','outreach',
  'intercom','zendesk','freshworks','kustomer',
  'hubspot','pipedrive',
  'okta','auth0',
  'newrelic','dynatrace',
  'splunk','sumologic',
  'dropbox','stackblitz','alloy','treasuryprime',
  'honeycomb','circleci','buildkite','builder',
  'singlestore','zuora','recharge',
  'toast','mindbody','housecall','solarwinds','greenhouse','seekout',
  'vonage',
  // ── NEW WAVE 7+ — 400+ fresh boards ──
  // Fintech / Banking
  'plaidtech','moov','increase','moderntreasury','method-fi','abound',
  'unit-finance','bond','synctera','kanmon','pier','solidfi',
  'sardine','alliancedata','tala','branch','dave','chime','current',
  'varo','greenlight','step','copper-banking','onefinance',
  'wealthsimple','betterment','ellevest','titan','acorns','stash',
  'robinhood','public','m1finance','alpaca','tradier','drivewealth',
  'apex-fintech','capitalize','human-interest','guideline','vestwell',
  'justworks','trinet','paychex','paylocity','paycom',
  // Dev tools / Infra 2.0
  'speakeasy-api','stainless-api','fern-api','zuplo','solo-io',
  'ambassador-labs','traefik','envoyproxy','istio',
  'sonatype','jfrog','artifactory','codefresh','harness','launchdarkly',
  'split','optimizely','statsig','eppo','growthbook',
  'flagsmith','configcat','devcycle',
  'pulumi','env0','spacelift','scalr',
  'earthly','pantsbuild','gradle','maven',
  'semaphore','woodpecker','drone','gitea','forgejo',
  'codeberg','radicle','phorge','sourcehut',
  'gitpod','codespacesapp','devpod','daytona',
  'stackblitz','codesandbox','replit','codeanywhere',
  'gitpod','railway','koyeb','coherence',
  'qovery','massdriver','zeet','porter-dev',
  'flightcontrol','sst','serverless','netlify','vercel',
  // CMS / Content platforms
  'strapi','payload','keystonejs','directus','hygraph',
  'kontent','builder','uniform','stackbit',
  'storyblok','prismic','sanity','contentful',
  'agility','magnolia','bloomreach','sitecore',
  'contentstack','crownpeak','kentico',
  // Design / Creative tools
  'framer','plasmic','teleporthq','locofy','anima',
  'spline','rive','lottie','protopie','origami',
  'canva','figma','sketch','invision','zeplin',
  'abstract','brandfolder','bynder','dam',
  // Databases / Data infra
  'fauna','singlestore','dolt','motherduck','duckdb',
  'questdb','materialize','readyset','hydra','tembo',
  'cockroachlabs','yugabyte','tidb','vitess',
  'citus','orioledb','xata','convex','turso',
  'upstash','redis','memcached','dragonflydb',
  'clickhouse','timescale','influxdata','questdb',
  'snowflake','databricks','bigquery',
  // Auth / Identity
  'descope','frontegg','propelauth','hanko','ory',
  'stytch','clerk','workos','auth0','okta',
  'fusionauth','keycloak','gluu','casdoor',
  // Payments / E-commerce
  'lemonsqueezy','paddle','chargebee','recurly',
  'zuora','ordway','maxio','chargify',
  'recharge','bold-commerce','swell','medusa','spree',
  'shopify','bigcommerce','commercetools','elasticpath',
  'fabric','nacelle','chord','violet','rally',
  // Analytics / BI / Data
  'cube','lightdash','evidence','mode','thoughtspot',
  'sisense','domo','gooddata','klipfolio',
  'metabase','redash','superset','grafanalabs',
  'amplitude','mixpanel','heap','posthog','june',
  'koala','pendo','fullstory','hotjar','logrocket',
  'smartlook','mouseflow','crazyegg','optimizely',
  // Communication / Messaging
  'ably','pusher','livekit','daily','whereby',
  'agora','100ms','vonage','twilio',
  'mux','cloudinary','imgix','uploadcare',
  'stream','sendbird','pubnub','cometchat',
  // AI / ML companies 2.0
  'langsmith','fixie','adeptai','inflection',
  'sakana','xai','poolside','magic-dev',
  'cognition','devin','codegen','tabnine','codeium',
  'sourcegraph','continue-dev','supermaven',
  'huggingface','replicate','banana','cerebrium',
  'modal','baseten','anyscale','lightning-ai',
  'wandb','neptune','comet-ml','dagshub',
  'deepset','jina','marqo','vespa','milvus',
  'chroma','lancedb','activeloop',
  'arize','whylabs','galileo','humanloop',
  'vellum','portkey','braintrust','gentrace',
  'groq','fireworks','octoai','lepton','cerebras',
  // Cybersecurity 2.0
  'orca-security','lacework','aquasecurity',
  'semgrep','endor-labs','socket-dev','phylum',
  'snyk','veracode','checkmarx','sonarqube',
  'crowdstrike','sentinelone','cybereason','trellix',
  'paloalto','fortinet','zscaler','netskope',
  'cloudflare','akamai','fastly','imperva',
  'wiz','orca','lacework','prismacloud',
  // Vertical SaaS
  'procore','veeva','servicetitan','toast','mindbody',
  'housecall','jobber','clio','appfolio','buildium',
  'guesty','hostaway','lodgify','cloudbeds',
  'servicemax','fieldedge','housecallpro',
  'athenahealth','drchrono','elation','kareo',
  'healthie','canvas-medical','akute-health',
  // EdTech
  'coursera','udemy','skillshare','masterclass',
  'codecademy','treehouse','educative','scrimba',
  'replit','brilliant','khan-academy','duolingo',
  // Climate / Energy
  'arcadia','palmetto','enphase','span','sense',
  'carbon-robotics','pachama','planet-labs','natel',
  // Recruiting / HR tech
  'ashbyhq','lever','greenhouse','gem','fetcher',
  'phenom','eightfold','seekout','beamery',
  'rippling','deel','oyster','remote-com','velocity-global',
  'letsdeel','globalization-partners','safeguard-global',
  // Logistics / Supply chain
  'flexport','project44','fourkites','samsara',
  'motive','keeptruckin','bringg','onfleet',
  'shipbob','shippo','easypost','pirate-ship',
  // Real estate / PropTech
  'opendoor','offerpad','redfin','compass',
  'zillow','realtor','apartments','costar',
  'procore','buildertrend','plangrid','fieldwire',
  // Travel
  'hopper','kiwi','skyscanner','kayak',
  'booking','airbnb','vrbo','tripadvisor',
  // Food / Delivery
  'doordash','instacart','gopuff','grubhub',
  'uber','lyft','grab','gojek',
  // Social / Community
  'discord','reddit','tumblr','mastodon',
  'bereal','lemon8','substack','medium',
  'ghost','hashnode','devto',
  // Enterprise / B2B
  'notion','airtable','monday','clickup',
  'asana','wrike','teamwork','basecamp',
  'jira','confluence','trello','miro',
  'loom','grain','gong','chorus',
  'clari','6sense','demandbase','qualified',
  'drift','intercom','zendesk','freshworks',
  'salesforce','hubspot','pipedrive','close',
  'copper','attio','folk','clay','apollo-io',
  // Marketing / Growth
  'mailchimp','activecampaign','convertkit','beehiiv',
  'brevo','sendgrid','mailgun','postmark',
  'customerio','iterable','braze','onesignal',
  'segment','rudderstack','jitsu','hightouch',
  'census','lytics','bloomreach','dynamic-yield',
  // Testing / QA
  'browserstack','lambdatest','saucelabs',
  'percy','applitools','chromatic','storybook',
  'cypress','playwright-dev','selenium',
  'mabl','testim','rainforest','ghost-inspector',
  // Low-code / No-code
  'retool','superblocks','airplane','windmill',
  'appsmith','budibase','tooljet','dronahq',
  'webflow','framer','squarespace','wix',
  'bubble','flutterflow','adalo','glide',
  'buildship','make','zapier','n8n','tray','workato',
];

// ═══════════════════════════════════════════════════════════════
// ASHBY — 200+ boards
// ═══════════════════════════════════════════════════════════════
const ASHBY = [
  'cursor','warp','raycast','coder','replit','val-town',
  'trigger.dev','knock','buildkite','depot','render','grafbase',
  'tinybird','planetfall','dub','unkey','polar','opensauced',
  'novu','langfuse','helicone','browserbase','e2b','mintlify',
  'pieces','highlight-io','plane','cal.com','formbricks',
  'documenso','twenty','hoppscotch','infisical','rivet-gg',
  'fly.io','turso','upstash','convex','clerk','workos','stytch',
  'baseten','modal','replicate','wandb','togetherai',
  'perplexityai','mistralai','elevenlabs','jasper',
  'glean','harvey','hebbia','sierra','coframe',
  'langchain','pinecone','weaviate','qdrant','zilliz','llamaindex',
  'nango','hatchet','mem',
  'supabase','vercel','linear','resend','axiom','inngest','railway',
  'neon','planetscale','sourcegraph',
  'alchemy','circle','uniswap',
  'ramp','mercury','brex','carta',
  'notion','figma','miro','airtable',
  'postman','readme','gitbook',
  'snyk','vanta','drata',
  'deel','oyster','remote',
  'lattice','cultureamp','gusto',
  'tldraw','pylon','plain','commandbar','stackai','dust-tt',
  'traceloop','arize','whylabs','galileo-ai','humanloop','vellum',
  'portkey','braintrust','gentrace','athina','ragas',
  'cerebras','groq','together','fireworks','octoai','lepton',
  'anyscale','lightning-ai',
  'deepset','jina','marqo','chroma',
  'lancedb','activeloop',
  'indent','opal',
  'speakeasy','loops','react-email',
  'frigade','canny','productboard',
  'rootly','firehydrant','incident-io','betteruptime',
  'flagsmith','configcat','devcycle',
  'zuplo',
  'gitpod','daytona',
  // ── NEW MEGA WAVE ──
  'causal','orum','rutter','modern-treasury','increase','moov',
  'sardine','alloy-automation','unit','abound','pier-dev',
  'method','codat','merge','apideck','finch-api',
  'straddle','treasury-prime','synapse-fi',
  'propel','argyle','pinwheel','atomic-fi','plaid',
  'retool','airplane','superblocks','windmill','appsmith',
  'budibase','tooljet','dronahq','internal',
  'koyeb','coherence','qovery','massdriver',
  'flightcontrol','sst-dev','serverless',
  'doppler','infisical','vault','conjur',
  'teleport','strongdm','boundary','tailscale',
  'netbird','firezone','pritunl',
  'pangea','stytch','descope','frontegg','propelauth',
  'passage','magic-link','web3auth',
  'lago','getlago','metronome','orb','amberflo',
  'stigg','schematic','bucket',
  'knock','courier','novu','magicbell','engagespot',
  'loops','customer-io','sendgrid','resend',
  'svix','hookdeck','ngrok','localtunnel',
  'zuplo','kong','solo','ambassador','traefik',
  'temporal','inngest','trigger-dev','defer','quirrel',
  'upstash','neon','supabase','convex','turso',
  'xata','fauna','planetscale',
  'posthog','june','koala','bucket-co',
  'highlight','sentry','logrocket',
  'checkly','grafana','better-stack',
  'depot','earthly','pants','nx-cloud',
  'chromatic','storybook','ladle','histoire',
  'mintlify','readme','gitbook','docusaurus',
  'cal-com','savvycal','zcal','reclaim',
  'daily','livekit','100ms','whereby','stream',
  'mux','cloudflare-stream','api-video',
  'sanity','payload','directus','strapi','hygraph',
  'contentlayer','mdx','keystatic',
  'nextra','vitepress','starlight','astro-docs',
  'polar','lemon-squeezy','paddle','stripe',
  'open-collective','github-sponsors','buy-me-a-coffee',
  'dub','short-io','rebrandly','bitly',
  'cal','calendly','savvycal','zcal',
  'tiptap','plate','lexical','prosemirror','blocknote',
  'excalidraw','tldraw','xyflow','react-flow',
  'remotion','motion-canvas','rive','lottie',
];

// ═══════════════════════════════════════════════════════════════
// LEVER — 150+ boards
// ═══════════════════════════════════════════════════════════════
const LEVER = [
  'netlify','kong','zapier','apollographql','readme','sanity',
  'storyblok','prismic','tally-1','auth0','circleci',
  'calendly','lattice','cultureamp','webflow','figma','loom',
  'outreach','gong','iterable','customerio','census','fivetran',
  'metabase','preset','airbyte','n8n','pipedream','temporal',
  'camunda','prefect','dagster',
  'snyk','algolia','contentful','miro','notion','airtable',
  'twilio','digitalocean98','sendbird','intercom','zendesk',
  'hubspot','freshworks','segment','amplitude','mixpanel',
  'docusign','asana','monday','clickup',
  'pagerduty','opsgenie','sentry',
  'stripe','square','adyen',
  'palantir','snowflake','databricks',
  'gitlab','github','vercel',
  'close','copper','attio','folk','clay','apollo',
  'activecampaign','convertkit','beehiiv',
  'hashnode','devto',
  'ably','pusher','livekit','daily','whereby','100ms','agora',
  'mux','cloudinary','imgix','uploadcare',
  'nhost','appwrite','directus','pocketbase',
  'redpanda','confluent','upstash',
  'modal','replicate','banana','cerebrium',
  'buildship','flutterflow','retool','superblocks','airplane',
  'windmill','temporal','inngest',
  'deno','bun','railway','koyeb','coherence',
  'qovery','porter','massdriver',
  'speakeasy-api','stainless-api','fern-api','orval',
  'storybook','chromatic','percy','applitools',
  'launchdarkly','statsig','eppo','growthbook',
  'rudderstack','jitsu','hightouch','lytics',
  'chatwoot','crisp','helpscout','front',
  'linear','shortcut','height','plane-so',
  // ── NEW MEGA WAVE ──
  'lucid','mural','whimsical','excalidraw',
  'blueground','sonder','lyric','placemakr',
  'pleo','spendesk','brex','ramp','divvy',
  'remote','velocity-global','papaya-global',
  'rippling','trinet','justworks','gusto',
  'braze','onesignal','pushwoosh','leanplum',
  'appsflyer','branch','adjust','singular',
  'datadog','elastic','logz','coralogix',
  'honeycomb','lightstep','chronosphere',
  'cockroachlabs','yugabyte','timescale','questdb',
  'materialize','readyset','motherduck',
  'crossbeam','reveal','partnerstack','impact',
  'reference','crosschq','vettery','hired',
  'karat','codility','hackerrank','leetcode',
  'tripactions','navan','brex-travel','spotnana',
  'vimeo','wistia','vidyard','synthesia',
  'jasper','writer','copy-ai','grammarly',
  'canva','visme','piktochart','infogram',
  'clockwise','reclaim','motion','sunsama',
];

// ═══════════════════════════════════════════════════════════════
// JOBICY + REMOTIVE — aggregate remote boards
// ═══════════════════════════════════════════════════════════════
const JOBICY_TAGS = [
  'react','typescript','node','fullstack','python','javascript',
  'frontend','backend','devops','golang','rust','ruby','php','java',
  'swift','flutter','aws','docker','kubernetes','nextjs','vue',
  'angular','svelte','graphql','postgresql','redis','mongodb',
  'terraform','ansible','ci-cd','machine-learning','data-engineering',
];

// ═══════════════════════════════════════════════════════════════
// FETCH FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function scrapeGreenhouse() {
  const unique = [...new Set(GH)];
  const all = [];
  let ok = 0, fail = 0;
  
  // Process in parallel batches of 20
  for (let i = 0; i < unique.length; i += 20) {
    const batch = unique.slice(i, i + 20);
    const results = await Promise.allSettled(
      batch.map(async (board) => {
        const d = await fetchJSON(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=false`);
        if (!d?.jobs) { fail++; return []; }
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
    process.stdout.write(`\r  GH: ${i + batch.length}/${unique.length} boards (${all.length} jobs)`);
  }
  console.log(`\n  ✅ Greenhouse: ${ok} boards, ${all.length} remote jobs (${fail} failed)`);
  return all;
}

async function scrapeAshby() {
  const unique = [...new Set(ASHBY)];
  const all = [];
  let ok = 0;
  
  for (let i = 0; i < unique.length; i += 15) {
    const batch = unique.slice(i, i + 15);
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        const d = await fetchJSON(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
        if (!d?.jobs) return [];
        ok++;
        return d.jobs.map(j => ({
          company: d.jobBoard?.organizationName || slug,
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
    process.stdout.write(`\r  Ashby: ${i + batch.length}/${unique.length} boards (${all.length} jobs)`);
  }
  console.log(`\n  ✅ Ashby: ${ok} boards, ${all.length} jobs`);
  return all;
}

async function scrapeLever() {
  const unique = [...new Set(LEVER)];
  const all = [];
  let ok = 0;
  
  for (let i = 0; i < unique.length; i += 15) {
    const batch = unique.slice(i, i + 15);
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        const d = await fetchJSON(`https://api.lever.co/v0/postings/${slug}?mode=json`);
        if (!d || !Array.isArray(d)) return [];
        ok++;
        return d
          .filter(j => isRemote(j.categories?.location))
          .map(j => ({
            company: slug,
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
    process.stdout.write(`\r  Lever: ${i + batch.length}/${unique.length} boards (${all.length} jobs)`);
  }
  console.log(`\n  ✅ Lever: ${ok} boards, ${all.length} remote jobs`);
  return all;
}

async function scrapeJobicy() {
  const seen = new Set();
  const all = [];
  
  for (const tag of JOBICY_TAGS) {
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

async function scrapeRemotive() {
  const all = [];
  try {
    const d = await fetchJSON('https://remotive.com/api/remote-jobs?limit=500', 15000);
    if (d?.jobs) {
      for (const j of d.jobs) {
        all.push({
          company: j.company_name,
          role: j.title,
          url: j.url,
          atsType: 'custom',
          location: 'Remote',
        });
      }
    }
  } catch {}
  console.log(`  ✅ Remotive: ${all.length} jobs`);
  return all;
}

// ═══════════════════════════════════════════════════════════════
// COMPANY NAME MAPPING
// ═══════════════════════════════════════════════════════════════
const CMAP = {
  doppler:'Doppler',render:'Render',sentry:'Sentry',temporal:'Temporal',
  clerkdev:'Clerk',workos:'WorkOS',calcom:'Cal.com',mintlify:'Mintlify',
  zedindustries:'Zed',replit:'Replit',anysphere:'Cursor',gitpod:'GitPod',
  coder:'Coder',dagger:'Dagger',buf:'Buf',anthropic:'Anthropic',
  openai:'OpenAI',cohere:'Cohere',huggingface:'Hugging Face',
  replicate:'Replicate',wandb:'Weights & Biases',stabilityai:'Stability AI',
  mistral:'Mistral AI',togetherai:'Together AI',perplexityai:'Perplexity',
  character:'Character.AI',jasper:'Jasper',deepgram:'Deepgram',
  assemblyai:'AssemblyAI',elevenlabs:'ElevenLabs',runwayml:'Runway',
  anyscale:'Anyscale',plaid:'Plaid',ramp:'Ramp',mercury:'Mercury',
  affirm:'Affirm',transferwise:'Wise',marqeta:'Marqeta',column:'Column',
  lithic:'Lithic',stytch:'Stytch',nuvei:'Nuvei',remitly:'Remitly',
  figma:'Figma',canva:'Canva',miro:'Miro',clickup:'ClickUp',
  notionhq:'Notion',coda:'Coda',pitch:'Pitch',
  cloudflare:'Cloudflare',fastly:'Fastly',digitalocean:'DigitalOcean',
  elastic:'Elastic',mongodb:'MongoDB',cockroachlabs:'Cockroach Labs',
  clickhouse:'ClickHouse',influxdata:'InfluxData',timescale:'TimescaleDB',
  vanta:'Vanta','1password':'1Password',snyk:'Snyk',wizinc:'Wiz',
  crowdstrike:'CrowdStrike',drata:'Drata',secureframe:'Secureframe',
  cribl:'Cribl',tailscale:'Tailscale',goteleport:'Teleport',
  dbtlabsinc:'dbt Labs',fivetran:'Fivetran',hex:'Hex',
  montecarlodata:'Monte Carlo',census:'Census',hightouch:'Hightouch',
  metabase:'Metabase',deel:'Deel',oysterhr:'Oyster',
  papayaglobal:'Papaya Global',omnipresent:'Omnipresent',remofirst:'Remofirst',
  lattice:'Lattice',cultureamp:'Culture Amp',
  shopify:'Shopify',bigcommerce:'BigCommerce',faire:'Faire',
  etsy:'Etsy',poshmark:'Poshmark',stockx:'StockX',
  twilio:'Twilio',sendbird:'Sendbird',stream:'Stream',
  roblox:'Roblox',epicgames:'Epic Games',unity3d:'Unity',
  alchemy:'Alchemy',chainalysis:'Chainalysis',consensys:'Consensys',
  circle:'Circle',uniswaplabs:'Uniswap',aptoslabs:'Aptos',
  offchainlabs:'Offchain Labs',phantom:'Phantom',magiceden:'Magic Eden',
  immutable:'Immutable',avalabs:'Ava Labs',
  automattic:'Automattic',hashicorp:'HashiCorp',kong:'Kong',
  algolia:'Algolia',contentful:'Contentful',sanity:'Sanity',
  storyblok:'Storyblok',ghost:'Ghost',readme:'ReadMe',gitbook:'GitBook',
  liveblocks:'Liveblocks',postman:'Postman',retool:'Retool',
  scaleai:'Scale AI',rippling:'Rippling',posthog:'PostHog',
  zapier:'Zapier',carta:'Carta',hotjar:'Hotjar',toggl:'Toggl',
  grafanalabs:'Grafana Labs',navan:'Navan',airwallex:'Airwallex',
  bettercloud:'BetterCloud',headspace:'Headspace',ro:'Ro',
  includedhealth:'Included Health',webflow:'Webflow',gitlab:'GitLab',
  gusto:'Gusto',airtable:'Airtable',vercel:'Vercel',
  turso:'Turso',denolandinc:'Deno',prisma:'Prisma',mux:'Mux',
  netlify:'Netlify',launchdarkly:'LaunchDarkly',
  sourcegraph91:'Sourcegraph',neondatabase:'Neon',railway:'Railway',
  resend:'Resend',inngest:'Inngest',axiom:'Axiom',planetscale:'PlanetScale',
  datadog:'Datadog',stripe:'Stripe',brex:'Brex',coinbase:'Coinbase',
  linear:'Linear',supabase:'Supabase',discord:'Discord',
  airbyte:'Airbyte',prefect:'Prefect',dagster:'Dagster',camunda:'Camunda',
  n8n:'n8n',snorkelai:'Snorkel AI',labelbox:'Labelbox',
  benchling:'Benchling',asana:'Asana',palantir:'Palantir',
  snowflake:'Snowflake',databricks:'Databricks',pagerduty:'PagerDuty',
  amplitude:'Amplitude',mixpanel:'Mixpanel',heap:'Heap',
  square:'Square',adyen:'Adyen',checkout:'Checkout.com',
  docusign:'DocuSign',pandadoc:'PandaDoc',calendly:'Calendly',
  gong:'Gong',salesloft:'SalesLoft',outreach:'Outreach',
  intercom:'Intercom',zendesk:'Zendesk',freshworks:'Freshworks',
  kustomer:'Kustomer',hubspot:'HubSpot',pipedrive:'Pipedrive',
  okta:'Okta',auth0:'Auth0',circleci:'CircleCI',
  newrelic:'New Relic',dynatrace:'Dynatrace',splunk:'Splunk',
  sumologic:'Sumo Logic',dropbox:'Dropbox',stackblitz:'StackBlitz',
  alloy:'Alloy',treasuryprime:'Treasury Prime',
  honeycomb:'Honeycomb',buildkite:'Buildkite',builder:'Builder.io',
  singlestore:'SingleStore',zuora:'Zuora',recharge:'ReCharge',
  toast:'Toast',mindbody:'Mindbody',housecall:'Housecall Pro',
  solarwinds:'SolarWinds',greenhouse:'Greenhouse',seekout:'SeekOut',
  vonage:'Vonage',moderntreasury:'Modern Treasury',increase:'Increase',
  moov:'Moov',chime:'Chime',robinhood:'Robinhood',
  wealthsimple:'Wealthsimple',betterment:'Betterment',
  pulumi:'Pulumi',harness:'Harness',jfrog:'JFrog',
  framer:'Framer',strapi:'Strapi',directus:'Directus',
  hygraph:'Hygraph',
  fauna:'Fauna',motherduck:'MotherDuck',questdb:'QuestDB',
  materialize:'Materialize',
  descope:'Descope',frontegg:'Frontegg',
  paddle:'Paddle',chargebee:'Chargebee',recurly:'Recurly',
  medusa:'Medusa',commercetools:'commercetools',
  cube:'Cube',thoughtspot:'ThoughtSpot',sisense:'Sisense',
  livekit:'LiveKit',daily:'Daily',cloudinary:'Cloudinary',
  'lightning-ai':'Lightning AI',cerebras:'Cerebras',groq:'Groq',
  fireworks:'Fireworks AI',
  semgrep:'Semgrep',veracode:'Veracode',
  procore:'Procore',veeva:'Veeva',servicetitan:'ServiceTitan',
  coursera:'Coursera',duolingo:'Duolingo',
  flexport:'Flexport',samsara:'Samsara',
  opendoor:'Opendoor',compass:'Compass',
  hopper:'Hopper',airbnb:'Airbnb',
  doordash:'DoorDash',instacart:'Instacart',
  reddit:'Reddit',
  braze:'Braze',onesignal:'OneSignal',
  rudderstack:'RudderStack',
  mabl:'mabl',
  appsmith:'Appsmith',
  bubble:'Bubble',
};

function guessCompany(board) {
  return CMAP[board] || board;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('🔍 MEGA SCRAPER — Target: 1400+ applications');
  console.log('   Rule: 1 best-fit REMOTE job per NEW company\n');

  const [gh, ashby, lever, jobicy, remotive] = await Promise.all([
    scrapeGreenhouse(),
    scrapeAshby(),
    scrapeLever(),
    scrapeJobicy(),
    scrapeRemotive(),
  ]);

  const allJobs = [...gh, ...ashby, ...lever, ...jobicy, ...remotive];
  console.log(`\n📊 RAW: ${allJobs.length} jobs`);

  // Dedup by URL
  const seenUrls = new Set();
  const byUrl = allJobs.filter(j => {
    if (!j.url || seenUrls.has(j.url)) return false;
    seenUrls.add(j.url);
    return true;
  });
  console.log(`   After URL dedup: ${byUrl.length}`);

  // Pick 1 BEST job per company (also filters blocklist + bad roles)
  const onePerCo = pickBestPerCompany(byUrl);
  console.log(`   After 1-per-company + blocklist + role filter: ${onePerCo.length}`);

  // Sort: auto-submittable ATS first, then by role relevance
  const atsOrder = { greenhouse: 0, ashby: 1, lever: 2, custom: 3 };
  onePerCo.sort((a, b) => {
    const ats = (atsOrder[a.atsType] || 9) - (atsOrder[b.atsType] || 9);
    if (ats !== 0) return ats;
    return roleScore(b.role) - roleScore(a.role);
  });

  // Stats
  const bySrc = {};
  onePerCo.forEach(j => { bySrc[j.atsType] = (bySrc[j.atsType] || 0) + 1; });
  const byScore = { '⭐⭐⭐': 0, '⭐⭐': 0, '⭐': 0 };
  onePerCo.forEach(j => {
    const s = roleScore(j.role);
    if (s >= 3) byScore['⭐⭐⭐']++;
    else if (s >= 2) byScore['⭐⭐']++;
    else byScore['⭐']++;
  });
  
  console.log(`\n🎯 FINAL: ${onePerCo.length} unique NEW companies`);
  console.log(`   By ATS:`, bySrc);
  console.log(`   By fit:`, byScore);
  
  console.log('\n   Top 30 companies:');
  onePerCo.slice(0, 30).forEach((j, i) => {
    const score = '⭐'.repeat(roleScore(j.role));
    console.log(`   ${String(i+1).padStart(3)}. [${j.atsType.padEnd(10)}] ${j.company.padEnd(25)} — ${j.role.slice(0,60)} ${score}`);
  });
  if (onePerCo.length > 30) console.log(`   ... and ${onePerCo.length - 30} more`);

  writeFileSync(OUTPUT_PATH, JSON.stringify(onePerCo, null, 2));
  console.log(`\n✅ Saved ${onePerCo.length} jobs to ${OUTPUT_PATH}`);
  console.log(`   Current blocklist: ${BLOCKLIST.size}`);
  console.log(`   Previous submissions: ~433`);
  console.log(`   This wave: ${onePerCo.length}`);
  console.log(`   Projected total: ~${433 + Math.floor(onePerCo.length * 0.7)}`);
}

main().catch(console.error);
