/**
 * lib/pdf/styles.ts
 *
 * 12 distinct resume style personas.
 * Every user gets one persona deterministically (hash of user_id),
 * but each JOB within that batch gets micro-variations so no two
 * documents are identical — even from the same user.
 *
 * Axes of variation (10 independent dimensions):
 *  1. Font family pair (heading / body)
 *  2. Accent color
 *  3. Layout (single-column vs sidebar)
 *  4. Header style (bar / stripe / centered / card)
 *  5. Section title treatment (caps+track / title+underline / bold+dot)
 *  6. Bullet character
 *  7. Spacing scale (compact / normal / airy)
 *  8. Date display (right-flush / parenthetical / gray-inline)
 *  9. Divider style (thin / thick / dotted / none)
 * 10. Skills display (pills / comma / grid / bullets)
 */

// ─── Google Fonts we register at runtime ─────────────────────
export const FONT_SOURCES = {
  Inter:        { normal: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff',
                  bold:   'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff' },
  Lato:         { normal: 'https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wXiWtFCc.woff2',
                  bold:   'https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh6UVSwiPGQ3q5d0.woff2' },
  Roboto:       { normal: 'https://fonts.gstatic.com/s/roboto/v32/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2',
                  bold:   'https://fonts.gstatic.com/s/roboto/v32/KFOlCnqEu92Fr1MmWUlfBBc4AMP6lQ.woff2' },
  Montserrat:   { normal: 'https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aXo.woff2',
                  bold:   'https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCu173w5aXo.woff2' },
  Poppins:      { normal: 'https://fonts.gstatic.com/s/poppins/v21/pxiEyp8kv8JHgFVrJJfecg.woff2',
                  bold:   'https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLCz7Z1xlFd2JQEk.woff2' },
  'Open Sans':  { normal: 'https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVc.woff2',
                  bold:   'https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZzN4gaVc.woff2' },
};

// ─── Type definitions ─────────────────────────────────────────
export type FontKey   = keyof typeof FONT_SOURCES;
export type Layout    = 'single' | 'sidebar';
export type HeaderStyle = 'bar' | 'stripe' | 'centered' | 'card';
export type SectionTitle = 'caps-track' | 'title-underline' | 'bold-dot';
export type SpacingScale = 'compact' | 'normal' | 'airy';
export type DividerStyle = 'thin' | 'thick' | 'dotted' | 'none';
export type SkillsDisplay = 'pills' | 'comma' | 'grid';
export type DateDisplay = 'right-flush' | 'parenthetical' | 'gray-inline';

export interface ResumeStyle {
  persona:      string;
  font:         FontKey;
  accentHex:    string;       // e.g. '#1e40af'
  textHex:      string;       // main body text
  mutedHex:     string;       // dates, labels
  layout:       Layout;
  headerStyle:  HeaderStyle;
  sectionTitle: SectionTitle;
  bullet:       string;
  spacing:      SpacingScale;
  divider:      DividerStyle;
  skills:       SkillsDisplay;
  dateDisplay:  DateDisplay;
  // Computed sizing
  pagePaddingH: number;
  pagePaddingV: number;
  lineGap:      number;
  sectionGap:   number;
}

// ─── 12 base personas ─────────────────────────────────────────
const BASE_PERSONAS: Omit<ResumeStyle, 'pagePaddingH' | 'pagePaddingV' | 'lineGap' | 'sectionGap'>[] = [
  { persona:'Slate',    font:'Inter',        accentHex:'#334155', textHex:'#1e293b', mutedHex:'#64748b', layout:'single',  headerStyle:'bar',      sectionTitle:'caps-track',    bullet:'•', spacing:'normal',  divider:'thin',   skills:'pills',  dateDisplay:'right-flush'    },
  { persona:'Forest',   font:'Lato',         accentHex:'#166534', textHex:'#14532d', mutedHex:'#4b7c59', layout:'single',  headerStyle:'stripe',   sectionTitle:'title-underline',bullet:'▸', spacing:'airy',    divider:'none',   skills:'comma',  dateDisplay:'gray-inline'    },
  { persona:'Cardinal', font:'Roboto',       accentHex:'#991b1b', textHex:'#1c1917', mutedHex:'#78716c', layout:'sidebar', headerStyle:'bar',      sectionTitle:'bold-dot',      bullet:'–', spacing:'compact', divider:'thick',  skills:'grid',   dateDisplay:'parenthetical'  },
  { persona:'Navy',     font:'Montserrat',   accentHex:'#1e3a5f', textHex:'#0f172a', mutedHex:'#475569', layout:'sidebar', headerStyle:'card',     sectionTitle:'caps-track',    bullet:'◆', spacing:'normal',  divider:'dotted', skills:'pills',  dateDisplay:'right-flush'    },
  { persona:'Sage',     font:'Open Sans',    accentHex:'#0f766e', textHex:'#134e4a', mutedHex:'#5eaaa4', layout:'single',  headerStyle:'centered', sectionTitle:'title-underline',bullet:'›', spacing:'airy',    divider:'thin',   skills:'comma',  dateDisplay:'gray-inline'    },
  { persona:'Onyx',     font:'Poppins',      accentHex:'#18181b', textHex:'#09090b', mutedHex:'#71717a', layout:'single',  headerStyle:'bar',      sectionTitle:'caps-track',    bullet:'•', spacing:'compact', divider:'none',   skills:'grid',   dateDisplay:'right-flush'    },
  { persona:'Copper',   font:'Lato',         accentHex:'#92400e', textHex:'#1c1917', mutedHex:'#a78255', layout:'single',  headerStyle:'stripe',   sectionTitle:'bold-dot',      bullet:'▸', spacing:'normal',  divider:'thin',   skills:'pills',  dateDisplay:'parenthetical'  },
  { persona:'Indigo',   font:'Montserrat',   accentHex:'#3730a3', textHex:'#1e1b4b', mutedHex:'#818cf8', layout:'sidebar', headerStyle:'bar',      sectionTitle:'title-underline',bullet:'•', spacing:'airy',    divider:'thick',  skills:'pills',  dateDisplay:'gray-inline'    },
  { persona:'Stone',    font:'Open Sans',    accentHex:'#44403c', textHex:'#1c1917', mutedHex:'#a8a29e', layout:'single',  headerStyle:'centered', sectionTitle:'caps-track',    bullet:'–', spacing:'compact', divider:'thin',   skills:'comma',  dateDisplay:'right-flush'    },
  { persona:'Cobalt',   font:'Inter',        accentHex:'#1d4ed8', textHex:'#0f172a', mutedHex:'#60a5fa', layout:'single',  headerStyle:'card',     sectionTitle:'bold-dot',      bullet:'◆', spacing:'normal',  divider:'dotted', skills:'grid',   dateDisplay:'parenthetical'  },
  { persona:'Plum',     font:'Poppins',      accentHex:'#6b21a8', textHex:'#1e1b4b', mutedHex:'#a78bfa', layout:'sidebar', headerStyle:'centered', sectionTitle:'title-underline',bullet:'›', spacing:'airy',    divider:'none',   skills:'pills',  dateDisplay:'gray-inline'    },
  { persona:'Crimson',  font:'Roboto',       accentHex:'#be123c', textHex:'#1c1917', mutedHex:'#9f4d64', layout:'single',  headerStyle:'stripe',   sectionTitle:'caps-track',    bullet:'•', spacing:'normal',  divider:'thick',  skills:'comma',  dateDisplay:'right-flush'    },
];

// ─── Spacing lookup ───────────────────────────────────────────
const SPACING_VALS: Record<SpacingScale, { pagePaddingH: number; pagePaddingV: number; lineGap: number; sectionGap: number }> = {
  compact: { pagePaddingH: 40, pagePaddingV: 36, lineGap: 2,  sectionGap: 8  },
  normal:  { pagePaddingH: 48, pagePaddingV: 44, lineGap: 3,  sectionGap: 12 },
  airy:    { pagePaddingH: 56, pagePaddingV: 52, lineGap: 5,  sectionGap: 16 },
};

// ─── Fast deterministic hash ──────────────────────────────────
function djb2(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return h >>> 0; // unsigned 32-bit
}

/**
 * getStyle(userId, jobIndex)
 *
 * userId  → deterministically picks 1 of 12 personas (same persona
 *           for every job in this user's batch, preserving brand
 *           consistency while differing from other users).
 *
 * jobIndex → applies micro-variations WITHIN the persona so each
 *            document is unique (bullet, spacing nudge, divider alt).
 */
export function getStyle(userId: string, jobIndex = 0): ResumeStyle {
  const baseIdx  = djb2(userId) % BASE_PERSONAS.length;
  const base     = BASE_PERSONAS[baseIdx];
  const sv       = SPACING_VALS[base.spacing];

  // Per-job micro-variations (won't change the overall visual identity)
  const altBullets  = ['•', '▸', '–', '›', '◆'];
  const altDividers: DividerStyle[] = [base.divider, base.divider, 'thin', 'none'];
  const bullet  = jobIndex === 0 ? base.bullet : altBullets[(djb2(userId + jobIndex) % altBullets.length)];
  const divider = altDividers[(djb2(userId + 'div' + jobIndex) % altDividers.length)];

  return { ...base, ...sv, bullet, divider };
}
