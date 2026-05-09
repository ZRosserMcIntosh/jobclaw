import Link from 'next/link';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    desc: 'Try the magic. No card required.',
    features: ['Résumé parsing', '10 hand-matched jobs', 'Download tailored PDFs', 'Email receipts'],
    cta: 'Start free',
    href: '/login',
    highlight: false,
  },
  {
    name: 'Starter',
    price: '$19',
    cadence: '/month',
    desc: 'For active job seekers.',
    features: ['25 auto-applies / month', 'GPT-4o-mini tailoring', 'Daily new matches', 'Application dashboard'],
    cta: 'Choose Starter',
    href: '/login?plan=starter',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$49',
    cadence: '/month',
    desc: 'Most popular — best quality writing.',
    features: ['100 auto-applies / month', 'Claude Sonnet 4.5 tailoring', 'Priority queue', 'Interview-prep AI coach'],
    cta: 'Choose Pro',
    href: '/login?plan=pro',
    highlight: true,
  },
  {
    name: 'Power',
    price: '$99',
    cadence: '/month',
    desc: 'For aggressive switchers.',
    features: ['300 auto-applies / month', 'All Pro features', 'Recruiter outreach drafts', 'Salary-negotiation AI'],
    cta: 'Choose Power',
    href: '/login?plan=power',
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20">
      <header className="text-center">
        <h1 className="font-display text-5xl font-bold">Simple, ridiculous value.</h1>
        <p className="mx-auto mt-4 max-w-xl text-white/70">
          Cancel anytime. Pay-per-application also available at <strong>$3/app</strong> with no subscription.
        </p>
      </header>

      <section className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col rounded-2xl border p-7 ${
              p.highlight
                ? 'border-primary bg-gradient-to-b from-primary/15 to-transparent shadow-2xl shadow-primary/20'
                : 'border-white/10 bg-surface/60'
            }`}
          >
            {p.highlight && (
              <span className="mb-3 inline-block w-fit rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                Most popular
              </span>
            )}
            <h3 className="font-display text-xl font-bold">{p.name}</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold">{p.price}</span>
              <span className="text-sm text-white/60">{p.cadence}</span>
            </div>
            <p className="mt-2 text-sm text-white/70">{p.desc}</p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  <span className="text-white/80">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href={p.href}
              className={`mt-6 rounded-full py-2.5 text-center text-sm font-semibold ${
                p.highlight ? 'bg-primary text-white' : 'border border-white/20 text-white hover:bg-white/5'
              }`}
            >
              {p.cta}
            </Link>
          </div>
        ))}
      </section>

      <p className="mt-12 text-center text-sm text-white/50">
        Need to hire for a team? <Link href="/contact" className="text-accent">Enterprise / coach plan →</Link>
      </p>
    </main>
  );
}
