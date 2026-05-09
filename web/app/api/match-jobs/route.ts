/**
 * POST /api/match-jobs
 *
 * Body: { resume_id: string }
 *
 * Fetches the parsed profile for that resume, runs matching against
 * the jobs table, writes recommendations to DB, returns top 10.
 *
 * If the jobs table is empty (pre-seed), falls back to a curated
 * hardcoded sample set so the UI is never blank.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@/lib/supabase/server';
import { matchJobs }                 from '@/lib/ai/match-jobs';
import type { ParsedProfile }        from '@/lib/ai/parse-resume';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resume_id } = await req.json() as { resume_id: string };
    if (!resume_id) {
      return NextResponse.json({ error: 'resume_id required' }, { status: 400 });
    }

    // ── Fetch parsed profile ───────────────────────────────────────────
    const { data: resume, error: rErr } = await supabase
      .from('resumes')
      .select('parsed_profile')
      .eq('id', resume_id)
      .eq('user_id', user.id)
      .single();

    if (rErr || !resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    const profile = resume.parsed_profile as ParsedProfile;

    // ── Match ──────────────────────────────────────────────────────────
    const matches = await matchJobs(profile, 10);

    // ── Save recommendations ───────────────────────────────────────────
    if (matches.length > 0) {
      const rows = matches.map(m => ({
        user_id:       user.id,
        job_id:        m.job_id,
        resume_id,
        score:         m.score,
        ai_rationale:  m.ai_rationale,
      }));
      // upsert — safe to re-run
      await supabase.from('recommendations').upsert(rows, { onConflict: 'user_id,job_id' });
    }

    return NextResponse.json({ matches, total: matches.length });

  } catch (err) {
    console.error('/api/match-jobs error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
