#!/usr/bin/env node
/**
 * generate-josh-pdfs.mjs — JOSH PDF GENERATOR
 *
 * Reads /tmp/josh-mega-jobs.json (produced by scrape-josh-mega.mjs),
 * picks the top companies, renders a tailored résumé + cover letter
 * for each using Playwright, and writes:
 *
 *   output/joshua-poolos/applications/{NN-slug}/
 *     ├── resume.pdf
 *     ├── cover-letter.pdf
 *     ├── resume.html          (intermediate, for inspection)
 *     └── cover-letter.html
 *
 * Also writes:
 *   output/joshua-poolos/TOP-10-REVIEW.md  ← manual review shortlist
 *   output/joshua-poolos/FULL-PIPELINE.md  ← complete target list
 *
 * Usage:
 *   node generate-josh-pdfs.mjs [--limit=30] [--top=10]
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────
const JOBS_PATH   = '/tmp/josh-mega-jobs.json';
const OUT_ROOT    = resolve(__dirname, 'output/joshua-poolos');
const APPS_DIR    = resolve(OUT_ROOT, 'applications');
const FONTS_DIR   = resolve(__dirname, 'fonts');
const FONT_URL    = `file://${FONTS_DIR}/`;

const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.slice(2).split('=');
    return [k, v ?? true];
  })
);
const LIMIT = parseInt(args.limit ?? '110', 10);  // render top N companies
const TOP   = parseInt(args.top   ?? '10',  10);  // shortlist for manual review
const TODAY = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// ─── Joshua's Master Facts (100% from JP-N-R.odt) ────────────
const JOSH = {
  name:     'Joshua A. Poolos',
  email:    'joshuapoolos@gmail.com',
  phone:    '(404) 769-1599',
  location: 'Atlanta, GA',
  clearance: 'Active DoD Secret Clearance',
  linkedin: '',
  // ── Experience verbatim from ODT ──
  experience: [
    {
      company:  'Surgical Information Systems (SIS)',
      role:     'IT Support Specialist',
      period:   'June 2024 – Present',
      location: 'Atlanta, GA',
      bullets: [
        'Resolved 1,500+ tickets via Zendesk ticketing system across a hybrid Microsoft 365 / Azure environment',
        'Provisioned and maintained accounts for ~1,000 users in a hybrid Microsoft Azure / Intune environment',
        'Led 5 projects for implementation of new software and systems for the user base',
        'Owned IT side of migration and integration of 500 users during a corporate acquisition',
        'Maintained telephony and call-queue administration via RingCentral',
        'Administered and expanded SharePoint sites for cross-functional teams',
        'Software updates and patching of hardware; monitored user, app, and device logs through Intune',
        'Resolved Tier-1 security alerts; coordinated with Security team on higher-level events',
        'Currently leading project to integrate Microsoft Copilot into corporate structure while preserving PHI and PII security',
        'Ongoing training with Palo Alto and Cisco Meraki systems; PowerShell automation',
      ],
    },
    {
      company:  'United States Marine Corps Reserves',
      role:     'Network Administrator (MOS 0631)',
      period:   'May 2021 – Present',
      location: '',
      bullets: [
        'Trained on and operate Cisco enterprise networking equipment (routers and switches)',
        'Implemented encryption, interior and exterior routing protocols (BGP, OSPF, EIGRP), security protocols (ISAKMP/IPSEC, GRE, VRF), and VoIP on military networks',
        'Established secure network of 60 users on five switches and two routers in a field environment in a three-day time frame',
        'Trained Marines on use of VRF, EIGRP, BGP, OSPF, GRE, ISAKMP/IPSEC, and other network protocols',
        'Managed Marines in deployment of enterprise networks during 5 exercises',
        'Helpdesk and IT troubleshooting via BMC Remedy ticket system for ~50 local and 300 geographically dispersed users',
        'Provisioning and maintaining of 400 user accounts via Active Directory; managing Distro Lists and OMBs',
        'Performed hardware modifications and upgrades on multiple asset systems',
        'Implemented inventory system for 400+ laptops and 100+ pieces of communications equipment',
        'Coordinated with other DoD branches for 5 successful joint exercises',
        'Ensured proper handling of PII for 300 Marines; trained 45 Marines on SOP for record maintenance and proper storing and disposal',
        'Successfully accounted for inventory and sign-over of $8 million worth of DoD communications equipment',
      ],
    },
    {
      company:  'PDQ-PC Inc.',
      role:     'Network Administrator',
      period:   'December 2020 – November 2021',
      location: '',
      bullets: [
        'Configured and maintained a private network with 68 users, 20 VLANs, and SSH-based remote management',
        'Maintained records and backups of network configuration on separate servers',
        'Network troubleshooting via SSH',
      ],
    },
  ],
  education: [
    { degree: 'B.S. Neuroscience', school: 'Georgia State University', location: 'Atlanta, GA', year: '2021' },
  ],
  certifications: [
    { title: 'Network Administrator (MOS 0631)', org: 'U.S. Marine Corps', year: '2022' },
    { title: 'Basic Communications Course', org: 'U.S. Marine Corps', year: '2022' },
    { title: 'Cyber Awareness Certification', org: 'DoD', year: '2021–2025' },
    { title: 'Risk Management', org: 'U.S. Marine Corps', year: '2025' },
    { title: 'Records Maintenance', org: 'U.S. Marine Corps', year: '2025' },
    { title: 'Leadership and Management', org: 'U.S. Marine Corps', year: '2025' },
    { title: 'Active DoD Secret Clearance', org: 'U.S. Department of Defense', year: 'Current' },
  ],
  references: [
    'Ricki Desai — USMC Captain, Communications Officer — (770) 855-8834',
    'Jonathan McFadden — USMC Staff Sergeant, Data Administrator — (203) 545-2079',
    'Liam Farrell — USMC LCpl, Network Administrator — (470) 380-5016',
    'Robert Jennings — Systems Administrator, SIS — (864) 431-8548',
  ],
};

// ─── The 5 Archetypes ─────────────────────────────────────────
// Each defines: summary, competencies, experience bullet ordering, skill emphasis
const ARCHETYPES = {

  // ── Cleared / Federal ──────────────────────────────────────
  cleared: {
    label: 'Cleared / Federal IT',
    summary: `USMC Reserve Network Administrator (MOS 0631) and full-time IT Support Specialist with an
    <strong>active DoD Secret Clearance</strong> held continuously since 2021. Three years of enterprise IT
    experience at a healthcare software firm — 1,500+ Zendesk tickets resolved, 1,000-user hybrid
    Microsoft 365 / Azure / Intune environment, 500-user acquisition migration — layered on four years
    standing up and operating Cisco enterprise networks under operational deadlines (BGP, OSPF, EIGRP,
    ISAKMP/IPSEC, VRF). Trusted with $8M in DoD communications equipment and PII for 300 service members.
    U.S. citizen, bilingual English / Spanish, no relocation or sponsorship required.`,
    competencies: [
      'Active DoD Secret Clearance', 'USMC 0631 Network Administrator',
      'Microsoft 365 / Azure AD / Intune', 'Cisco BGP / OSPF / EIGRP / IPSEC',
      'Active Directory (400-user scope)', 'BMC Remedy & Zendesk (1,500+ tickets)',
      'PHI / PII Compliance', 'Field Network Stand-up & Ops',
      'Hardware & Asset Management ($8M)', 'Bilingual English / Spanish',
    ],
    expOrder: [1, 0, 2], // USMC first, then SIS, then PDQ
    skills: `
      <div class="skill-category">Clearance & Federal:</div>
      <div class="skill-item">Active DoD Secret · USMC MOS 0631 · BMC Remedy · PII/PHI Handling · Records Maintenance (2025) · Risk Management (2025)</div>
      <div class="skill-category" style="margin-top:6px">Networking:</div>
      <div class="skill-item">Cisco IOS · BGP · OSPF · EIGRP · GRE · ISAKMP/IPSEC · VRF · VLANs · SSH · VoIP · Palo Alto (training) · Cisco Meraki (training)</div>
      <div class="skill-category" style="margin-top:6px">Endpoint & Identity:</div>
      <div class="skill-item">Microsoft 365 · Azure AD / Entra ID · Intune · Active Directory · SharePoint · Windows · macOS</div>
      <div class="skill-category" style="margin-top:6px">Tools & Languages:</div>
      <div class="skill-item">Zendesk · BMC Remedy · RingCentral · PowerShell (in progress) · English (native) · Spanish (fluent)</div>
    `,
  },

  // ── Network / NOC ──────────────────────────────────────────
  network: {
    label: 'Network Administrator / NOC',
    summary: `USMC Reserve Network Administrator (MOS 0631) with four years of hands-on Cisco enterprise
    networking — BGP, OSPF, EIGRP, GRE, ISAKMP/IPSEC, VRF, and VoIP — deployed in field environments
    and five joint DoD exercises. Stood up a 60-user / 5-switch / 2-router secure network in three days
    under operational deadline. Accountable for $8M in communications equipment. Parallel civilian career
    at Surgical Information Systems maintaining a 1,000-user hybrid M365 / Azure / Intune environment with
    1,500+ Zendesk tickets resolved, RingCentral telephony administration, and ongoing training in Palo Alto
    and Cisco Meraki. Active DoD Secret Clearance. Atlanta-based, bilingual English / Spanish.`,
    competencies: [
      'Cisco Routers & Switches (Enterprise)', 'BGP / OSPF / EIGRP / GRE / IPSEC',
      'VRF Segmentation & VoIP', 'VLANs / SSH / Network Security',
      'Palo Alto (training) · Cisco Meraki (training)', 'Field Network Deployment',
      'Active DoD Secret Clearance', 'Microsoft 365 / Azure AD / Intune',
      'RingCentral Telephony Admin', 'Bilingual English / Spanish',
    ],
    expOrder: [1, 2, 0], // USMC first, PDQ, then SIS
    skills: `
      <div class="skill-category">Networking:</div>
      <div class="skill-item">Cisco IOS · BGP · OSPF · EIGRP · GRE · ISAKMP/IPSEC · VRF · VLANs · SSH · VoIP · Palo Alto (training) · Cisco Meraki (training)</div>
      <div class="skill-category" style="margin-top:6px">Endpoint & Identity:</div>
      <div class="skill-item">Microsoft 365 · Azure AD / Entra ID · Intune · Active Directory · SharePoint · RingCentral</div>
      <div class="skill-category" style="margin-top:6px">Tools & Clearance:</div>
      <div class="skill-item">Active DoD Secret · BMC Remedy · Zendesk · PowerShell (in progress) · English (native) · Spanish (fluent)</div>
    `,
  },

  // ── Sysadmin / M365 ────────────────────────────────────────
  sysadmin: {
    label: 'Systems Administrator (M365 / Azure / Intune)',
    summary: `IT Support Specialist with three years managing a 1,000-user hybrid <strong>Microsoft 365 /
    Azure AD / Intune</strong> environment at Surgical Information Systems in Atlanta — 1,500+ Zendesk tickets
    resolved, five system-rollout projects led, and IT lead on a 500-user corporate acquisition migration.
    Currently driving the company's Microsoft Copilot rollout under PHI / PII security constraints. Parallel
    USMC Reserve role as a Network Administrator (MOS 0631) adds depth in Cisco routing/switching, Active
    Directory account administration, and disciplined PII handling. Active DoD Secret Clearance. Atlanta-based,
    bilingual English / Spanish.`,
    competencies: [
      'Microsoft 365 / Azure AD / Entra ID', 'Microsoft Intune (MDM / MAM)',
      'SharePoint Administration', 'Active Directory (400-user scope)',
      'RingCentral Telephony & Call-Queue Admin', 'Zendesk Tier-2 (1,500+ tickets)',
      'M&A User Migration (500 users)', 'Microsoft Copilot Enterprise Rollout',
      'PHI / PII Compliance', 'Active DoD Secret Clearance',
    ],
    expOrder: [0, 1, 2], // SIS first
    skills: `
      <div class="skill-category">Endpoint & Identity:</div>
      <div class="skill-item">Microsoft 365 · Azure AD / Entra ID · Intune (MDM/MAM) · Active Directory · SharePoint · Windows · macOS</div>
      <div class="skill-category" style="margin-top:6px">Productivity & Telephony:</div>
      <div class="skill-item">Microsoft Teams · RingCentral · SharePoint Online · Microsoft Copilot (rollout)</div>
      <div class="skill-category" style="margin-top:6px">Ticketing & Security:</div>
      <div class="skill-item">Zendesk · BMC Remedy · Palo Alto (training) · Cisco Meraki (training) · PHI/PII Handling · Device Encryption</div>
      <div class="skill-category" style="margin-top:6px">Networking & Automation:</div>
      <div class="skill-item">Cisco IOS · BGP/OSPF/IPSEC · VLANs · SSH · PowerShell (in progress)</div>
      <div class="skill-category" style="margin-top:6px">Languages:</div>
      <div class="skill-item">English (native) · Spanish (fluent, written & spoken)</div>
    `,
  },

  // ── Helpdesk / Service Desk ────────────────────────────────
  helpdesk: {
    label: 'Service Desk / IT Support (Tier 2–3)',
    summary: `IT Support Specialist at Surgical Information Systems with a measurable record of high-volume
    Tier-2 service-desk performance: <strong>1,500+ Zendesk tickets</strong> resolved across a 1,000-user
    hybrid Microsoft 365 / Azure / Intune environment, plus five system-rollout projects led and the
    IT lead on a 500-user acquisition migration. Adds BMC Remedy experience and Tier-2 proficiency from
    a parallel USMC Reserve role as a Network Administrator (MOS 0631), where I also provisioned and
    managed 400 Active Directory accounts. Bilingual English / Spanish — multilingual end-user support.
    Active DoD Secret Clearance. Atlanta-local, no relocation needed.`,
    competencies: [
      'Zendesk Tier-2 (1,500+ tickets)', 'BMC Remedy (USMC)',
      'Microsoft 365 / Azure AD / Intune', 'Active Directory Provisioning',
      'Windows & macOS Troubleshooting', 'PHI / PII Compliance',
      'M&A User Migration (500 users)', 'SharePoint & RingCentral Admin',
      'Active DoD Secret Clearance', 'Bilingual English / Spanish',
    ],
    expOrder: [0, 1, 2], // SIS first
    skills: `
      <div class="skill-category">Ticketing & Support:</div>
      <div class="skill-item">Zendesk · BMC Remedy · Tier-2 Escalation · Phone & Remote Support</div>
      <div class="skill-category" style="margin-top:6px">Endpoint & Identity:</div>
      <div class="skill-item">Microsoft 365 · Azure AD / Entra ID · Intune · Active Directory · SharePoint · RingCentral · Windows · macOS</div>
      <div class="skill-category" style="margin-top:6px">Security & Compliance:</div>
      <div class="skill-item">PHI / PII Handling · Device Encryption · Tier-1 Security Alert Triage · DoD Secret Clearance</div>
      <div class="skill-category" style="margin-top:6px">Networking:</div>
      <div class="skill-item">Cisco IOS · BGP/OSPF/IPSEC · VLANs · SSH · Palo Alto (training) · Cisco Meraki (training)</div>
      <div class="skill-category" style="margin-top:6px">Languages:</div>
      <div class="skill-item">English (native) · Spanish (fluent, written & spoken)</div>
    `,
  },

  // ── Healthcare IT ──────────────────────────────────────────
  healthcare: {
    label: 'Healthcare IT Support',
    summary: `IT Support Specialist with three years in <strong>healthcare software</strong> at Surgical
    Information Systems — managing a 1,000-user hybrid Microsoft 365 / Azure / Intune environment under
    strict <strong>PHI and PII security requirements</strong>. Resolved 1,500+ Zendesk tickets, led five
    system-rollout projects, owned the IT side of a 500-user acquisition migration, and currently leading
    the company's secure Microsoft Copilot rollout while maintaining PHI / PII boundaries. B.S. in
    <strong>Neuroscience</strong> from Georgia State University brings genuine clinical literacy. Active
    DoD Secret Clearance via USMC Reserve role as a Network Administrator (MOS 0631). Atlanta-based,
    bilingual English / Spanish.`,
    competencies: [
      'PHI / PII Security & Compliance', 'Healthcare Software (SIS) Environment',
      'Microsoft 365 / Azure AD / Intune', 'Zendesk Tier-2 (1,500+ tickets)',
      'Microsoft Copilot Rollout (PHI-Constrained)', 'M&A User Migration (500 users)',
      'Active Directory & SharePoint Admin', 'B.S. Neuroscience (clinical literacy)',
      'Active DoD Secret Clearance', 'Bilingual English / Spanish',
    ],
    expOrder: [0, 1, 2], // SIS first (healthcare context)
    skills: `
      <div class="skill-category">Healthcare IT & Compliance:</div>
      <div class="skill-item">PHI / PII Handling · HIPAA-Adjacent Procedures · Healthcare Software (SIS) · Microsoft Copilot (PHI-constrained rollout)</div>
      <div class="skill-category" style="margin-top:6px">Endpoint & Identity:</div>
      <div class="skill-item">Microsoft 365 · Azure AD / Entra ID · Intune · Active Directory · SharePoint · Windows · macOS</div>
      <div class="skill-category" style="margin-top:6px">Ticketing & Support:</div>
      <div class="skill-item">Zendesk · BMC Remedy · RingCentral</div>
      <div class="skill-category" style="margin-top:6px">Networking & Security:</div>
      <div class="skill-item">Cisco IOS · BGP/OSPF/IPSEC · VLANs · SSH · Palo Alto (training) · Device Encryption</div>
      <div class="skill-category" style="margin-top:6px">Education & Languages:</div>
      <div class="skill-item">B.S. Neuroscience, Georgia State University (2021) · English (native) · Spanish (fluent)</div>
    `,
  },
};

// ─── Cover Letter Bodies ──────────────────────────────────────
function coverLetterBody(archetype, company, role) {
  const co = company;
  const r  = role;

  const bodies = {
    cleared: `<p>I am applying for the <strong>${r}</strong> opening at ${co}. I hold an <strong>active DoD Secret Clearance</strong> continuously since 2021, serve as a <strong>USMC Reserve Network Administrator (MOS 0631)</strong>, and work full-time as an IT Support Specialist at Surgical Information Systems in Atlanta — meaning I can step into a cleared engagement on day one, with no sponsorship wait and no relocation.</p>

<div class="section-label">What I bring to ${co}</div>
<ul>
  <li><strong>Clearance-ready, immediately:</strong> Active Secret, current and held since 2021 through USMC Reserve service. Comfortable in high-PII, classified, and restricted-access environments.</li>
  <li><strong>Enterprise IT depth:</strong> 1,500+ Zendesk tickets resolved across a 1,000-user hybrid Microsoft 365 / Azure / Intune environment at SIS — including the IT lead on a 500-user acquisition migration and an ongoing Microsoft Copilot rollout under PHI / PII constraints.</li>
  <li><strong>Cisco enterprise networking:</strong> Four years deploying BGP, OSPF, EIGRP, GRE, ISAKMP/IPSEC, and VRF in field environments — stood up a 60-user / 5-switch / 2-router secure network in three days, and accountable for $8M in DoD communications equipment.</li>
  <li><strong>Bilingual English / Spanish</strong> — useful in diverse team and client environments.</li>
</ul>

<p>I'm Atlanta-based, open to hybrid or on-site, and committed to a long-term career in the cleared IT space. I'd welcome a conversation about how I can support ${co}'s mission.</p>`,

    network: `<p>I'm applying for the <strong>${r}</strong> role at ${co}. My USMC Reserve assignment is <strong>MOS 0631 — Network Administrator</strong>, and four years of hands-on Cisco enterprise networking makes me productive in a network operations environment from day one.</p>

<div class="section-label">Network operations proof points</div>
<ul>
  <li><strong>Cisco routing & switching:</strong> BGP, OSPF, EIGRP, GRE, ISAKMP/IPSEC, VRF, and VoIP deployed on production military networks across five joint DoD exercises.</li>
  <li><strong>Field stand-up:</strong> Secure 60-user network on five switches and two routers in three days under operational deadline — on-spec, on-time, zero rework.</li>
  <li><strong>$8M equipment accountability:</strong> Designed and ran the inventory system for 400+ laptops and 100+ comms assets; signed over the entire lot at change of command with zero discrepancy.</li>
  <li><strong>Modern enterprise stack:</strong> Parallel civilian role at SIS keeps me current on Microsoft 365 / Azure / Intune / RingCentral, with ongoing Palo Alto and Cisco Meraki training.</li>
</ul>

<p>I hold an <strong>active DoD Secret Clearance</strong>, am bilingual in Spanish, and am Atlanta-based with remote-work capability. Happy to discuss the role at your convenience.</p>`,

    sysadmin: `<p>I'm applying for the <strong>${r}</strong> position at ${co}. My current role at Surgical Information Systems in Atlanta is a direct analog: full ownership of a 1,000-user hybrid <strong>Microsoft 365 / Azure AD / Intune</strong> environment — provisioning, patching, device telemetry, SharePoint administration, RingCentral telephony, and Tier-2 escalation.</p>

<div class="section-label">Highlights relevant to ${co}</div>
<ul>
  <li><strong>Scale & throughput:</strong> 1,500+ Zendesk tickets resolved; 1,000-user M365 / Azure / Intune tenant managed daily.</li>
  <li><strong>Project leadership:</strong> Led five system-rollout projects and the IT side of a 500-user corporate acquisition migration into the existing tenant.</li>
  <li><strong>Security-aware:</strong> Currently leading the company's Microsoft Copilot rollout with PHI / PII boundary controls in place. Tier-1 security alert triage with escalation to the Security team.</li>
  <li><strong>Networking depth:</strong> USMC Reserve Network Administrator (MOS 0631) — Cisco BGP/OSPF/EIGRP/IPSEC, Active Directory 400-user admin, BMC Remedy — bringing cross-stack depth beyond pure endpoint work.</li>
</ul>

<p>Active DoD Secret Clearance. Atlanta-local, no relocation needed. Bilingual English / Spanish. I'd welcome the chance to discuss the role.</p>`,

    helpdesk: `<p>I'm applying for the <strong>${r}</strong> role at ${co}. I'm an Atlanta-based IT Support Specialist at Surgical Information Systems with a track record of high-volume, accurate Tier-2 service-desk work: <strong>1,500+ Zendesk tickets</strong> resolved across a 1,000-user hybrid Microsoft 365 / Azure / Intune environment, five system-rollout projects led, and the IT lead on a 500-user acquisition migration.</p>

<div class="section-label">Why I'm a strong match</div>
<ul>
  <li><strong>Proven ticket throughput:</strong> Zendesk at SIS (Tier-2, hybrid M365 / Intune) and BMC Remedy at the USMC (50 local + 300 dispersed users). Two different systems, two different environments, same discipline.</li>
  <li><strong>Bilingual English / Spanish:</strong> Meaningful in any service-desk environment that supports a diverse user base.</li>
  <li><strong>PHI / PII experience:</strong> Three years in a healthcare-software environment; currently leading a Copilot rollout under PHI constraints.</li>
  <li><strong>Active DoD Secret Clearance</strong> through USMC Reserve service — adds trustworthiness for regulated or partner environments.</li>
</ul>

<p>I'm Atlanta-local, available for on-site or hybrid schedules, and immediately available. I'd love to talk through the role.</p>`,

    healthcare: `<p>I'm applying for the <strong>${r}</strong> role at ${co}. I'm an Atlanta-based IT Support Specialist at <strong>Surgical Information Systems</strong> — a healthcare software company — where I've spent three years maintaining a 1,000-user hybrid Microsoft 365 / Azure / Intune environment under strict <strong>PHI and PII requirements</strong>.</p>

<div class="section-label">What makes this a natural fit</div>
<ul>
  <li><strong>Healthcare-IT experience:</strong> Three years in a healthcare software environment — 1,500+ Zendesk tickets, five system rollouts, and the IT lead on a 500-user acquisition migration, all under PHI / PII protocols.</li>
  <li><strong>PHI-aware projects:</strong> Currently leading the company's secure Microsoft Copilot rollout, specifically designed to maintain PHI / PII boundaries across the M365 tenant.</li>
  <li><strong>Clinical background:</strong> B.S. in Neuroscience from Georgia State University (2021) — I understand the clinical vocabulary and the stakes of healthcare data.</li>
  <li><strong>Bilingual English / Spanish</strong> — meaningful in a patient-facing or diverse clinical-staff support context.</li>
</ul>

<p>Active DoD Secret Clearance via USMC Reserve (MOS 0631). Atlanta-local, no relocation needed. I'd welcome the chance to support ${co}'s clinical and administrative teams.</p>`,
  };

  return bodies[archetype] || bodies.helpdesk;
}

// ─── HTML Builders ────────────────────────────────────────────
function fontFaceCSS() {
  return `
  @font-face {
    font-family: 'Space Grotesk';
    src: url('${FONT_URL}space-grotesk-latin.woff2') format('woff2');
    font-weight: 300 700; font-style: normal;
  }
  @font-face {
    font-family: 'Space Grotesk';
    src: url('${FONT_URL}space-grotesk-latin-ext.woff2') format('woff2');
    font-weight: 300 700; font-style: normal;
  }
  @font-face {
    font-family: 'DM Sans';
    src: url('${FONT_URL}dm-sans-latin.woff2') format('woff2');
    font-weight: 100 1000; font-style: normal;
  }
  @font-face {
    font-family: 'DM Sans';
    src: url('${FONT_URL}dm-sans-latin-ext.woff2') format('woff2');
    font-weight: 100 1000; font-style: normal;
  }`;
}

function buildResumeHTML(job, arch) {
  const a = ARCHETYPES[arch];
  const expHTML = a.expOrder.map(idx => {
    const e = JOSH.experience[idx];
    const bullets = e.bullets.map(b => `<li>${b}</li>`).join('\n        ');
    return `
    <div class="job avoid-break">
      <div class="job-header">
        <span class="job-company">${e.company}</span>
        <span class="job-period">${e.period}</span>
      </div>
      <div class="job-role">${e.role}${e.location ? ` <span class="job-location">· ${e.location}</span>` : ''}</div>
      <ul>${bullets}</ul>
    </div>`;
  }).join('');

  const competencies = a.competencies.map(c =>
    `<span class="competency-tag">${c}</span>`).join('\n      ');

  const certsHTML = JOSH.certifications.map(c => `
    <div class="cert-item">
      <span class="cert-title">${c.title} <span class="cert-org">· ${c.org}</span></span>
      <span class="cert-year">${c.year}</span>
    </div>`).join('');

  const eduHTML = JOSH.education.map(e => `
    <div class="edu-item">
      <div class="edu-header">
        <span class="edu-title">${e.degree} <span class="edu-org">· ${e.school}, ${e.location}</span></span>
        <span class="edu-year">${e.year}</span>
      </div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${JOSH.name} — ${job.role} at ${job.company}</title>
<style>
  ${fontFaceCSS()}
  * { margin:0; padding:0; box-sizing:border-box; }
  html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body { font-family:'DM Sans',sans-serif; font-size:11px; line-height:1.5; color:#1a1a2e; background:#fff; }
  .page { width:100%; max-width:8.5in; margin:0 auto; }
  .header { margin-bottom:14px; }
  .header h1 { font-family:'Space Grotesk',sans-serif; font-size:24px; font-weight:700; color:#1a1a2e; letter-spacing:-0.02em; margin-bottom:4px; }
  .header-gradient { height:2px; background:linear-gradient(to right,hsl(187,74%,32%),hsl(270,70%,45%)); border-radius:1px; margin-bottom:8px; }
  .contact-row { display:flex; flex-wrap:wrap; gap:4px 14px; font-size:10px; color:#555; }
  .contact-row .sep { color:#ccc; }
  .section { margin-bottom:13px; }
  .section-title { font-family:'Space Grotesk',sans-serif; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:hsl(187,74%,32%); border-bottom:1px solid #e5e5e5; padding-bottom:3px; margin-bottom:7px; }
  .summary-text { font-size:10.5px; line-height:1.6; color:#333; }
  .competencies-grid { display:flex; flex-wrap:wrap; gap:5px; }
  .competency-tag { font-size:9.5px; font-weight:500; color:hsl(187,74%,28%); background:hsl(187,40%,95%); padding:2px 9px; border-radius:3px; border:1px solid hsl(187,40%,88%); }
  .job { margin-bottom:11px; }
  .job-header { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:1px; }
  .job-company { font-family:'Space Grotesk',sans-serif; font-size:11.5px; font-weight:600; color:hsl(270,70%,45%); }
  .job-period { font-size:9.5px; color:#777; white-space:nowrap; }
  .job-role { font-size:10.5px; font-weight:500; color:#444; margin-bottom:4px; }
  .job-location { font-size:10px; color:#888; font-weight:400; }
  .job ul { padding-left:15px; margin-top:3px; }
  .job li { font-size:10px; line-height:1.5; color:#333; margin-bottom:1.5px; }
  .edu-item { margin-bottom:5px; }
  .edu-header { display:flex; justify-content:space-between; align-items:baseline; }
  .edu-title { font-weight:600; font-size:10.5px; color:#333; }
  .edu-org { color:hsl(270,70%,45%); font-weight:500; }
  .edu-year { font-size:9.5px; color:#777; }
  .cert-item { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:3.5px; }
  .cert-title { font-size:10px; font-weight:500; color:#333; }
  .cert-org { color:hsl(270,70%,45%); }
  .cert-year { font-size:9.5px; color:#777; }
  .skill-category { font-weight:600; color:#333; font-size:10px; margin-bottom:2px; }
  .skill-item { font-size:10px; color:#444; margin-bottom:2px; }
  .avoid-break { break-inside:avoid; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <h1>${JOSH.name}</h1>
    <div class="header-gradient"></div>
    <div class="contact-row">
      <span>${JOSH.location}</span><span class="sep">|</span>
      <span>${JOSH.email}</span><span class="sep">|</span>
      <span>${JOSH.phone}</span><span class="sep">|</span>
      <span>${JOSH.clearance}</span><span class="sep">|</span>
      <span>Bilingual English / Spanish</span>
    </div>
  </div>

  <!-- SUMMARY -->
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <div class="summary-text">${a.summary}</div>
  </div>

  <!-- CORE COMPETENCIES -->
  <div class="section">
    <div class="section-title">Core Competencies</div>
    <div class="competencies-grid">${competencies}</div>
  </div>

  <!-- EXPERIENCE -->
  <div class="section">
    <div class="section-title">Work Experience</div>
    ${expHTML}
  </div>

  <!-- EDUCATION -->
  <div class="section avoid-break">
    <div class="section-title">Education</div>
    ${eduHTML}
  </div>

  <!-- CERTIFICATIONS -->
  <div class="section avoid-break">
    <div class="section-title">Certifications &amp; Clearance</div>
    ${certsHTML}
  </div>

  <!-- SKILLS -->
  <div class="section avoid-break">
    <div class="section-title">Skills</div>
    ${a.skills}
  </div>

</div>
</body>
</html>`;
}

function buildCoverLetterHTML(job, arch) {
  const body = coverLetterBody(arch, job.company, job.role);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${JOSH.name} — Cover Letter — ${job.company}</title>
<style>
  ${fontFaceCSS()}
  * { margin:0; padding:0; box-sizing:border-box; }
  html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body { font-family:'DM Sans',sans-serif; font-size:11.5px; line-height:1.65; color:#1a1a2e; background:#fff; }
  .page { width:100%; max-width:8.5in; margin:0 auto; }
  .header { margin-bottom:22px; }
  .header h1 { font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; color:#1a1a2e; letter-spacing:-0.02em; margin-bottom:4px; }
  .header-gradient { height:2px; background:linear-gradient(to right,hsl(187,74%,32%),hsl(270,70%,45%)); border-radius:1px; margin-bottom:8px; }
  .contact-row { display:flex; flex-wrap:wrap; gap:4px 14px; font-size:10px; color:#555; }
  .contact-row .sep { color:#ccc; }
  .date { font-size:10.5px; color:#777; margin-bottom:18px; }
  .addressee { font-size:11.5px; font-weight:500; color:#333; margin-bottom:14px; line-height:1.6; }
  .body p { margin-bottom:11px; font-size:11.5px; line-height:1.7; color:#333; }
  .body p:first-child { color:#1a1a2e; }
  .section-label { font-family:'Space Grotesk',sans-serif; font-size:11.5px; font-weight:600; color:hsl(187,74%,32%); margin-top:14px; margin-bottom:5px; }
  .body ul { padding-left:18px; margin-bottom:11px; }
  .body li { font-size:11px; line-height:1.6; color:#444; margin-bottom:3px; }
  .body li strong { font-weight:600; color:#333; }
  .closing { margin-top:18px; }
  .closing p { font-size:11.5px; color:#333; margin-bottom:3px; }
  .sig-name { font-family:'Space Grotesk',sans-serif; font-size:13px; font-weight:600; color:#1a1a2e; margin-top:28px; }
  .sig-sub { font-size:10px; color:#777; margin-top:2px; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <h1>${JOSH.name}</h1>
    <div class="header-gradient"></div>
    <div class="contact-row">
      <span>${JOSH.location}</span><span class="sep">|</span>
      <span>${JOSH.email}</span><span class="sep">|</span>
      <span>${JOSH.phone}</span><span class="sep">|</span>
      <span>${JOSH.clearance}</span>
    </div>
  </div>

  <!-- DATE -->
  <div class="date">${TODAY}</div>

  <!-- ADDRESSEE -->
  <div class="addressee">
    Hiring Manager<br>
    ${job.company}<br>
    RE: ${job.role}
  </div>

  <!-- BODY -->
  <div class="body">
    ${body}
  </div>

  <!-- CLOSING -->
  <div class="closing">
    <p>Sincerely,</p>
    <div class="sig-name">${JOSH.name}</div>
    <div class="sig-sub">${JOSH.email} · ${JOSH.phone} · ${JOSH.location}</div>
  </div>

</div>
</body>
</html>`;
}

// ─── PDF Render ───────────────────────────────────────────────
async function renderPDF(browser, html, outPath) {
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const buf = await page.pdf({
      format: 'letter',
      printBackground: true,
      margin: { top: '0.6in', right: '0.6in', bottom: '0.6in', left: '0.6in' },
    });
    writeFileSync(outPath, buf);
    return buf.length;
  } finally {
    await page.close();
  }
}

// ─── Slug helper ─────────────────────────────────────────────
function slug(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
    .replace(/-+/g, '-').slice(0, 40);
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('🦀 Josh PDF Generator — Joshua A. Poolos\n');

  // Load scraped jobs
  if (!existsSync(JOBS_PATH)) {
    console.error(`❌ No jobs file at ${JOBS_PATH}\n   Run: node scrape-josh-mega.mjs first`);
    process.exit(1);
  }
  const rawJobs = JSON.parse(readFileSync(JOBS_PATH, 'utf8'));
  console.log(`📂 Loaded ${rawJobs.length} jobs from ${JOBS_PATH}`);

  // Sort by total score desc, Atlanta first, then take top LIMIT
  const jobs = rawJobs
    .filter(j => j.total > 0 || j.score > 0)
    .sort((a, b) => (b.total ?? b.score * 10) - (a.total ?? a.score * 10))
    .slice(0, LIMIT);

  console.log(`🎯 Rendering top ${jobs.length} companies (limit=${LIMIT})\n`);

  // Ensure output dirs exist
  mkdirSync(APPS_DIR, { recursive: true });

  // Launch browser
  const browser = await chromium.launch({ headless: true });
  console.log('🌐 Chromium launched\n');

  const results = [];
  let idx = 1;

  for (const job of jobs) {
    const arch     = job.archetype || 'helpdesk';
    const padded   = String(idx).padStart(2, '0');
    const dirName  = `${padded}-${slug(job.company)}`;
    const dir      = resolve(APPS_DIR, dirName);
    mkdirSync(dir, { recursive: true });

    process.stdout.write(`[${padded}/${jobs.length}] ${job.company} — ${job.role} (${arch}) ... `);

    try {
      const resumeHTML = buildResumeHTML(job, arch);
      const clHTML     = buildCoverLetterHTML(job, arch);

      // Write intermediate HTML (useful for debugging/inspection)
      writeFileSync(resolve(dir, 'resume.html'),       resumeHTML);
      writeFileSync(resolve(dir, 'cover-letter.html'), clHTML);

      // Render PDFs
      const rSize = await renderPDF(browser, resumeHTML, resolve(dir, 'resume.pdf'));
      const cSize = await renderPDF(browser, clHTML,     resolve(dir, 'cover-letter.pdf'));

      results.push({
        rank: idx, company: job.company, role: job.role,
        location: job.location || 'Remote', atsType: job.atsType,
        archetype: arch, url: job.url || '',
        total: job.total ?? (job.score * 10), dir: dirName,
        rKB: Math.round(rSize / 1024), cKB: Math.round(cSize / 1024),
        status: 'ok',
      });
      console.log(`✅ resume(${Math.round(rSize/1024)}KB) + CL(${Math.round(cSize/1024)}KB)`);
    } catch (err) {
      console.log(`❌ ${err.message}`);
      results.push({ rank: idx, company: job.company, role: job.role, status: 'error', error: err.message });
    }

    idx++;
  }

  await browser.close();
  console.log('\n✅ Chromium closed\n');

  // ─── Write TOP-10-REVIEW.md ───────────────────────────────
  const top10 = results.filter(r => r.status === 'ok').slice(0, TOP);
  const top10Path = resolve(OUT_ROOT, 'TOP-10-REVIEW.md');

  const top10MD = `# 🎯 Joshua Poolos — Top ${TOP} Manual Review
**Generated:** ${TODAY}
**Full pipeline:** \`FULL-PIPELINE.md\` · **All apps:** \`applications/\`

> Review each entry below. When satisfied, say **"go"** and submissions begin.
> Each folder below contains: \`resume.pdf\` + \`cover-letter.pdf\` (print-ready).

---

${top10.map((j, i) => `## ${i + 1}. ${j.company}
**Role:** ${j.role}
**Location:** ${j.location}
**ATS:** \`${j.atsType}\`
**Archetype:** ${ARCHETYPES[j.archetype]?.label ?? j.archetype}
**Score:** ${j.total} · **Apply URL:** ${j.url || '*(check careers page)*'}
**Folder:** \`output/joshua-poolos/applications/${j.dir}/\`

| Document | File |
|----------|------|
| Résumé | \`${j.dir}/resume.pdf\` (${j.rKB} KB) |
| Cover Letter | \`${j.dir}/cover-letter.pdf\` (${j.cKB} KB) |

`).join('\n---\n\n')}

---
*Prepared by Virgil — Josh Mega Scrape Wave 1 — ${TODAY}*
`;
  writeFileSync(top10Path, top10MD);
  console.log(`📋 TOP-10-REVIEW.md → ${top10Path}`);

  // ─── Write FULL-PIPELINE.md ───────────────────────────────
  const fullPath = resolve(OUT_ROOT, 'FULL-PIPELINE.md');
  const ok = results.filter(r => r.status === 'ok');
  const fullMD = `# Joshua Poolos — Full Application Pipeline (Wave 1)
**Generated:** ${TODAY} · **Total:** ${ok.length} companies

| # | Company | Role | Location | ATS | Archetype | Score | Folder |
|---|---------|------|----------|-----|-----------|-------|--------|
${ok.map(j =>
  `| ${j.rank} | **${j.company}** | ${j.role} | ${j.location} | \`${j.atsType}\` | ${ARCHETYPES[j.archetype]?.label ?? j.archetype} | ${j.total} | \`${j.dir}\` |`
).join('\n')}

## Submission Status
- ⏳ All ${ok.length} entries are **pending approval** — no applications submitted.
- After review of TOP-10-REVIEW.md, say **"go"** to begin.
`;
  writeFileSync(fullPath, fullMD);
  console.log(`📋 FULL-PIPELINE.md → ${fullPath}`);

  // ─── Summary ─────────────────────────────────────────────
  const errCount = results.filter(r => r.status === 'error').length;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`✅ PDFs rendered:    ${ok.length}`);
  console.log(`❌ Errors:           ${errCount}`);
  console.log(`📁 Output:           ${APPS_DIR}`);
  console.log(`📋 Review now:       ${top10Path}`);
  console.log(`${'═'.repeat(60)}\n`);
  console.log(`🎯 Top ${TOP} ready for your review. Open TOP-10-REVIEW.md and say "go" when approved.`);
}

main().catch(err => { console.error('❌ Fatal:', err); process.exit(1); });
