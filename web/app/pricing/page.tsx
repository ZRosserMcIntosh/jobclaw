import Link from 'next/link';
import { WaitlistForm } from '@/components/waitlist-form';

/**
 * There is no billing integration in this app — no Stripe, no checkout,
 * no webhook. Until there is, this page must not present a "Choose Pro"
 * button, because pressing it cannot do what it says.
 *
 * The planned tiers are shown as plans, clearly unpriced-yet, because
 * people deciding whether to invest their job hunt in a beta deserve to
 * know what it will cost later. When billing lands, the planned column
 * gets real CTAs and the beta banner comes down.
 */

const PLANNED = [
  {
    name: 'Starter',
    indicative: '~$19/mo',
    desc: 'For an active search.',
    features: ['Auto-apply, once it works', 'Daily new matches', 'Application tracking'],
  },
  {
    name: 'Pro',
    indicative: '~$49/mo',
    desc: 'Best writing quality.',
    features: ['Everything in Starter', 'Frontier-model tailoring', 'Interview prep'],
  },
  {
    name: 'Power',
    indicative: '~$99/mo',
    desc: 'For an aggressive switch.',
    features: ['Everything in Pro', 'Recruiter outreach drafts', 'Salary negotiation help'],
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <header className="text-center">
        <h1 className="font-display text-5xl font-bold tracking-tight">
          Free while it&apos;s a beta.
        </h1>
        <p className="mx-auto mt-5 max-w-xl leading-relaxed text-white/70">
          JobClaw can&apos;t take your money yet — there is no checkout, by
          choice. Everything that works today is free, and we&apos;d rather earn
          the subscription than pre-sell it.
        </p>
      </header>

      {/* ── The only real plan ───────────────────────────────── */}
      <section className="mt-14">
        <div className="mx-auto max-w-md rounded-3xl border border-accent/30 bg-accent/5 p-9 text-center">
          <p className="text-xs uppercase tracking-widest text-accent">Available now</p>
          <h2 className="mt-3 font-display text-4xl font-bold">Beta</h2>
          <p className="mt-1 text-3xl font-bold text-accent">$0</p>
          <ul className="mt-7 space-y-2.5 text-left text-sm text-white/75">
            {[
              'Résumé parsing',
              'Ranked job matches with reasoning',
              'Tailored résumé + cover letter PDFs',
              'Unlimited downloads',
            ].map((f) => (
              <li key={f} className="flex gap-2.5">
                <span aria-hidden="true" className="text-accent">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/login"
            className="mt-8 block rounded-full bg-accent py-3 font-semibold text-bg transition hover:brightness-110"
          >
            Start free →
          </Link>
          <p className="mt-4 text-xs text-white/45">
            No card. If we ever start charging, we&apos;ll ask first.
          </p>
        </div>
      </section>

      {/* ── Planned, not purchasable ─────────────────────────── */}
      <section className="mt-24">
        <h2 className="font-display text-2xl font-bold">What we plan to charge for</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
          None of this is buyable today and the prices are indicative, not a
          commitment. It&apos;s here so you can judge whether JobClaw is worth
          building a job hunt around.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {PLANNED.map((p) => (
            <div
              key={p.name}
              className="flex flex-col rounded-2xl border border-white/10 bg-surface/40 p-7"
            >
              <h3 className="font-display text-xl font-bold text-white/85">{p.name}</h3>
              <p className="mt-1 text-sm text-white/45">{p.indicative}</p>
              <p className="mt-3 text-sm text-white/65">{p.desc}</p>
              <ul className="mt-5 space-y-2 text-sm text-white/60">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <span aria-hidden="true" className="text-white/25">
                      •
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-lg border border-white/10 py-2 text-center text-xs uppercase tracking-widest text-white/35">
                Not yet available
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Waitlist ─────────────────────────────────────────── */}
      <section className="mt-20 rounded-3xl border border-white/10 bg-surface/40 p-9">
        <h2 className="font-display text-2xl font-bold">Tell us when it&apos;s ready</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65">
          We&apos;ll email you once paid plans exist — and nothing else.
        </p>
        <div className="mt-6 max-w-md">
          <WaitlistForm interest="auto_apply" source="pricing" cta="Keep me posted" />
        </div>
      </section>

      <footer className="mt-20 text-center text-sm text-white/40">
        <Link href="/" className="hover:text-white/70">
          ← Back to JobClaw
        </Link>
      </footer>
    </main>
  );
}
