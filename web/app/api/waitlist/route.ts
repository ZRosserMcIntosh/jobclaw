/**
 * POST /api/waitlist  { email, interest?, source? }
 *
 * Records interest in a capability JobClaw has not built yet.
 *
 * Always answers {ok:true} for any syntactically valid address, whether or
 * not the row was new. A "you're already on the list" response would turn
 * this open endpoint into an oracle for whether a given person is job
 * hunting — which, for this product, is exactly the fact a user would least
 * want leaking to their employer.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INTERESTS = ['auto_apply', 'recruiter_outreach', 'interview_prep'] as const;
type Interest = (typeof INTERESTS)[number];

// Deliberately loose: this is a shape check to reject typos and obvious
// junk, not an attempt to decide which addresses are deliverable.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { email, interest, source } = (body ?? {}) as Record<string, unknown>;

  if (typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const pick: Interest =
    typeof interest === 'string' && (INTERESTS as readonly string[]).includes(interest)
      ? (interest as Interest)
      : 'auto_apply';

  // Publishable key, not the service role key. The waitlist table grants
  // anon an insert-only policy (see supabase/waitlist.sql), so appending a
  // row needs no elevated privilege — and a key that can bypass RLS on
  // every table has no business being in this deployment to append an
  // email address.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    // Fail loudly in logs, quietly to the user: a misconfigured deploy
    // should page us, not tell a visitor about our env vars.
    console.error('[waitlist] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing');
    return NextResponse.json({ error: 'Waitlist is temporarily unavailable.' }, { status: 503 });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { error } = await supabase
    .from('waitlist')
    .upsert(
      {
        email: email.trim().toLowerCase(),
        interest: pick,
        source: typeof source === 'string' ? source.slice(0, 64) : null,
      },
      { onConflict: 'email,interest', ignoreDuplicates: true },
    );

  if (error) {
    console.error('[waitlist] insert failed:', error.message);
    return NextResponse.json({ error: 'Could not save that. Try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
