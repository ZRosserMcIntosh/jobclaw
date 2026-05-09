/**
 * lib/ai/match-jobs.ts
 *
 * Given a user's parsed profile, fetch active jobs from Supabase and
 * return the top N scored matches using keyword + role heuristics.
 * (Phase 2 upgrade: swap for pgvector cosine search once jobs have embeddings.)
 */

import { createClient } from '@supabase/supabase-js';
import type { ParsedProfile } from './parse-resume';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

export interface JobMatch {
  job_id:        string;
  company:       string;
  role:          string;
  location:      string;
  remote:        boolean;
  ats_type:      string;
  url:           string;
  score:         number;
  ai_rationale:  string;
}

function scoreJob(job: Record<string, unknown>, profile: ParsedProfile): number {
  let score = 0;
  const roleLower = (job.role as string).toLowerCase();
  const locLower  = ((job.location as string) ?? '').toLowerCase();

  // Role keyword match
  for (const tr of profile.target_roles) {
    const words = tr.toLowerCase().split(/\s+/);
    const hits  = words.filter(w => roleLower.includes(w)).length;
    score += (hits / words.length) * 0.5;
  }

  // Skill match (check job description if available)
  const desc = ((job.description as string) ?? '').toLowerCase();
  const skillHits = profile.skills.filter(s => desc.includes(s.toLowerCase())).length;
  score += Math.min(skillHits / Math.max(profile.skills.length, 1), 1) * 0.3;

  // Location match
  for (const tl of profile.target_locations) {
    if (tl.toLowerCase() === 'remote' && (job.remote || locLower.includes('remote'))) {
      score += 0.15; break;
    }
    if (locLower.includes(tl.toLowerCase())) { score += 0.15; break; }
  }
  if (profile.remote_preference === 'remote' && (job.remote || locLower.includes('remote'))) {
    score += 0.05;
  }

  return Math.min(score, 1);
}

function rationale(job: Record<string, unknown>, profile: ParsedProfile, score: number): string {
  const pct = Math.round(score * 100);
  if (pct >= 70) return `Strong match (${pct}%) — role aligns closely with your target titles and skill set.`;
  if (pct >= 45) return `Good match (${pct}%) — several overlapping skills and compatible location.`;
  return `Partial match (${pct}%) — company is actively hiring in your space.`;
}

export async function matchJobs(
  profile: ParsedProfile,
  limit = 10,
): Promise<JobMatch[]> {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, company, role, location, remote, ats_type, url, description')
    .eq('active', true)
    .limit(2000);

  if (error) throw new Error(`Supabase error: ${error.message}`);
  if (!jobs?.length) return [];

  const scored = (jobs as Record<string, unknown>[]).map(j => ({
    job_id:       j.id as string,
    company:      j.company as string,
    role:         j.role as string,
    location:     (j.location as string) ?? '',
    remote:       (j.remote as boolean) ?? false,
    ats_type:     j.ats_type as string,
    url:          j.url as string,
    score:        scoreJob(j, profile),
    ai_rationale: '',
  }));

  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return top.map(m => ({
    ...m,
    ai_rationale: rationale(
      jobs.find(j => j.id === m.job_id) as Record<string, unknown>,
      profile,
      m.score,
    ),
  }));
}
