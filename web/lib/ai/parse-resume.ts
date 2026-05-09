/**
 * lib/ai/parse-resume.ts
 *
 * Accepts raw text extracted from a PDF/DOCX and returns a structured
 * JSON profile using GPT-4o-mini (cheap, fast, accurate for extraction).
 */

import OpenAI from 'openai';

let _openai: OpenAI | null = null;
function getClient() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export interface ParsedProfile {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  target_roles: string[];
  target_locations: string[];
  remote_preference: 'remote' | 'hybrid' | 'onsite' | 'any';
  summary: string;
  skills: string[];
  experience: Array<{
    company: string;
    title: string;
    start: string;
    end: string;
    bullets: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    year: string;
  }>;
  certifications: string[];
  clearance?: string;
}

export async function parseResume(
  rawText: string,
): Promise<{ profile: ParsedProfile; tokensIn: number; tokensOut: number }> {
  const systemPrompt = `You are an expert résumé parser. Extract structured data from the résumé text and return ONLY valid JSON matching this TypeScript interface — no markdown, no explanation:

{
  full_name: string,
  email: string,
  phone: string,
  location: string,
  target_roles: string[],        // infer from experience + title patterns
  target_locations: string[],    // cities / "Remote" mentioned or implicit
  remote_preference: "remote"|"hybrid"|"onsite"|"any",
  summary: string,
  skills: string[],
  experience: [{ company, title, start, end, bullets: string[] }],
  education: [{ institution, degree, field, year }],
  certifications: string[],
  clearance: string              // security clearance if mentioned, else ""
}`;

  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: rawText.slice(0, 12000) }, // ~3K tokens max
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
  });

  const profile = JSON.parse(response.choices[0].message.content ?? '{}') as ParsedProfile;
  return {
    profile,
    tokensIn:  response.usage?.prompt_tokens     ?? 0,
    tokensOut: response.usage?.completion_tokens ?? 0,
  };
}
