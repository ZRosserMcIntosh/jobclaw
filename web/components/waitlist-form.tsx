'use client';

import { useState } from 'react';

/**
 * Email capture for capabilities that do not exist yet.
 *
 * The success copy deliberately promises only what we can keep: that we
 * will email when it works. No date, no "early access", no implication
 * that a queue position exists.
 */
export function WaitlistForm({
  interest = 'auto_apply',
  source,
  cta = 'Notify me',
}: {
  interest?: 'auto_apply' | 'recruiter_outreach' | 'interview_prep';
  source?: string;
  cta?: string;
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setError(null);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, interest, source }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Try again.');
        setState('idle');
        return;
      }
      setState('done');
    } catch {
      setError('Network error. Try again.');
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <p
        role="status"
        className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent"
      >
        Got it. We&apos;ll email <strong>{email}</strong> when this works — and not before.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor={`waitlist-${interest}`} className="sr-only">
        Email address
      </label>
      <input
        id={`waitlist-${interest}`}
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full flex-1 rounded-lg border border-white/15 bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
      />
      <button
        type="submit"
        disabled={state === 'sending'}
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg transition hover:brightness-110 disabled:opacity-50"
      >
        {state === 'sending' ? 'Saving…' : cta}
      </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
