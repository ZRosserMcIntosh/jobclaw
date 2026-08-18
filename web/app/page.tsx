import Link from 'next/link';
import { WaitlistForm } from '@/components/waitlist-form';

/**
 * Every claim on this page maps to code that runs today:
 *   "reads your résumé"  -> /api/parse-resume
 *   "ranks openings"     -> /api/match-jobs
 *   "tailored PDFs"      -> /api/generate-pdf
 *
 * Auto-apply has no implementation, so it is presented as unbuilt rather
 * than sold. If you build it, move it up into WHAT_WORKS — do not add a
 * claim here that no route backs.
 */

const WHAT_WORKS = [
  {
    t: 'Read your résumé properly',
    d: 'PDF, DOCX, or plain text. It pulls out roles, dates, skills and seniority — so the writing that follows is grounded in your actual history, not a template with your name dropped in.',
  },
  {
    t: 'Rank the openings worth your time',
    d: 'Scores live postings against your experience and says why each one fits. The point is a short list you trust, not another feed to scroll.',
  },
  {
    t: 'Write a real résumé and cover letter per role',
    d: 'One tailored pair per job, rewritten against that posting and typeset as a clean PDF. It should read like you wrote it on your best day — because it is built from what you actually did.',
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="text-center">
        <p className="mb-5 inline-block rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs uppercase tracking-widest text-accent">
          A Railgun product
        </p>
        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
          Stop sending<br />
          <span className="text-accent">the same résumé</span><br />
          to every job.
        </h1>
        <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-white/70">
          JobClaw reads your résumé once, finds the openings that genuinely fit,
          and writes a tailored résumé and cover letter for each one. You read
          them, you decide, you send.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-full bg-accent px-7 py-3 font-semibold text-bg shadow-lg shadow-accent/20 transition hover:brightness-110"
          >
            Try it free →
          </Link>
          <Link
            href="/pricing"
            className="rounded-full border border-white/20 px-7 py-3 font-semibold text-white/90 transition hover:bg-white/5"
          >
            See pricing
          </Link>
        </div>
        <p className="mt-5 text-sm text-white/40">
          Free while in beta. No card, no subscription to cancel.
        </p>
      </section>

      {/* ── What it does ─────────────────────────────────────── */}
      <section className="mt-32">
        <h2 className="font-display text-3xl font-bold">What it does today</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {WHAT_WORKS.map((s) => (
            <div
              key={s.t}
              className="rounded-2xl border border-white/10 bg-surface/60 p-7 backdrop-blur"
            >
              <h3 className="text-lg font-semibold">{s.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/65">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Not built yet ────────────────────────────────────── */}
      <section className="mt-24 rounded-3xl border border-white/10 bg-surface/40 p-9">
        <p className="text-xs uppercase tracking-widest text-white/40">Not built yet</p>
        <h2 className="mt-3 font-display text-3xl font-bold">
          Submitting the application for you
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-white/70">
          Plenty of tools promise to fire off hundreds of applications while you
          sleep. We haven&apos;t built that, so we&apos;re not going to charge you
          for it. It is the hardest part of this product to do without spending
          your name on badly-filled forms, and we would rather ship it late than
          ship it broken.
        </p>
        <p className="mt-3 max-w-2xl leading-relaxed text-white/70">
          Leave your email and we&apos;ll tell you the day it actually works.
        </p>
        <div className="mt-7 max-w-md">
          <WaitlistForm interest="auto_apply" source="home" />
        </div>
      </section>

      {/* ── Trust ────────────────────────────────────────────── */}
      <section className="mt-24 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 p-7">
          <h3 className="font-semibold">Your job hunt stays yours</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Your résumé and the roles you look at are not training data and are
            not sold. Delete your account and they go with it.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 p-7">
          <h3 className="font-semibold">One Railgun account</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            The same sign-in works across every Railgun product. No separate
            password to forget for this one.
          </p>
        </div>
      </section>

      <footer className="mt-24 border-t border-white/10 pt-6 text-center text-sm text-white/40">
        © {new Date().getFullYear()} JobClaw · A Railgun product
      </footer>
    </main>
  );
}
