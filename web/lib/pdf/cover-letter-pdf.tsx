/**
 * lib/pdf/cover-letter-pdf.tsx
 *
 * Cover letter renderer — adopts the same style persona as the résumé
 * for visual brand consistency, but with a different layout suited
 * to prose. Still varies on header, spacing, accent treatment.
 */

import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { ResumeStyle } from './styles';
import type { ParsedProfile } from '../ai/parse-resume';

interface CoverLetterData {
  profile: ParsedProfile;
  s: ResumeStyle;
  company: string;
  role: string;
  body: string; // 3-4 paragraph AI-generated body text
  hiringManagerName?: string;
}

function makeCLStyles(s: ResumeStyle) {
  return StyleSheet.create({
    page: {
      fontFamily: s.font,
      fontSize: s.spacing === 'compact' ? 10 : 10.5,
      color: s.textHex,
      backgroundColor: '#ffffff',
      paddingHorizontal: s.pagePaddingH + 8, // slightly wider margins for letters
      paddingVertical: s.pagePaddingV + 8,
    },
    headerBar: {
      backgroundColor: s.accentHex,
      marginHorizontal: -(s.pagePaddingH + 8),
      marginTop: -(s.pagePaddingV + 8),
      paddingHorizontal: s.pagePaddingH + 8,
      paddingVertical: 18,
      marginBottom: 28,
    },
    headerStripe: {
      borderLeftWidth: 5,
      borderLeftColor: s.accentHex,
      paddingLeft: 14,
      marginBottom: 24,
    },
    headerCentered: {
      alignItems: 'center',
      marginBottom: 24,
    },
    headerCard: {
      backgroundColor: s.accentHex + '14',
      borderWidth: 1,
      borderColor: s.accentHex + '40',
      borderRadius: 4,
      padding: 14,
      marginBottom: 24,
    },
    nameBar:      { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
    nameNormal:   { fontSize: 18, fontWeight: 'bold', color: s.accentHex },
    nameCentered: { fontSize: 18, fontWeight: 'bold', color: s.accentHex, textAlign: 'center' },
    contactBar:     { fontSize: 8.5, color: '#ffffffbb', marginTop: 3, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    contactNormal:  { fontSize: 8.5, color: s.mutedHex,  marginTop: 3, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    contactCenter:  { fontSize: 8.5, color: s.mutedHex,  marginTop: 3, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10 },
    date: { fontSize: 9.5, color: s.mutedHex, marginBottom: 18 },
    salutation: { fontSize: 10.5, fontWeight: 'bold', marginBottom: 10 },
    body: { lineHeight: 1.55, marginBottom: 12 },
    closing: { marginTop: 20, lineHeight: 1.6 },
    signature: { fontWeight: 'bold', marginTop: 10, color: s.accentHex },
  });
}

export function CoverLetterPDF({ profile, s, company, role, body, hiringManagerName }: CoverLetterData) {
  const style = makeCLStyles(s);

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const salutation = hiringManagerName
    ? `Dear ${hiringManagerName},`
    : `Dear ${company} Hiring Team,`;

  // Split body into paragraphs
  const paragraphs = body.split(/\n{2,}/).filter(Boolean);

  const contactItems = [profile.email, profile.phone, profile.location].filter(Boolean);

  const headerStyle = s.headerStyle === 'bar'      ? style.headerBar
    : s.headerStyle === 'centered' ? style.headerCentered
    : s.headerStyle === 'card'     ? style.headerCard
    : style.headerStripe;

  const nameStyle = s.headerStyle === 'bar' ? style.nameBar
    : s.headerStyle === 'centered' ? style.nameCentered
    : style.nameNormal;

  const contactStyle = s.headerStyle === 'bar' ? style.contactBar
    : s.headerStyle === 'centered' ? style.contactCenter
    : style.contactNormal;

  return (
    <Document
      title={`${profile.full_name} — Cover Letter for ${company}`}
      author={profile.full_name}
      creator="Virgil Job Agent"
    >
      <Page size="LETTER" style={style.page}>
        {/* Header */}
        <View style={headerStyle}>
          <Text style={nameStyle}>{profile.full_name}</Text>
          <View style={contactStyle}>
            {contactItems.map((item, i) => <Text key={i}>{item}</Text>)}
          </View>
        </View>

        {/* Date */}
        <Text style={style.date}>{today}</Text>

        {/* Salutation */}
        <Text style={style.salutation}>{salutation}</Text>

        {/* Body paragraphs */}
        {paragraphs.map((p, i) => (
          <Text key={i} style={style.body}>{p.trim()}</Text>
        ))}

        {/* Closing */}
        <View style={style.closing}>
          <Text>Sincerely,</Text>
          <Text style={style.signature}>{profile.full_name}</Text>
        </View>
      </Page>
    </Document>
  );
}
