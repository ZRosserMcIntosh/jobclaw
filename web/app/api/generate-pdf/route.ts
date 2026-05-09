/**
 * POST /api/generate-pdf
 *
 * Body: {
 *   resume_id: string,
 *   job_id: string,          // from recommendations
 *   doc_type: 'resume' | 'cover_letter' | 'both'
 * }
 *
 * Returns: { resume_url?, cover_letter_url? }
 * Both are signed Supabase Storage URLs, valid 1 hour.
 *
 * Caches by (user_id, job_id, profile_hash) — never regenerates
 * the same document twice.
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer }            from '@react-pdf/renderer';
import React, { type ReactElement }  from 'react';
import type { DocumentProps }        from '@react-pdf/renderer';
import { createClient }              from '@/lib/supabase/server';
import { getStyle }                  from '@/lib/pdf/styles';
import { registerFonts }             from '@/lib/pdf/register-fonts';
import { ResumePDF }                 from '@/lib/pdf/resume-pdf';
import { CoverLetterPDF }            from '@/lib/pdf/cover-letter-pdf';
import { writeCoverLetter }          from '@/lib/ai/write-cover-letter';
import type { ParsedProfile }        from '@/lib/ai/parse-resume';

export const maxDuration = 60;
export const runtime     = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    registerFonts();

    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resume_id, job_id, doc_type = 'both' } = await req.json() as {
      resume_id: string;
      job_id: string;
      doc_type?: 'resume' | 'cover_letter' | 'both';
    };

    if (!resume_id || !job_id) {
      return NextResponse.json({ error: 'resume_id and job_id required' }, { status: 400 });
    }

    // ── Fetch resume + job in parallel ────────────────────────────────
    const [resumeResult, jobResult] = await Promise.all([
      supabase.from('resumes').select('parsed_profile').eq('id', resume_id).eq('user_id', user.id).single(),
      supabase.from('jobs').select('company, role, description, ats_type, url').eq('id', job_id).single(),
    ]);

    if (resumeResult.error || !resumeResult.data) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }
    if (jobResult.error || !jobResult.data) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const profile = resumeResult.data.parsed_profile as ParsedProfile;
    const job     = jobResult.data;

    // ── Check cache first ──────────────────────────────────────────────
    // Find existing application for this user+job
    const { data: existingApp } = await supabase
      .from('applications')
      .select('id')
      .eq('user_id', user.id)
      .eq('job_id', job_id)
      .eq('resume_id', resume_id)
      .maybeSingle();

    let appId = existingApp?.id as string | undefined;

    // Check for cached tailored docs
    if (appId) {
      const { data: cachedDocs } = await supabase
        .from('tailored_documents')
        .select('doc_type, storage_path')
        .eq('application_id', appId)
        .eq('user_id', user.id);

      if (cachedDocs && cachedDocs.length > 0) {
        const result: Record<string, string> = {};
        for (const doc of cachedDocs) {
          const { data: signed } = await supabase.storage
            .from('tailored-docs')
            .createSignedUrl(doc.storage_path, 3600);
          if (signed) result[`${doc.doc_type}_url`] = signed.signedUrl;
        }
        if (Object.keys(result).length > 0) return NextResponse.json({ ...result, cached: true });
      }
    }

    // ── Create application row if not exists ──────────────────────────
    if (!appId) {
      const { data: newApp } = await supabase
        .from('applications')
        .insert({
          user_id:   user.id,
          job_id,
          resume_id,
          status:    'queued',
          ats_type:  job.ats_type,
        })
        .select('id')
        .single();
      appId = newApp?.id;
    }

    // ── Get deterministic style for this user ─────────────────────────
    // Job index = count of their prior applications (variety within batch)
    const { count: jobIdx } = await supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const s = getStyle(user.id, jobIdx ?? 0);

    const result: Record<string, string> = {};
    let totalIn = 0, totalOut = 0;

    // ── Generate résumé PDF ────────────────────────────────────────────
    if (doc_type === 'resume' || doc_type === 'both') {
      const pdfBuffer = await renderToBuffer(
        React.createElement(ResumePDF, {
          profile,
          s,
          targetRole:    job.role,
          targetCompany: job.company,
        }) as ReactElement<DocumentProps>
      );

      const storagePath = `${user.id}/${appId}/resume.pdf`;
      await supabase.storage.from('tailored-docs').upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf', upsert: true,
      });

      if (appId) {
        await supabase.from('tailored_documents').upsert({
          application_id: appId,
          user_id:        user.id,
          doc_type:       'resume',
          storage_path:   storagePath,
          ai_model:       'react-pdf',
        }, { onConflict: 'application_id,doc_type' } as Record<string, unknown>);
      }

      const { data: signed } = await supabase.storage
        .from('tailored-docs')
        .createSignedUrl(storagePath, 3600);
      if (signed) result.resume_url = signed.signedUrl;
    }

    // ── Generate cover letter PDF ──────────────────────────────────────
    if (doc_type === 'cover_letter' || doc_type === 'both') {
      const { body, tokensIn, tokensOut } = await writeCoverLetter({
        profile,
        company:         job.company,
        role:            job.role,
        jobDescription:  job.description ?? '',
      });
      totalIn  += tokensIn;
      totalOut += tokensOut;

      const clBuffer = await renderToBuffer(
        React.createElement(CoverLetterPDF, {
          profile,
          s,
          company:  job.company,
          role:     job.role,
          body,
        }) as ReactElement<DocumentProps>
      );

      const clPath = `${user.id}/${appId}/cover-letter.pdf`;
      await supabase.storage.from('tailored-docs').upload(clPath, clBuffer, {
        contentType: 'application/pdf', upsert: true,
      });

      if (appId) {
        await supabase.from('tailored_documents').upsert({
          application_id: appId,
          user_id:        user.id,
          doc_type:       'cover_letter',
          storage_path:   clPath,
          ai_model:       'gpt-4o-mini',
          tokens_in:      totalIn,
          tokens_out:     totalOut,
        }, { onConflict: 'application_id,doc_type' } as Record<string, unknown>);
      }

      // Log usage
      if (totalIn > 0) {
        await supabase.from('usage_events').insert({
          user_id:    user.id,
          event_type: 'cover_letter',
          ai_model:   'gpt-4o-mini',
          tokens_in:  totalIn,
          tokens_out: totalOut,
          cost_cents: (totalIn * 0.00015 + totalOut * 0.0006) / 10,
          meta:       { job_id, company: job.company, role: job.role },
        });
      }

      const { data: signed } = await supabase.storage
        .from('tailored-docs')
        .createSignedUrl(clPath, 3600);
      if (signed) result.cover_letter_url = signed.signedUrl;
    }

    return NextResponse.json({ ...result, persona: s.persona, cached: false });

  } catch (err) {
    console.error('/api/generate-pdf error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
