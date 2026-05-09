import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      {/* Hero */}
      <section className="text-center">
        <p className="mb-4 inline-block rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-widest text-accent">
          AI résumé agent · powered by Claude + GPT
        </p>
        <h1 className="font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl">
          Apply to <span className="text-accent">100 jobs</span><br />
          while you sleep.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
          Upload your résumé. Virgil scans 600+ company boards, picks the 10 best
          matches free, then tailors a unique résumé + cover letter per role and
          auto-submits the application for you.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/login"
            className="rounded-full bg-primary px-7 py-3 font-semibold text-white shadow-lg shadow-primary/30 transition hover:scale-[1.03]"
          >
            Get 10 matches free →
          </Link>
          <Link
            href="/pricing"
            className="rounded-full border border-white/20 px-7 py-3 font-semibold text-white/90 hover:bg-white/5"
          >
            See pricing
          </Link>
        </div>
      </section>

      {/* Steps */}
      <section className="mt-28 grid gap-6 md:grid-cols-3">
        {[
          { n: '01', t: 'Upload résumé',     d: 'PDF, DOCX, or ODT. AI extracts skills, roles, location preferences in 8 seconds.' },
          { n: '02', t: 'Get 10 matches',    d: 'Vector-search + LLM rerank across ~50K daily job postings. Free forever.' },
          { n: '03', t: 'Apply with one click', d: 'Auto-submits to Greenhouse / Ashby / Lever. Sends tailored PDF + step-by-step link for Workday and others.' },
        ].map((s) => (
          <div key={s.n} className="rounded-2xl border border-white/10 bg-surface/60 p-7 backdrop-blur">
            <div className="font-display text-3xl font-bold text-accent">{s.n}</div>
            <h3 className="mt-2 text-xl font-semibold">{s.t}</h3>
            <p className="mt-2 text-sm text-white/70">{s.d}</p>
          </div>
        ))}
      </section>

      {/* Pricing teaser */}
      <section className="mt-28 rounded-3xl border border-white/10 bg-surface/40 p-10 text-center">
        <h2 className="font-display text-3xl font-bold">Plans from $19/mo</h2>
        <p className="mt-3 text-white/70">25–300 auto-applies a month. Cancel anytime.</p>
        <Link
          href="/pricing"
          className="mt-6 inline-block rounded-full bg-accent px-6 py-2.5 font-semibold text-bg"
        >
          See full pricing →
        </Link>
      </section>

      <footer className="mt-24 border-t border-white/10 pt-6 text-center text-sm text-white/40">
        © {new Date().getFullYear()} Virgil · Built on Jobclaw
      </footer>
    </main>
  );
}
