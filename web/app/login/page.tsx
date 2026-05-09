'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setL]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setL(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setL(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border border-white/10 bg-surface/60 p-8 backdrop-blur">
        <h1 className="font-display text-3xl font-bold">Sign in to Virgil</h1>
        <p className="mt-2 text-sm text-white/60">10 free job matches, no card required.</p>

        <button
          onClick={signInWithGoogle}
          className="mt-6 w-full rounded-lg border border-white/20 py-2.5 font-medium hover:bg-white/5"
        >
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-white/40">
          <div className="h-px flex-1 bg-white/10" /> OR <div className="h-px flex-1 bg-white/10" />
        </div>

        {sent ? (
          <p className="rounded-lg bg-accent/10 p-4 text-sm text-accent">
            ✓ Check <strong>{email}</strong> for a magic sign-in link.
          </p>
        ) : (
          <form onSubmit={signInWithEmail} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-bg px-4 py-2.5 outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Email me a magic link'}
            </button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
