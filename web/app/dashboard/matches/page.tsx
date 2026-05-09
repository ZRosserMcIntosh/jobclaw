import { redirect }     from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link             from 'next/link';

const ATS_LABELS: Record<string, string> = {
  greenhouse:  '🌱 Greenhouse',
  ashby:       '✳️  Ashby',
  lever:       '🎯 Lever',
  workday:     '💼 Workday',
  icims:       '📋 iCIMS',
  taleo:       '🗂  Taleo',
  cornerstone: '🏛  Cornerstone',
  manual:      '🔗 Direct link',
};

const ATS_AUTO = new Set(['greenhouse', 'ashby', 'lever']);

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { resume: resumeId } = await searchParams;

  // Fetch recommendations for this user (latest first)
  const query = supabase
    .from('recommendations')
    .select(`
      id, score, ai_rationale,
      jobs ( company, role, location, remote, ats_type, url )
    `)
    .eq('user_id', user.id)
    .order('score', { ascending: false })
    .limit(10);

  if (resumeId) query.eq('resume_id', resumeId);

  const { data: recs, error } = await query;

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  const isPaid = profile?.plan && profile.plan !== 'free';

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Your Top Matches</h1>
          <p className="mt-1 text-sm text-white/60">
            {recs?.length ?? 0} job{recs?.length !== 1 ? 's' : ''} matched to your résumé
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-white/50 hover:text-white">
          ← Dashboard
        </Link>
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-red-900/30 p-4 text-sm text-red-400">
          Error loading matches: {error.message}
        </p>
      )}

      {(!recs || recs.length === 0) && !error && (
        <div className="mt-16 text-center text-white/50">
          <p className="text-5xl">🔍</p>
          <p className="mt-4 text-lg font-semibold">No matches yet</p>
          <p className="mt-2 text-sm">
            <Link href="/dashboard" className="text-accent underline">Upload your résumé</Link> to generate matches.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-4">
        {recs?.map((rec, i) => {
          /* eslint-disable @typescript-eslint/no-explicit-any */
          const job     = rec.jobs as any;
          const atsAuto = ATS_AUTO.has(job?.ats_type);
          const score   = Math.round(rec.score * 100);

          return (
            <div
              key={rec.id}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface/60 p-6 md:flex-row md:items-start md:justify-between"
            >
              {/* Left */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm font-bold text-white/40">#{i + 1}</span>
                  <h3 className="font-display text-lg font-bold">{job?.company}</h3>
                  {job?.remote && (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
                      Remote
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm font-medium text-white/80">{job?.role}</p>
                <p className="text-xs text-white/50">{job?.location || 'Location not specified'}</p>

                {/* Score bar */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/60">{score}% match</span>
                </div>

                <p className="mt-2 text-xs text-white/50 italic">{rec.ai_rationale}</p>
              </div>

              {/* Right */}
              <div className="flex flex-col items-end gap-3">
                <span className="text-xs text-white/40">
                  {ATS_LABELS[job?.ats_type] ?? job?.ats_type}
                </span>

                {isPaid ? (
                  atsAuto ? (
                    <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20 hover:scale-[1.02] transition">
                      Auto-apply ✨
                    </button>
                  ) : (
                    <div className="text-right">
                      <a
                        href={job?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-accent/20 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/30 transition"
                      >
                        Apply manually →
                      </a>
                      <p className="mt-1 text-[10px] text-white/40">Tailored PDF attached to your email</p>
                    </div>
                  )
                ) : (
                  <div className="text-right">
                    <a
                      href={job?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/5 transition"
                    >
                      View job →
                    </a>
                    <p className="mt-1 text-[10px] text-white/40">
                      <Link href="/pricing" className="text-accent">Upgrade</Link> to auto-apply
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upgrade CTA at bottom for free users */}
      {!isPaid && recs && recs.length > 0 && (
        <div className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
          <p className="font-display text-lg font-bold">Like what you see?</p>
          <p className="mt-1 text-sm text-white/70">
            Virgil can auto-submit all {recs.length} of these, send you a receipt with the tailored PDFs, and find 100 more tomorrow.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white"
          >
            Upgrade from $19/mo →
          </Link>
        </div>
      )}
    </main>
  );
}
