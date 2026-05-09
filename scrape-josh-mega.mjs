#!/usr/bin/env node
/**
 * scrape-josh-mega.mjs — JOSH MEGA SCRAPE
 *
 * Customized for Joshua A. Poolos:
 *   IT Support Specialist | Network Administrator | Cleared (DoD Secret)
 *   Atlanta, GA — open to Atlanta metro ON-SITE/HYBRID + FULLY REMOTE US
 *
 * Sources:
 *   1. Greenhouse boards (50+ companies likely to have IT/NetOps roles)
 *   2. Ashby boards  (30+ companies)
 *   3. Lever boards  (20+ companies)
 *   4. Jobicy remote-jobs API  (IT Support / Network / Sysadmin tags)
 *   5. Arbeitnow API
 *   6. Himalayas API
 *   7. Curated hardcoded list (Atlanta Fortune-500 + Defense primes)
 *
 * Output: /tmp/josh-mega-jobs.json
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';

const OUTPUT_PATH = '/tmp/josh-mega-jobs.json';
const BLOCKLIST_PATH = '/tmp/applied-companies.json';
const TIMEOUT = 10000;

// ─── Blocklist ───────────────────────────────────────────────
const BLOCKLIST = new Set(
  existsSync(BLOCKLIST_PATH)
    ? JSON.parse(readFileSync(BLOCKLIST_PATH, 'utf8')).map(c => c.toLowerCase().trim())
    : []
);
console.log(`🚫 Blocking ${BLOCKLIST.size} companies\n`);

// ─── Role Scoring (tuned for IT / Network / Sysadmin) ────────
const STRONG = /\b(it support|help.?desk|service desk|desktop support|end.?user|network admin|network administrator|sysadmin|systems admin|noc technician|network operations|it operations|it ops|field tech|deskside|workplace it|it analyst|it specialist|it technician|computer tech|cyber|information security|security analyst|security operations|cloud support|it engineer)\b/i;
const GOOD   = /\b(systems engineer|network engineer|infrastructure|devops|site reliability|cloud engineer|platform engineer|it manager|it director|technical support|support engineer|tier.?2|tier.?3|senior it|cleared|secret clearance|ts\/sci|dod|federal it)\b/i;
const OK     = /\b(support|analyst|operations|technician|specialist|administrator|engineer)\b/i;
const SKIP   = /\b(intern|new.?grad|director|vp|chief|head of|recruiter|sales|marketing|account exec|customer success|legal|finance|accounting|hr|people ops|data scientist|machine learning|full.?stack|frontend|react|software engineer)\b/i;

function roleScore(title) {
  if (!title) return 0;
  if (SKIP.test(title)) return -1;
  if (STRONG.test(title)) return 4;
  if (GOOD.test(title)) return 3;
  if (OK.test(title)) return 1;
  return 0;
}

// Atlanta location boost
const ATL_KW = /atlanta|georgia|\bga\b|alpharetta|marietta|buckhead|decatur|sandy springs|norcross|duluth|roswell|lawrenceville|peachtree|smyrna|kennesaw|cumming/i;
const REMOTE_KW = /remote|anywhere|work from home|wfh|distributed|us.?only|united states/i;

function locationScore(loc) {
  if (!loc) return 1; // assume remote-ok
  if (ATL_KW.test(loc)) return 3;
  if (REMOTE_KW.test(loc)) return 2;
  return 0; // not Atlanta, not remote → skip
}

// ─── Fetch helper ─────────────────────────────────────────────
async function fetchJSON(url, ms = TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    return await r.json();
  } catch { clearTimeout(timer); return null; }
}

function pickBestPerCompany(jobs) {
  const map = {};
  for (const j of jobs) {
    const key = j.company.toLowerCase().trim();
    if (BLOCKLIST.has(key)) continue;
    const rs = roleScore(j.role);
    const ls = locationScore(j.location || '');
    const total = rs * 10 + ls;
    if (rs < 1) continue;
    if (ls === 0) continue; // must be Atlanta or remote
    if (!map[key] || total > map[key].total) {
      map[key] = { ...j, roleScore: rs, locationScore: ls, total };
    }
  }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

// ═══════════════════════════════════════════════════════════════
// 1. GREENHOUSE BOARDS
//    Large tech companies that frequently post IT Support, Workplace IT,
//    IT Ops, NOC, Network Admin roles alongside their engineering reqs.
// ═══════════════════════════════════════════════════════════════
const GREENHOUSE_BOARDS = [
  // Big tech / Cloud / Fintech — all have Workplace/IT teams
  { slug: 'cloudflare', name: 'Cloudflare' },
  { slug: 'databricks', name: 'Databricks' },
  { slug: 'figma', name: 'Figma' },
  { slug: 'snowflake', name: 'Snowflake' },
  { slug: 'stripe', name: 'Stripe' },
  { slug: 'coinbase', name: 'Coinbase' },
  { slug: 'ramp', name: 'Ramp' },
  { slug: 'brexhq', name: 'Brex' },
  { slug: 'mercury', name: 'Mercury' },
  { slug: 'plaid', name: 'Plaid' },
  { slug: 'affirm', name: 'Affirm' },
  { slug: 'gusto', name: 'Gusto' },
  { slug: 'rippling', name: 'Rippling' },
  { slug: 'carta', name: 'Carta' },
  { slug: 'asana', name: 'Asana' },
  { slug: 'palantir', name: 'Palantir' },
  { slug: 'datadog', name: 'Datadog' },
  { slug: 'pagerduty', name: 'PagerDuty' },
  { slug: 'newrelic', name: 'New Relic' },
  { slug: 'elastic', name: 'Elastic' },
  { slug: 'splunk', name: 'Splunk' },
  { slug: 'okta', name: 'Okta' },
  { slug: 'crowdstrike', name: 'CrowdStrike' },
  { slug: 'sentinelone', name: 'SentinelOne' },
  { slug: 'vanta', name: 'Vanta' },
  { slug: 'snyk', name: 'Snyk' },
  { slug: 'dbtlabsinc', name: 'dbt Labs' },
  { slug: 'fivetran', name: 'Fivetran' },
  { slug: 'amplitude', name: 'Amplitude' },
  { slug: 'mixpanel', name: 'Mixpanel' },
  { slug: 'hubspot', name: 'HubSpot' },
  { slug: 'zendesk', name: 'Zendesk' },
  { slug: 'intercom', name: 'Intercom' },
  { slug: 'gong', name: 'Gong' },
  { slug: 'calendly', name: 'Calendly' },           // Atlanta-based!
  { slug: 'salesloft', name: 'Salesloft' },         // Atlanta-based!
  { slug: 'roadie', name: 'Roadie' },               // Atlanta-based!
  { slug: 'cardlytics', name: 'Cardlytics' },       // Atlanta-based!
  { slug: 'greensky', name: 'GreenSky' },           // Atlanta-based!
  { slug: 'pindrop', name: 'Pindrop' },             // Atlanta-based!
  { slug: 'terminus', name: 'Terminus' },            // Atlanta-based!
  { slug: 'sharecare', name: 'Sharecare' },         // Atlanta-based!
  { slug: 'vonage', name: 'Vonage' },
  { slug: 'ringcentral', name: 'RingCentral' },
  { slug: 'twilio', name: 'Twilio' },
  { slug: 'sendgrid', name: 'SendGrid' },
  { slug: 'zoom', name: 'Zoom' },
  { slug: 'dropbox', name: 'Dropbox' },
  { slug: 'box', name: 'Box' },
  { slug: 'airtable', name: 'Airtable' },
  { slug: 'notion', name: 'Notion' },
  { slug: 'clickup', name: 'ClickUp' },
  { slug: 'monday', name: 'Monday.com' },
  { slug: 'atlassian', name: 'Atlassian' },
  { slug: 'github', name: 'GitHub' },
  { slug: 'gitlab', name: 'GitLab' },
  { slug: 'hashicorp', name: 'HashiCorp' },
  { slug: 'kong', name: 'Kong' },
  { slug: 'algolia', name: 'Algolia' },
  { slug: 'contentful', name: 'Contentful' },
  { slug: 'retool', name: 'Retool' },
  { slug: 'zapier', name: 'Zapier' },
  { slug: 'postman', name: 'Postman' },
  { slug: 'scaleai', name: 'Scale AI' },
  { slug: 'anthropic', name: 'Anthropic' },
  { slug: 'openai', name: 'OpenAI' },
  { slug: 'cohere', name: 'Cohere' },
  { slug: 'wandb', name: 'Weights & Biases' },
  { slug: 'deepgram', name: 'Deepgram' },
  { slug: 'toast', name: 'Toast' },
  { slug: 'mindbody', name: 'Mindbody' },
  { slug: 'docusign', name: 'DocuSign' },
  { slug: 'pandadoc', name: 'PandaDoc' },
  { slug: 'square', name: 'Square' },
  { slug: 'marqeta', name: 'Marqeta' },
  { slug: 'deel', name: 'Deel' },
  { slug: 'oysterhr', name: 'Oyster HR' },
  { slug: 'lattice', name: 'Lattice' },
  { slug: 'cultureamp', name: 'Culture Amp' },
  { slug: 'shopify', name: 'Shopify' },
  { slug: 'etsy', name: 'Etsy' },
  { slug: 'roblox', name: 'Roblox' },
  { slug: 'unity3d', name: 'Unity Technologies' },
  { slug: 'epicgames', name: 'Epic Games' },
  { slug: 'automattic', name: 'Automattic' },
  { slug: 'solarwinds', name: 'SolarWinds' },
  { slug: 'seekout', name: 'SeekOut' },
  // Healthcare IT
  { slug: 'veeva', name: 'Veeva Systems' },
  { slug: 'phreesia', name: 'Phreesia' },
  { slug: 'modivcare', name: 'ModivCare' },
  { slug: 'healthstream', name: 'HealthStream' },
  { slug: 'nuance', name: 'Nuance Communications' },
  { slug: 'nuvei', name: 'Nuvei' },
  { slug: 'includedhealth', name: 'Included Health' },
  // Cyber / Cleared adjacent
  { slug: 'drata', name: 'Drata' },
  { slug: 'secureframe', name: 'Secureframe' },
  { slug: 'cribl', name: 'Cribl' },
  { slug: 'tailscale', name: 'Tailscale' },
  { slug: 'goteleport', name: 'Teleport' },
  { slug: 'wizinc', name: 'Wiz' },
  { slug: '1password', name: '1Password' },
  // Networking / Infra
  { slug: 'cockroachlabs', name: 'CockroachLabs' },
  { slug: 'clickhouse', name: 'ClickHouse' },
  { slug: 'influxdata', name: 'InfluxData' },
  { slug: 'digitalocean', name: 'DigitalOcean' },
  { slug: 'fastly', name: 'Fastly' },
  { slug: 'benchling', name: 'Benchling' },
];

// ═══════════════════════════════════════════════════════════════
// 2. ASHBY BOARDS
// ═══════════════════════════════════════════════════════════════
const ASHBY_BOARDS = [
  { slug: 'linear', name: 'Linear' },
  { slug: 'supabase', name: 'Supabase' },
  { slug: 'vercel', name: 'Vercel' },
  { slug: 'turso', name: 'Turso' },
  { slug: 'resend', name: 'Resend' },
  { slug: 'posthog', name: 'PostHog' },
  { slug: 'grafanalabs', name: 'Grafana Labs' },
  { slug: 'toggl', name: 'Toggl' },
  { slug: 'liveblocks', name: 'Liveblocks' },
  { slug: 'sanity', name: 'Sanity' },
  { slug: 'storyblok', name: 'Storyblok' },
  { slug: 'readme', name: 'ReadMe' },
  { slug: 'gitbook', name: 'GitBook' },
  { slug: 'prisma', name: 'Prisma' },
  { slug: 'mux', name: 'Mux' },
  { slug: 'railway', name: 'Railway' },
  { slug: 'inngest', name: 'Inngest' },
  { slug: 'axiom', name: 'Axiom' },
  { slug: 'browserstack', name: 'BrowserStack' },
  { slug: 'hex', name: 'Hex' },
  { slug: 'montecarlodata', name: 'Monte Carlo' },
  { slug: 'census', name: 'Census' },
  { slug: 'hightouch', name: 'Hightouch' },
  { slug: 'metabase', name: 'Metabase' },
  { slug: 'prefect', name: 'Prefect' },
  { slug: 'dagster', name: 'Dagster' },
  { slug: 'airbyte', name: 'Airbyte' },
  { slug: 'hotjar', name: 'Hotjar' },
  { slug: 'camunda', name: 'Camunda' },
  { slug: 'snorkelai', name: 'Snorkel AI' },
  { slug: 'labelbox', name: 'Labelbox' },
  { slug: 'navan', name: 'Navan' },
  { slug: 'airwallex', name: 'Airwallex' },
  { slug: 'remofirst', name: 'RemoFirst' },
  { slug: 'papayaglobal', name: 'Papaya Global' },
  { slug: 'anyscale', name: 'Anyscale' },
  { slug: 'replicate', name: 'Replicate' },
  { slug: 'stabilityai', name: 'Stability AI' },
  { slug: 'assemblyai', name: 'AssemblyAI' },
  { slug: 'elevenlabs', name: 'ElevenLabs' },
];

// ═══════════════════════════════════════════════════════════════
// 3. LEVER BOARDS
// ═══════════════════════════════════════════════════════════════
const LEVER_BOARDS = [
  { slug: 'netflix', name: 'Netflix' },
  { slug: 'lyft', name: 'Lyft' },
  { slug: 'doordash', name: 'DoorDash' },
  { slug: 'instacart', name: 'Instacart' },
  { slug: 'robinhood', name: 'Robinhood' },
  { slug: 'reddit', name: 'Reddit' },
  { slug: 'discord', name: 'Discord' },
  { slug: 'figma', name: 'Figma' },
  { slug: 'canva', name: 'Canva' },
  { slug: 'miro', name: 'Miro' },
  { slug: 'pitch', name: 'Pitch' },
  { slug: 'workos', name: 'WorkOS' },
  { slug: 'stytch', name: 'Stytch' },
  { slug: 'temporal', name: 'Temporal' },
  { slug: 'dagger', name: 'Dagger' },
  { slug: 'buf', name: 'Buf' },
  { slug: 'chainalysis', name: 'Chainalysis' },
  { slug: 'circle', name: 'Circle' },
  { slug: 'phantom', name: 'Phantom' },
  { slug: 'bettercloud', name: 'BetterCloud' },    // IT management SaaS!
];

// ═══════════════════════════════════════════════════════════════
// 4. HARDCODED CURATED TARGETS
//    Atlanta Fortune-500, defense primes, MSPs, healthcare IT.
//    These mostly use Workday/iCIMS but are prime targets for Josh.
//    Marked atsType: 'workday' | 'icims' | 'taleo' for manual apply.
// ═══════════════════════════════════════════════════════════════
const CURATED_ATLANTA = [
  // ── Defense / Cleared ──
  { company: 'Booz Allen Hamilton',       role: 'IT Support Specialist – Cleared',           location: 'Atlanta, GA', atsType: 'workday', url: 'https://careers.boozallen.com', archetype: 'cleared', score: 4 },
  { company: 'Leidos',                    role: 'Network Administrator (Secret)',             location: 'Remote / Atlanta', atsType: 'workday', url: 'https://leidos.com/careers', archetype: 'network', score: 4 },
  { company: 'General Dynamics IT',       role: 'Service Desk Analyst II – Cleared',         location: 'Atlanta, GA', atsType: 'icims', url: 'https://gdit.com/careers', archetype: 'helpdesk', score: 4 },
  { company: 'CACI International',        role: 'Network Engineer – Secret',                 location: 'Atlanta, GA', atsType: 'icims', url: 'https://careers.caci.com', archetype: 'network', score: 4 },
  { company: 'ManTech',                   role: 'Systems Administrator (M365/Intune) – Cleared', location: 'Remote (US)', atsType: 'icims', url: 'https://careers.mantech.com', archetype: 'sysadmin', score: 4 },
  { company: 'SAIC',                      role: 'Help Desk Technician – Secret',             location: 'Atlanta, GA', atsType: 'workday', url: 'https://jobs.saic.com', archetype: 'helpdesk', score: 4 },
  { company: 'Peraton',                   role: 'IT Support Technician – Cleared',           location: 'Atlanta, GA', atsType: 'icims', url: 'https://peraton.com/careers', archetype: 'cleared', score: 4 },
  { company: 'Northrop Grumman',          role: 'IT Field Technician – Secret',              location: 'Atlanta, GA', atsType: 'taleo', url: 'https://ngc.taleo.net/careersection', archetype: 'cleared', score: 4 },
  { company: 'Raytheon Technologies',     role: 'Network Systems Technician – Cleared',      location: 'Atlanta, GA', atsType: 'workday', url: 'https://careers.rtx.com', archetype: 'network', score: 4 },
  { company: 'Lockheed Martin',           role: 'Systems Administrator – IT Support',        location: 'Marietta, GA', atsType: 'taleo', url: 'https://www.lockheedmartinjobs.com', archetype: 'sysadmin', score: 4 },
  // ── Atlanta Fortune-500 / Enterprise ──
  { company: 'Delta Air Lines',           role: 'IT Operations Analyst',                     location: 'Atlanta, GA', atsType: 'workday', url: 'https://delta.com/careers', archetype: 'sysadmin', score: 3 },
  { company: 'The Home Depot',            role: 'Technology Support Analyst',                location: 'Atlanta, GA', atsType: 'workday', url: 'https://careers.homedepot.com', archetype: 'helpdesk', score: 3 },
  { company: 'Cox Enterprises',           role: 'IT Support Specialist',                     location: 'Atlanta, GA', atsType: 'workday', url: 'https://jobs.coxenterprises.com', archetype: 'helpdesk', score: 3 },
  { company: 'UPS',                       role: 'Network Operations Technician',             location: 'Atlanta, GA', atsType: 'workday', url: 'https://ups.jobs', archetype: 'network', score: 3 },
  { company: 'Equifax',                   role: 'IT Service Desk Analyst II',                location: 'Atlanta, GA', atsType: 'workday', url: 'https://careers.equifax.com', archetype: 'helpdesk', score: 3 },
  { company: 'NCR Voyix',                 role: 'End-User Support Engineer',                 location: 'Atlanta, GA', atsType: 'workday', url: 'https://careers.ncr.com', archetype: 'sysadmin', score: 3 },
  { company: 'Truist Financial',          role: 'Service Desk Analyst',                      location: 'Atlanta, GA', atsType: 'workday', url: 'https://careers.truist.com', archetype: 'helpdesk', score: 3 },
  { company: 'Inspire Brands',           role: 'IT Support Specialist',                     location: 'Atlanta, GA', atsType: 'workday', url: 'https://inspirebrands.com/careers', archetype: 'helpdesk', score: 3 },
  { company: 'Coca-Cola Company',         role: 'End User Compute Technician',               location: 'Atlanta, GA', atsType: 'workday', url: 'https://careers.coca-colacompany.com', archetype: 'sysadmin', score: 3 },
  { company: 'Intercontinental Exchange', role: 'IT Operations Engineer',                    location: 'Atlanta, GA', atsType: 'workday', url: 'https://careers.ice.com', archetype: 'sysadmin', score: 3 },
  { company: 'Global Payments',          role: 'IT Support Analyst',                        location: 'Atlanta, GA', atsType: 'workday', url: 'https://careers.globalpayments.com', archetype: 'helpdesk', score: 3 },
  { company: 'Fiserv',                    role: 'Network Support Technician',                location: 'Atlanta, GA', atsType: 'workday', url: 'https://careers.fiserv.com', archetype: 'network', score: 3 },
  { company: 'Norfolk Southern',          role: 'IT Field Technician',                       location: 'Atlanta, GA', atsType: 'workday', url: 'https://jobs.nscorp.com', archetype: 'helpdesk', score: 3 },
  { company: 'Pulte Group',              role: 'IT Support Analyst',                        location: 'Atlanta, GA', atsType: 'workday', url: 'https://careers.pultegroup.com', archetype: 'helpdesk', score: 3 },
  { company: 'Mohawk Industries',         role: 'Systems Administrator',                     location: 'Calhoun, GA', atsType: 'workday', url: 'https://careers.mohawkind.com', archetype: 'sysadmin', score: 3 },
  // ── Atlanta Tech ──
  { company: 'OneTrust',                  role: 'IT Support Specialist',                     location: 'Atlanta, GA', atsType: 'greenhouse', url: 'https://onetrust.com/careers', archetype: 'helpdesk', score: 3 },
  { company: 'Greenlight Financial',      role: 'IT Operations Analyst',                     location: 'Atlanta, GA', atsType: 'greenhouse', url: 'https://greenlightcard.com/careers', archetype: 'sysadmin', score: 3 },
  { company: 'Stibo Systems',             role: 'IT Support Technician',                     location: 'Atlanta, GA', atsType: 'workday', url: 'https://stibosystems.com/careers', archetype: 'helpdesk', score: 3 },
  { company: 'EzShield / Sontiq',         role: 'IT Support Specialist',                     location: 'Atlanta, GA', atsType: 'workday', url: 'https://sontiq.com/careers', archetype: 'helpdesk', score: 2 },
  { company: 'Ionic Security',            role: 'Network Engineer',                          location: 'Atlanta, GA', atsType: 'greenhouse', url: 'https://ionic.com/careers', archetype: 'network', score: 3 },
  // ── Healthcare IT ──
  { company: 'Emory Healthcare',          role: 'Desktop Support Analyst',                   location: 'Atlanta, GA', atsType: 'cornerstone', url: 'https://emoryhealthcare.org/careers', archetype: 'healthcare', score: 3 },
  { company: 'Piedmont Healthcare',       role: 'IT Support Technician',                     location: 'Atlanta, GA', atsType: 'workday', url: 'https://careers.piedmont.org', archetype: 'healthcare', score: 3 },
  { company: 'WellStar Health System',    role: 'Service Desk Analyst',                      location: 'Marietta, GA', atsType: 'workday', url: 'https://wellstar.org/careers', archetype: 'healthcare', score: 3 },
  { company: 'Grady Health System',       role: 'IT Support Specialist',                     location: 'Atlanta, GA', atsType: 'workday', url: 'https://careers.gradyhealth.org', archetype: 'healthcare', score: 3 },
  { company: 'Optum (UnitedHealth)',       role: 'Service Desk Analyst – Remote',             location: 'Remote (US)', atsType: 'workday', url: 'https://jobs.optum.com', archetype: 'healthcare', score: 3 },
  { company: 'Change Healthcare',         role: 'Healthcare IT Support Specialist',          location: 'Remote / Atlanta', atsType: 'workday', url: 'https://changeclinical.org/careers', archetype: 'healthcare', score: 3 },
  // ── Remote MSP / VAR / IT Services ──
  { company: 'Rackspace Technology',      role: 'Cloud / Network Support Engineer',          location: 'Remote (US)', atsType: 'workday', url: 'https://rackspace.com/talent', archetype: 'network', score: 3 },
  { company: 'CDW',                       role: 'Service Desk Technician II',                location: 'Remote (US)', atsType: 'workday', url: 'https://careers.cdw.com', archetype: 'helpdesk', score: 3 },
  { company: 'Presidio',                  role: 'Network Support Engineer',                  location: 'Remote (US)', atsType: 'icims', url: 'https://presidio.com/careers', archetype: 'network', score: 3 },
  { company: 'Insight Direct',            role: 'IT Support Specialist',                     location: 'Remote (US)', atsType: 'icims', url: 'https://careers.insight.com', archetype: 'helpdesk', score: 3 },
  { company: 'Atos',                      role: 'Network Operations Center Technician',      location: 'Remote (US)', atsType: 'workday', url: 'https://atos.net/en/careers', archetype: 'network', score: 3 },
  { company: 'Unison',                    role: 'IT Support Specialist – Cleared',           location: 'Atlanta, GA', atsType: 'icims', url: 'https://unisonits.com/careers', archetype: 'cleared', score: 4 },
  { company: 'Acclaim Technical Services','role': 'Network Engineer – Secret Clearance',    location: 'Remote (US)', atsType: 'workday', url: 'https://acclaimts.com/careers', archetype: 'cleared', score: 4 },
  { company: 'Maximus Federal',           role: 'IT Help Desk Analyst – Cleared',            location: 'Remote / Atlanta', atsType: 'workday', url: 'https://www.maximus.com/careers', archetype: 'cleared', score: 4 },
  { company: 'Perspecta',                 role: 'IT Support Specialist – DoD',               location: 'Atlanta, GA', atsType: 'workday', url: 'https://perspecta.com/careers', archetype: 'cleared', score: 4 },
  { company: 'Torch Technologies',        role: 'Network Administrator – Cleared',           location: 'Remote (US)', atsType: 'icims', url: 'https://torchtechnologies.com/careers', archetype: 'cleared', score: 4 },
  { company: 'Barbaricum',                role: 'IT Systems Administrator – Secret',         location: 'Remote (US)', atsType: 'workday', url: 'https://barbaricum.com/careers', archetype: 'cleared', score: 4 },
  { company: 'Amentum',                   role: 'IT Support Technician – Cleared',           location: 'Atlanta, GA', atsType: 'workday', url: 'https://amentum.com/careers', archetype: 'cleared', score: 4 },
  { company: 'DXC Technology',            role: 'IT Service Desk Analyst',                   location: 'Remote (US)', atsType: 'workday', url: 'https://dxc.com/us/en/careers', archetype: 'helpdesk', score: 3 },
  { company: 'Leidos Digital',            role: 'IT Help Desk Specialist – Secret',          location: 'Remote (US)', atsType: 'workday', url: 'https://leidos.com/careers', archetype: 'cleared', score: 4 },
  { company: 'MITRE',                     role: 'Network Systems Engineer – Cleared',        location: 'Atlanta, GA', atsType: 'workday', url: 'https://careers.mitre.org', archetype: 'cleared', score: 4 },
];

// ═══════════════════════════════════════════════════════════════
// API FETCHERS
// ═══════════════════════════════════════════════════════════════
async function fetchGreenhouse(slug, name) {
  const data = await fetchJSON(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`);
  if (!data?.jobs) return [];
  return data.jobs.map(j => ({
    company: name, role: j.title,
    location: j.location?.name || '',
    url: j.absolute_url, atsType: 'greenhouse', archetype: null,
    score: roleScore(j.title), locationScore: locationScore(j.location?.name || ''),
  }));
}

async function fetchAshby(slug, name) {
  const data = await fetchJSON(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
  if (!data?.jobs) return [];
  return data.jobs.map(j => ({
    company: name, role: j.title,
    location: j.location || '',
    url: `https://jobs.ashbyhq.com/${slug}/${j.id}`, atsType: 'ashby', archetype: null,
    score: roleScore(j.title), locationScore: locationScore(j.location || ''),
  }));
}

async function fetchLever(slug, name) {
  const data = await fetchJSON(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  if (!Array.isArray(data)) return [];
  return data.map(j => ({
    company: name, role: j.text,
    location: j.categories?.location || '',
    url: j.hostedUrl, atsType: 'lever', archetype: null,
    score: roleScore(j.text), locationScore: locationScore(j.categories?.location || ''),
  }));
}

async function fetchJobicy() {
  console.log('  📡 Fetching Jobicy (IT Support, Network)...');
  const tags = ['it-support', 'sysadmin', 'network-administrator', 'help-desk', 'system-administrator'];
  const results = [];
  for (const tag of tags) {
    const data = await fetchJSON(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${tag}`);
    if (!data?.jobs) continue;
    for (const j of data.jobs) {
      const loc = j.jobGeo || 'Remote';
      if (locationScore(loc) === 0 && !REMOTE_KW.test(loc)) continue;
      results.push({
        company: j.companyName, role: j.jobTitle,
        location: loc, url: j.url, atsType: 'jobicy', archetype: null,
        score: roleScore(j.jobTitle), locationScore: locationScore(loc),
      });
    }
  }
  return results;
}

async function fetchHimalayas() {
  console.log('  📡 Fetching Himalayas (IT / Network / Sysadmin)...');
  const queries = ['IT+Support', 'Network+Administrator', 'Systems+Administrator', 'Service+Desk', 'Help+Desk'];
  const results = [];
  for (const q of queries) {
    const data = await fetchJSON(`https://himalayas.app/jobs/api?q=${q}&limit=30`);
    if (!data?.jobs) continue;
    for (const j of data.jobs) {
      const loc = j.location || 'Remote';
      results.push({
        company: j.company?.name || j.companyName || 'Unknown',
        role: j.title, location: loc,
        url: j.applicationUrl || j.url || '', atsType: 'himalayas', archetype: null,
        score: roleScore(j.title), locationScore: locationScore(loc),
      });
    }
  }
  return results;
}

async function fetchArbeitnow() {
  console.log('  📡 Fetching Arbeitnow (Remote IT)...');
  const data = await fetchJSON('https://www.arbeitnow.com/api/job-board-api?category=it&page=1');
  if (!data?.data) return [];
  return data.data.map(j => ({
    company: j.company_name, role: j.title,
    location: j.location || 'Remote', url: j.url, atsType: 'arbeitnow', archetype: null,
    score: roleScore(j.title), locationScore: locationScore(j.location || 'Remote'),
  }));
}

// ═══════════════════════════════════════════════════════════════
// ARCHETYPE ASSIGNMENT
// Maps role keywords to Josh's 5 resume archetypes
// ═══════════════════════════════════════════════════════════════
function assignArchetype(role, company) {
  const r = (role || '').toLowerCase();
  const c = (company || '').toLowerCase();

  // Cleared / Federal
  if (/cleared|secret|dod|federal|government|defense|military|cyber|intelligence|nsa|cia|dhs/i.test(r + ' ' + c))
    return 'cleared';
  // Defense companies → cleared archetype regardless of role title
  if (/booz|leidos|gdit|caci|mantech|saic|peraton|northrop|raytheon|lockheed|mitre|torch|barbaricum|amentum|maximus|unison|acclaim|perspecta/i.test(c))
    return 'cleared';
  // Healthcare IT
  if (/health|hospital|clinic|emory|piedmont|wellstar|grady|medical|epic|veeva|optum|change health|healthcare/i.test(r + ' ' + c))
    return 'healthcare';
  // Network / NOC
  if (/network|noc|cisco|routing|switching|infrastructure|bgp|ospf|wan|lan|vpn/i.test(r))
    return 'network';
  // Sysadmin / M365 / Cloud
  if (/sysadmin|systems admin|azure|intune|m365|microsoft|cloud|it ops|it operations|endpoint|workplace/i.test(r))
    return 'sysadmin';
  // Default → helpdesk
  return 'helpdesk';
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('🦀 Josh Mega Scrape — Joshua A. Poolos\n');
  console.log('🎯 Target: IT Support | Network Admin | Sysadmin | Cleared | Atlanta + Remote\n');

  let allJobs = [];

  // ── ATS Boards ──
  const total = GREENHOUSE_BOARDS.length + ASHBY_BOARDS.length + LEVER_BOARDS.length;
  let done = 0;

  console.log(`🌱 Greenhouse (${GREENHOUSE_BOARDS.length} boards)...`);
  for (const b of GREENHOUSE_BOARDS) {
    const jobs = await fetchGreenhouse(b.slug, b.name);
    const hits = jobs.filter(j => j.score >= 1 && j.locationScore >= 1);
    if (hits.length) {
      console.log(`   ✅ ${b.name}: ${hits.length} match(es) → ${hits.map(h => h.role).join(', ')}`);
      allJobs.push(...hits);
    }
    done++;
    if (done % 20 === 0) console.log(`   ... ${done}/${total} boards scanned`);
  }

  console.log(`\n🔷 Ashby (${ASHBY_BOARDS.length} boards)...`);
  for (const b of ASHBY_BOARDS) {
    const jobs = await fetchAshby(b.slug, b.name);
    const hits = jobs.filter(j => j.score >= 1 && j.locationScore >= 1);
    if (hits.length) {
      console.log(`   ✅ ${b.name}: ${hits.length} match(es) → ${hits.map(h => h.role).join(', ')}`);
      allJobs.push(...hits);
    }
  }

  console.log(`\n🔵 Lever (${LEVER_BOARDS.length} boards)...`);
  for (const b of LEVER_BOARDS) {
    const jobs = await fetchLever(b.slug, b.name);
    const hits = jobs.filter(j => j.score >= 1 && j.locationScore >= 1);
    if (hits.length) {
      console.log(`   ✅ ${b.name}: ${hits.length} match(es) → ${hits.map(h => h.role).join(', ')}`);
      allJobs.push(...hits);
    }
  }

  // ── Job Board APIs ──
  console.log('\n🌐 Remote job board APIs...');
  const apiResults = await Promise.allSettled([
    fetchJobicy(), fetchHimalayas(), fetchArbeitnow()
  ]);
  for (const r of apiResults) {
    if (r.status === 'fulfilled') allJobs.push(...r.value);
  }

  // ── Curated Atlanta targets ──
  console.log('\n📍 Adding curated Atlanta/Federal targets...');
  for (const t of CURATED_ATLANTA) {
    allJobs.push({
      ...t,
      score: t.score,
      locationScore: locationScore(t.location),
      total: t.score * 10 + locationScore(t.location),
    });
  }

  // ── Assign archetypes to scraped jobs ──
  for (const j of allJobs) {
    if (!j.archetype) j.archetype = assignArchetype(j.role, j.company);
  }

  console.log(`\n📊 Raw results: ${allJobs.length} jobs`);

  // ── Deduplicate: best per company ──
  const final = pickBestPerCompany(allJobs);
  console.log(`📊 After dedup (1 per company): ${final.length} companies\n`);

  // ── Stats by archetype ──
  const byArch = {};
  for (const j of final) {
    byArch[j.archetype] = (byArch[j.archetype] || 0) + 1;
  }
  console.log('📋 Breakdown by archetype:');
  for (const [k, v] of Object.entries(byArch)) console.log(`   ${k}: ${v}`);
  console.log();

  // ── Write output ──
  writeFileSync(OUTPUT_PATH, JSON.stringify(final, null, 2));
  console.log(`✅ Written to ${OUTPUT_PATH}`);
  console.log(`\n🚀 Next step: node generate-josh-pdfs.mjs`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
