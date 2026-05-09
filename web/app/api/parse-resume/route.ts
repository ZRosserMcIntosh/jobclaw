/**
 * POST /api/parse-resume
 *
 * Accepts a multipart form with a `file` field (PDF / DOCX / ODT).
 * 1. Extracts text
 * 2. Calls OpenAI to parse into structured profile
 * 3. Uploads file to Supabase Storage (resumes bucket)
 * 4. Inserts row into resumes table
 * 5. Returns { resume_id, profile, matches: [] } — matches filled by /api/match-jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@/lib/supabase/server';
import { extractText }               from '@/lib/extract-text';
import { parseResume }               from '@/lib/ai/parse-resume';

export const maxDuration = 60; // Vercel Pro allows 60s; hobby = 10s
export const runtime     = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // ── Auth ───────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── File upload ────────────────────────────────────────────────────
    const form     = await req.formData();
    const file     = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = ['application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.oasis.opendocument.text',
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|doc|odt)$/i)) {
      return NextResponse.json({ error: 'Unsupported file type. Use PDF, DOCX, or ODT.' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (10MB max)' }, { status: 400 });
    }

    // ── Extract text ───────────────────────────────────────────────────
    const arrayBuf = await file.arrayBuffer();
    const buffer   = Buffer.from(arrayBuf);
    const rawText  = await extractText(buffer, file.name);

    if (rawText.trim().length < 50) {
      return NextResponse.json({ error: 'Could not extract text from file. Try a different format.' }, { status: 422 });
    }

    // ── AI parse ───────────────────────────────────────────────────────
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not configured on server.' }, { status: 500 });
    }
    const { profile, tokensIn, tokensOut } = await parseResume(rawText);

    // ── Upload to Supabase Storage ─────────────────────────────────────
    const storagePath = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { error: storageErr } = await supabase.storage
      .from('resumes')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (storageErr) {
      console.error('Storage upload failed:', storageErr);
      // Non-fatal — still continue with DB row
    }

    // ── Insert resume row ──────────────────────────────────────────────
    const { data: resume, error: dbErr } = await supabase
      .from('resumes')
      .insert({
        user_id:        user.id,
        storage_path:   storagePath,
        filename:       file.name,
        parsed_profile: profile,
      })
      .select('id')
      .single();

    if (dbErr) throw new Error(`DB insert failed: ${dbErr.message}`);

    // ── Log usage ──────────────────────────────────────────────────────
    await supabase.from('usage_events').insert({
      user_id:    user.id,
      event_type: 'parse_resume',
      ai_model:   'gpt-4o-mini',
      tokens_in:  tokensIn,
      tokens_out: tokensOut,
      cost_cents: (tokensIn * 0.00015 + tokensOut * 0.0006) / 10, // $0.15/$0.60 per 1M
      meta:       { resume_id: resume.id, filename: file.name },
    });

    return NextResponse.json({ resume_id: resume.id, profile });

  } catch (err) {
    console.error('/api/parse-resume error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
