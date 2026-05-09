/**
 * lib/pdf/resume-pdf.tsx
 *
 * React-PDF resume document component.
 * Renders completely differently based on the style object —
 * layout, fonts, colors, spacing, section headers, bullets,
 * sidebar vs single-column, date alignment, divider style, etc.
 */

import React from 'react';
import {
  Document, Page, View, Text, Link,
  StyleSheet,
} from '@react-pdf/renderer';
import type { ResumeStyle } from './styles';
import type { ParsedProfile } from '../ai/parse-resume';

// ─── Helper: build stylesheet from style token ────────────────
function makeStyles(s: ResumeStyle) {
  const titleTransform = s.sectionTitle === 'caps-track' ? 'uppercase' : 'none';

  return StyleSheet.create({
    page: {
      fontFamily: s.font,
      fontSize: s.spacing === 'compact' ? 9 : s.spacing === 'airy' ? 10.5 : 10,
      color: s.textHex,
      backgroundColor: '#ffffff',
      paddingHorizontal: s.pagePaddingH,
      paddingVertical: s.pagePaddingV,
    },

    // ── Header layouts ─────────────────────────────────────────
    headerBar: {
      backgroundColor: s.accentHex,
      marginHorizontal: -s.pagePaddingH,
      marginTop: -s.pagePaddingV,
      paddingHorizontal: s.pagePaddingH,
      paddingVertical: 20,
      marginBottom: 14,
    },
    headerStripe: {
      borderLeftWidth: 5,
      borderLeftColor: s.accentHex,
      paddingLeft: 14,
      marginBottom: 14,
    },
    headerCentered: {
      alignItems: 'center',
      marginBottom: 14,
    },
    headerCard: {
      backgroundColor: s.accentHex + '14', // 8% alpha
      borderWidth: 1,
      borderColor: s.accentHex + '40',
      borderRadius: 4,
      padding: 14,
      marginBottom: 14,
    },

    // ── Name / contact ─────────────────────────────────────────
    nameBar: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#ffffff',
      letterSpacing: 0.3,
    },
    nameStripe: {
      fontSize: 22,
      fontWeight: 'bold',
      color: s.accentHex,
      letterSpacing: 0.3,
    },
    nameCentered: {
      fontSize: 22,
      fontWeight: 'bold',
      color: s.accentHex,
      letterSpacing: 0.3,
      textAlign: 'center',
    },
    nameCard: {
      fontSize: 22,
      fontWeight: 'bold',
      color: s.accentHex,
      letterSpacing: 0.3,
    },
    contactBar: {
      fontSize: 8.5,
      color: '#ffffffbb',
      marginTop: 4,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    contactNormal: {
      fontSize: 8.5,
      color: s.mutedHex,
      marginTop: 4,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    contactCentered: {
      fontSize: 8.5,
      color: s.mutedHex,
      marginTop: 4,
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 10,
    },

    // ── Body layout ────────────────────────────────────────────
    body: {
      flexDirection: s.layout === 'sidebar' ? 'row' : 'column',
      gap: s.layout === 'sidebar' ? 16 : 0,
    },
    sidebar: {
      width: '30%',
    },
    mainCol: {
      flex: 1,
    },

    // ── Section title ──────────────────────────────────────────
    sectionTitleView: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 5,
      marginTop: s.sectionGap,
    },
    sectionTitleText: {
      fontSize: s.sectionTitle === 'caps-track' ? 8 : 10,
      fontWeight: 'bold',
      color: s.sectionTitle === 'bold-dot' ? s.textHex : s.accentHex,
      textTransform: titleTransform as 'uppercase' | 'none',
      letterSpacing: s.sectionTitle === 'caps-track' ? 1.5 : 0,
    },
    dividerLine: {
      flex: 1,
      marginLeft: 8,
      borderBottomWidth: s.divider === 'thick' ? 1.5 : 0.5,
      borderBottomColor: s.divider === 'none' ? 'transparent' : s.accentHex + '60',
      borderBottomStyle: s.divider === 'dotted' ? 'dashed' : 'solid',
    },
    sectionTitleDot: {
      fontSize: 10,
      fontWeight: 'bold',
      color: s.accentHex,
      marginRight: 6,
    },

    // ── Experience ─────────────────────────────────────────────
    expEntry: {
      marginBottom: s.lineGap + 3,
    },
    expRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    expTitle: {
      fontWeight: 'bold',
      fontSize: s.spacing === 'compact' ? 9 : 10,
    },
    expCompany: {
      color: s.accentHex,
      fontWeight: 'bold',
    },
    expDate: {
      fontSize: 8.5,
      color: s.mutedHex,
      fontStyle: 'italic',
    },
    bullet: {
      flexDirection: 'row',
      marginTop: s.lineGap,
      paddingLeft: 10,
    },
    bulletChar: {
      color: s.accentHex,
      marginRight: 5,
      fontSize: 8,
      marginTop: 1,
    },
    bulletText: {
      flex: 1,
      lineHeight: 1.35,
    },

    // ── Skills ─────────────────────────────────────────────────
    skillPill: {
      backgroundColor: s.accentHex + '18',
      borderWidth: 0.5,
      borderColor: s.accentHex + '50',
      borderRadius: 3,
      paddingHorizontal: 5,
      paddingVertical: 2,
      marginRight: 4,
      marginBottom: 4,
    },
    skillPillText: {
      fontSize: 8,
      color: s.accentHex,
    },
    skillsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    skillsComma: {
      fontSize: s.spacing === 'compact' ? 8.5 : 9,
      color: s.textHex,
      lineHeight: 1.4,
    },
    skillsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    skillsGridItem: {
      width: '50%',
      fontSize: 8.5,
      marginBottom: 2,
    },

    // ── Education / certs ──────────────────────────────────────
    eduEntry: {
      marginBottom: s.lineGap + 2,
    },
    certEntry: {
      fontSize: 8.5,
      marginBottom: 2,
      color: s.textHex,
    },

    // ── Summary ────────────────────────────────────────────────
    summary: {
      lineHeight: 1.4,
      color: s.textHex,
      marginBottom: 2,
    },

    // ── General ───────────────────────────────────────────────
    muted: { color: s.mutedHex, fontSize: 8.5 },
    bold:  { fontWeight: 'bold' },
    small: { fontSize: 8 },
  });
}

// ─── Sub-components ───────────────────────────────────────────

function SectionTitle({ label, style, s }: { label: string; style: ReturnType<typeof makeStyles>; s: ResumeStyle }) {
  if (s.sectionTitle === 'bold-dot') {
    return (
      <View style={style.sectionTitleView}>
        <Text style={style.sectionTitleDot}>◆</Text>
        <Text style={style.sectionTitleText}>{label}</Text>
      </View>
    );
  }
  return (
    <View style={style.sectionTitleView}>
      <Text style={style.sectionTitleText}>
        {s.sectionTitle === 'caps-track' ? label.toUpperCase() : label}
        {s.sectionTitle === 'title-underline' ? '' : ''}
      </Text>
      <View style={style.dividerLine} />
    </View>
  );
}

function SkillsSection({ skills, style, s }: { skills: string[]; style: ReturnType<typeof makeStyles>; s: ResumeStyle }) {
  if (s.skills === 'pills') {
    return (
      <View style={style.skillsWrap}>
        {skills.map((sk, i) => (
          <View key={i} style={style.skillPill}>
            <Text style={style.skillPillText}>{sk}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (s.skills === 'grid') {
    return (
      <View style={style.skillsGrid}>
        {skills.map((sk, i) => (
          <Text key={i} style={style.skillsGridItem}>
            {s.bullet} {sk}
          </Text>
        ))}
      </View>
    );
  }
  // comma
  return <Text style={style.skillsComma}>{skills.join(' · ')}</Text>;
}

function BulletItem({ text, style, s }: { text: string; style: ReturnType<typeof makeStyles>; s: ResumeStyle }) {
  return (
    <View style={style.bullet}>
      <Text style={style.bulletChar}>{s.bullet}</Text>
      <Text style={style.bulletText}>{text}</Text>
    </View>
  );
}

// ─── Date display helper ──────────────────────────────────────
function DateLabel({ start, end, style, s }: {
  start: string; end: string;
  style: ReturnType<typeof makeStyles>; s: ResumeStyle;
}) {
  const label = `${start} – ${end || 'Present'}`;
  if (s.dateDisplay === 'parenthetical') {
    return <Text style={style.expDate}> ({label})</Text>;
  }
  return <Text style={style.expDate}>{label}</Text>;
}

// ─── Header renderer ─────────────────────────────────────────
function Header({ profile, style, s }: {
  profile: ParsedProfile;
  style: ReturnType<typeof makeStyles>;
  s: ResumeStyle;
}) {
  const contactItems = [
    profile.email,
    profile.phone,
    profile.location,
    profile.clearance ? `Clearance: ${profile.clearance}` : null,
  ].filter(Boolean);

  const contactStyle = s.headerStyle === 'bar' ? style.contactBar
    : s.headerStyle === 'centered' ? style.contactCentered
    : style.contactNormal;

  const nameStyle = s.headerStyle === 'bar' ? style.nameBar
    : s.headerStyle === 'centered' ? style.nameCentered
    : s.headerStyle === 'card' ? style.nameCard
    : style.nameStripe;

  const wrapStyle = s.headerStyle === 'bar' ? style.headerBar
    : s.headerStyle === 'stripe' ? style.headerStripe
    : s.headerStyle === 'centered' ? style.headerCentered
    : style.headerCard;

  return (
    <View style={wrapStyle}>
      <Text style={nameStyle}>{profile.full_name}</Text>
      <View style={contactStyle}>
        {contactItems.map((item, i) => (
          <Text key={i}>{item}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── Main document ────────────────────────────────────────────
export function ResumePDF({
  profile,
  s,
  targetRole,
  targetCompany,
}: {
  profile: ParsedProfile;
  s: ResumeStyle;
  targetRole?: string;
  targetCompany?: string;
}) {
  const style = makeStyles(s);

  const isSidebar = s.layout === 'sidebar';

  // Main content (experience + education)
  const mainContent = (
    <>
      {/* Summary */}
      {profile.summary && (
        <View>
          <SectionTitle label="Summary" style={style} s={s} />
          <Text style={style.summary}>{profile.summary}</Text>
        </View>
      )}

      {/* Experience */}
      <View>
        <SectionTitle label="Experience" style={style} s={s} />
        {profile.experience.map((exp, i) => (
          <View key={i} style={style.expEntry} wrap={false}>
            <View style={style.expRow}>
              <View style={{ flex: 1 }}>
                <Text style={style.expTitle}>{exp.title}</Text>
                <Text style={style.expCompany}>{exp.company}</Text>
              </View>
              {s.dateDisplay !== 'parenthetical' && (
                <DateLabel start={exp.start} end={exp.end} style={style} s={s} />
              )}
            </View>
            {s.dateDisplay === 'parenthetical' && (
              <Text style={style.expDate}>{exp.start} – {exp.end || 'Present'}</Text>
            )}
            {exp.bullets.slice(0, 4).map((b, j) => (
              <BulletItem key={j} text={b} style={style} s={s} />
            ))}
          </View>
        ))}
      </View>

      {/* Education */}
      <View>
        <SectionTitle label="Education" style={style} s={s} />
        {profile.education.map((edu, i) => (
          <View key={i} style={style.eduEntry}>
            <View style={style.expRow}>
              <Text style={style.bold}>{edu.degree} in {edu.field}</Text>
              {edu.year && <Text style={style.muted}>{edu.year}</Text>}
            </View>
            <Text style={style.muted}>{edu.institution}</Text>
          </View>
        ))}
      </View>
    </>
  );

  // Sidebar content (skills + certs)
  const sidebarContent = (
    <>
      {/* Skills */}
      {profile.skills.length > 0 && (
        <View>
          <SectionTitle label="Skills" style={style} s={s} />
          <SkillsSection skills={profile.skills} style={style} s={s} />
        </View>
      )}

      {/* Certifications */}
      {profile.certifications.length > 0 && (
        <View>
          <SectionTitle label="Certifications" style={style} s={s} />
          {profile.certifications.map((c, i) => (
            <Text key={i} style={style.certEntry}>{s.bullet} {c}</Text>
          ))}
        </View>
      )}
    </>
  );

  return (
    <Document
      title={`${profile.full_name} — Résumé${targetCompany ? ` for ${targetCompany}` : ''}`}
      author={profile.full_name}
      subject={targetRole ?? 'Résumé'}
      creator="Virgil Job Agent"
    >
      <Page size="LETTER" style={style.page}>
        <Header profile={profile} style={style} s={s} />

        {isSidebar ? (
          <View style={style.body}>
            <View style={style.sidebar}>{sidebarContent}</View>
            <View style={style.mainCol}>{mainContent}</View>
          </View>
        ) : (
          <View style={style.body}>
            {mainContent}
            {sidebarContent}
          </View>
        )}
      </Page>
    </Document>
  );
}
