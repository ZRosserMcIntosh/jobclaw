import { redirect }        from 'next/navigation';
import { createClient }    from '@/lib/supabase/server';
import ResumeUploader      from '@/components/resume-uploader';
import Link                from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, applications_used, applications_limit')
    .eq('id', user.id)
    .single();

  const plan  = profile?.plan ?? 'free';
  const used  = profile?.applications_used ?? 0;
  const limit = profile?.applications_limit ?? 0;

  const { count: resumeCount } = await supabase
    .from('resumes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-white/60">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
          {plan} plan
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        {[
          { label: 'Résumés uploaded',     value: resumeCount ?? 0 },
          { label: 'Applications sent',    value: used },
          { label: 'Remaining this month', value: plan === 'free' ? '10 free' : `${limit - used}` },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-surface/50 px-5 py-4">
            <div className="font-display text-3xl font-bold text-white">{s.value}</div>
            <div className="mt-1 text-xs text-white/50">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-semibold">
          {(resumeCount ?? 0) > 0 ? 'Upload a new résumé' : 'Step 1 — Upload your résumé'}
        </h2>
        <ResumeUploader userId={user.id} />
      </section>

      {(resumeCount ?? 0) > 0 && (
        <section className="mt-8">
          <Link
            href="/dashboard/matches"
            className="inline-flex items-center gap-2 text-sm text-accent underline-offset-4 hover:underline"
          >
            View your job matches →
          </Link>
        </section>
      )}

      {plan === 'free' && (
        <aside className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h3 className="font-display text-lg font-bold">Ready to auto-apply?</h3>
          <p className="mt-1 text-sm text-white/70">
            Free tier gives you 10 matched jobs + tailored PDFs to download.
            Upgrade to Starter ($19/mo) and Virgil submits the applications for you.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white"
          >
            See plans →
          </Link>
        </aside>
      )}
    </main>
  );
}
