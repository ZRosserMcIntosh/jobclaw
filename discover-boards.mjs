/**
 * discover-boards.mjs — Discover MORE real Greenhouse/Ashby/Lever boards
 * 
 * Strategy:
 *  1. Scrape GitHub awesome-lists for company board slugs
 *  2. Search known tech company directories
 *  3. Try common company naming patterns
 *  4. Validate each board before adding
 *  5. Output: /tmp/discovered-boards.json
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';

const TIMEOUT = 6000;
const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const OUTPUT = '/tmp/discovered-boards.json';

async function fetchJSON(url, ms = TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(timer);
    return r.ok ? r.json() : null;
  } catch { clearTimeout(timer); return null; }
}

async function checkStatus(url, ms = TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(timer);
    return r.ok;
  } catch { clearTimeout(timer); return false; }
}

// ── Generate candidate slugs from common tech company names ──
const CANDIDATES = [
  // Y Combinator S/W batch companies (2023-2025 top ones)
  'helicone','traceloop','langfuse','e2b-dev','browserbase','pieces-app',
  'composio','agenta-ai','baserun','parea-ai','athina-ai','ragas',
  'lunary','pezzo','prompt-security','rebuff','lamatic',
  // Series A/B/C startups 2024-2025
  'gretel-ai','mostly-ai','synthetaic','tonic-ai','clearml','censius',
  'aporia','superwise','nannyml','fiddler','arthur-ai','truera',
  'kolena','deepchecks','openlayer','gantry','modelop',
  'weights-biases','neptune-ai','comet-ml','dagshub','evidently-ai',
  // Infrastructure companies
  'fly-io','modal-com','banana-dev','cerebrium','baseten',
  'beam-cloud','bentoml','seldon','algorithmia','valohai',
  'domino-data','saturn-cloud','gradient','paperspace',
  'lambda-labs','coreweave','crusoe-energy','applied-digital',
  // Additional SaaS companies (A-Z comprehensive)
  'aiven','aivencloud','algolia','appwrite','aquasecurity',
  'astronomer','athenian','auth0','betteruptime','bitrise',
  'blameless','bmc-software','bsquare','buoyant',
  'calyptia','cast-ai','chainguard','chronosphere',
  'cilium','circleci','civo','cloudbees','cloudquery',
  'codestream','codian','conduct','conductorone','confluent',
  'contract','controlmonkey','coralogix','cortex','couchbase',
  'crowdsec','databend','datadoghq','datree','debug-bear',
  'deepfence','defectdojo','deploy-hq','devrev','devspace',
  'devtron','diamanti','docker','doppler','driftctl',
  'earthly-dev','edgedb','electric-sql','emissary',
  'enabled-security','encore-dev','endor','env0','estuary',
  'exafunction','exoscale','f5','factor','fairwinds',
  'fermyon','firebolt','firefly','flagger','flagsmith',
  'flanksource','flipt','flowise','flux-cd','fonoster',
  'garden','gather-town','gcore','getambassador','getdbt',
  'getmesh','getporter','ghost-io','gitness','glasskube',
  'glue-ops','goldsky','gpt-engineer','grafana',
  'greptile','groundcover','gruntwork','gvisor',
  'harbor','hasura','hatchet-dev','headlamp','health-checks',
  'helios','highlight-run','hollow','honeybadger','hookdeck',
  'hotglue','hydra','hyperplane','icebergio',
  'immuta','inkeep','inspector','internal','isovalent',
  'jamsocket','jet-bridge','jihu','jit','jumpcloud',
  'k6','karpenter','keda','keployio','kes',
  'kestra','ketch','komodor','kosli','kubecost',
  'kubefirst','kubeshark','kubevela','kubevious',
  'lagoio','langsmith','lensesio','levelops','lightrun',
  'linear-app','linkerd','litmus','logdna','logicgate',
  'logscale','logz-io','longhorn','loom','lunatrace',
  // More companies
  'maersk-tech','mage-ai','mapbox','mariadb',
  'massdriver','mattermost','mediamachine','memphis-dev',
  'mergify','meshery','metalytics','metaplane','metrik',
  'middleware','milvus','mindbridge','mindsdb','mist-ai',
  'modern-treasury','momento','monit','monte-carlo-data',
  'naas','naologic','national-parks-tech',
  'nats','nebius','neosync','netdata','netmaker',
  'newrelic','ngrok','nixtla','nobl9','northflank',
  'novu','nrwl','nubank','numberseight',
  'observeinc','octopus-deploy','onehouse','opaque-systems',
  'open-metadata','openbb','openobserve','opsani','opsramp',
  'orbit','osano','osso','outerbounds','overloop',
  'ozone','pachyderm','palantir-tech','pangea-cyber',
  'parseable','patchstack','permit-io','pgedge','phdata',
  'pieces','piiano','pipe','platform-sh','plezi',
  'plural-sh','polarsignals','polytomic','port','postmark',
  'prefect-io','prequel','prisma-cloud','private-ai',
  'probely','prodvana','project-discovery','propel-data',
  'pulsar','qatalog','qovery','quantive',
  'quickwit','radar','railway-app','raven','reachdesk',
  'readyset','rebalance','redpanda-data','reflex-dev',
  'relayhub','relevance-ai','reliably','remix','render-com',
  'replicant','replit-dev','resmo','retable',
  'revert-dev','risingwave','roadie','robocorp',
  'rockset','rollbar','rowy','rpai','rudderstack-com',
  'runtime','safetycli','scalar','scaleway',
  'scandit','schemachange','screenly','seal-security',
  'segment-com','semaphore-ci','sendgrid','servicenow',
  'sextant','shipyard','shopmonkey','shortio','signoz',
  'singlestore','sitespect','skyflow','slai','sleuth',
  'slim-ai','snoopy','snyk-dev','socket-dev','softrams',
  'solo-io','sonatype','spacelift','spectrocloud',
  'split-io','spot-io','squadcast','stackhawk',
  'starburstdata','steampipe','stepsize','stigg-io',
  'stoat','strapi','streamdal','streamlit',
  'stytch-com','suborbital','superduperdb','superwise-ai',
  'symbl','synadia','synnax','taikun','talon-one',
  'tatum','tecton','teleport-dev','temporal-io',
  'terraform-cloud','terrakube','terrateam','testcontainers',
  'thanos','the-graph','tigerbeetle','tigera','timescaledb',
  'tinkerbell','tinybird','torq','traceable',
  'tracetest','trainml','trufflesecurity','trustero',
  'turbot','turso-dev','twistlock','typebot','ubiq',
  'ucloud','umami','unflow','unkey','uptycs',
  'upwind','usefathom','useoptic','userback',
  'vantage-sh','vcluster','vectorize','verifiable',
  'vgs','viam','video-api','vintage','virtualbox',
  'vitess-io','vlcn','volta','wasp-lang',
  'webiny','werf','wgtwo','whimsical','windmill-dev',
  'wirefilter','wonderproxy','woodpecker','workato',
  'wundergraph','xataio','xray','ybor','yugabytedb',
  'zama-ai','zapier-dev','zenml','zerodha','zilliz',
  'zitadel','zoho','zuplo',
];

// ── Validate Greenhouse boards ──
async function validateGreenhouse(slugs) {
  console.log(`\n🔍 Validating ${slugs.length} Greenhouse candidates...`);
  const valid = [];
  
  for (let i = 0; i < slugs.length; i += 30) {
    const batch = slugs.slice(i, i + 30);
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        const d = await fetchJSON(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`);
        if (d?.jobs?.length > 0) {
          return { slug, count: d.jobs.length };
        }
        return null;
      })
    );
    
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        valid.push(r.value);
      }
    }
    process.stdout.write(`\r  GH: ${Math.min(i + 30, slugs.length)}/${slugs.length} checked, ${valid.length} valid`);
  }
  console.log(`\n  ✅ Found ${valid.length} valid Greenhouse boards`);
  return valid;
}

// ── Validate Ashby boards ──
async function validateAshby(slugs) {
  console.log(`\n🔍 Validating ${slugs.length} Ashby candidates...`);
  const valid = [];
  
  for (let i = 0; i < slugs.length; i += 20) {
    const batch = slugs.slice(i, i + 20);
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        const d = await fetchJSON(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
        if (d?.jobs?.length > 0) {
          return { slug, count: d.jobs.length, company: d.jobBoard?.organizationName || slug };
        }
        return null;
      })
    );
    
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        valid.push(r.value);
      }
    }
    process.stdout.write(`\r  Ashby: ${Math.min(i + 20, slugs.length)}/${slugs.length} checked, ${valid.length} valid`);
  }
  console.log(`\n  ✅ Found ${valid.length} valid Ashby boards`);
  return valid;
}

// ── Validate Lever boards ──
async function validateLever(slugs) {
  console.log(`\n🔍 Validating ${slugs.length} Lever candidates...`);
  const valid = [];
  
  for (let i = 0; i < slugs.length; i += 20) {
    const batch = slugs.slice(i, i + 20);
    const results = await Promise.allSettled(
      batch.map(async (slug) => {
        const d = await fetchJSON(`https://api.lever.co/v0/postings/${slug}?mode=json`);
        if (Array.isArray(d) && d.length > 0) {
          return { slug, count: d.length };
        }
        return null;
      })
    );
    
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        valid.push(r.value);
      }
    }
    process.stdout.write(`\r  Lever: ${Math.min(i + 20, slugs.length)}/${slugs.length} checked, ${valid.length} valid`);
  }
  console.log(`\n  ✅ Found ${valid.length} valid Lever boards`);
  return valid;
}

async function main() {
  console.log('🔎 BOARD DISCOVERY ENGINE');
  console.log('   Validating candidate slugs across GH/Ashby/Lever...\n');

  const [gh, ashby, lever] = await Promise.all([
    validateGreenhouse(CANDIDATES),
    validateAshby(CANDIDATES),
    validateLever(CANDIDATES),
  ]);

  const result = {
    greenhouse: gh,
    ashby: ashby,
    lever: lever,
    total: gh.length + ashby.length + lever.length,
    discovered_at: new Date().toISOString(),
  };

  writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
  console.log(`\n📊 DISCOVERY COMPLETE`);
  console.log(`   Greenhouse: ${gh.length} new valid boards (${gh.reduce((s,b)=>s+b.count,0)} total jobs)`);
  console.log(`   Ashby:      ${ashby.length} new valid boards (${ashby.reduce((s,b)=>s+b.count,0)} total jobs)`);
  console.log(`   Lever:      ${lever.length} new valid boards (${lever.reduce((s,b)=>s+b.count,0)} total jobs)`);
  console.log(`   TOTAL:      ${result.total} new boards`);
  console.log(`\n   Saved to ${OUTPUT}`);
  
  // Print new board slugs for copy-paste into scraper
  if (gh.length > 0) {
    console.log('\n── NEW GREENHOUSE SLUGS ──');
    console.log(gh.map(b => `'${b.slug}'`).join(','));
  }
  if (ashby.length > 0) {
    console.log('\n── NEW ASHBY SLUGS ──');
    console.log(ashby.map(b => `'${b.slug}'`).join(','));
  }
  if (lever.length > 0) {
    console.log('\n── NEW LEVER SLUGS ──');
    console.log(lever.map(b => `'${b.slug}'`).join(','));
  }
}

main().catch(console.error);
