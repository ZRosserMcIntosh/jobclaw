/**
 * lib/ai/write-cover-letter.ts
 *
 * Generates a tailored 3-paragraph cover letter body using GPT-4o-mini.
 * The prompt is tuned to produce varied, natural-sounding prose —
 * never formulaic or easily recognizable as AI / template-generated.
 */

import OpenAI from 'openai';
import type { ParsedProfile } from './parse-resume';

let _openai: OpenAI | null = null;
function getClient() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const OPENERS = [
  'I am applying for',
  'I am excited to apply for',
  'I would like to be considered for',
  'Please consider my application for',
  'I am writing to express my interest in',
];

const TONES = [
  'confident and direct',
  'enthusiastic and specific',
  'professional and measured',
  'engaging and conversational',
  'crisp and achievement-focused',
];

// Deterministic pseudo-random choice by hash of company name
function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

export async function writeCoverLetter({
  profile,
  company,
  role,
  jobDescription,
}: {
  profile: ParsedProfile;
  company: string;
  role: string;
  jobDescription?: string;
}): Promise<{ body: string; tokensIn: number; tokensOut: number }> {

  const opener = pick(OPENERS, company + role);
  const tone   = pick(TONES, role + company);

  const topSkills = profile.skills.slice(0, 6).join(', ');
  const recentExp = profile.experience[0];

  const systemPrompt = `You write highly personalized, ${tone} cover letters for job applications. Each letter sounds like a real human wrote it — never template-like. Vary sentence length, use active voice, and make specific references to the candidate's actual experience.

Write exactly 3 paragraphs. No headers, no salutation, no sign-off — only the body paragraphs. Each paragraph 60-90 words. Do not start two paragraphs with the same word.

Paragraph 1: "${opener} the ${role} role at ${company}." Then immediately connect the candidate's strongest relevant experience to the company's need.
Paragraph 2: Give one specific, quantified achievement or story from their background that directly supports this role.
Paragraph 3: Express genuine enthusiasm for ${company} specifically. Close by requesting an interview.`;

  const userPrompt = `Candidate: ${profile.full_name}
Most recent role: ${recentExp?.title ?? 'N/A'} at ${recentExp?.company ?? 'N/A'}
Top skills: ${topSkills}
Summary: ${profile.summary?.slice(0, 300) ?? ''}
${jobDescription ? `\nJob description excerpt:\n${jobDescription.slice(0, 600)}` : ''}`;

  const resp = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    temperature: 0.85, // slightly creative for natural language variety
    max_tokens: 400,
  });

  return {
    body:       resp.choices[0].message.content?.trim() ?? '',
    tokensIn:   resp.usage?.prompt_tokens     ?? 0,
    tokensOut:  resp.usage?.completion_tokens ?? 0,
  };
}
