'use client';

import { useState, useCallback } from 'react';
import { useRouter }             from 'next/navigation';

interface Props { userId: string; }

export default function ResumeUploader({ userId }: Props) {
  const router = useRouter();
  const [stage,    setStage]    = useState<'idle' | 'uploading' | 'parsing' | 'matching' | 'done' | 'error'>('idle');
  const [message,  setMessage]  = useState('');
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  async function processFile(file: File) {
    if (!file) return;

    // ── Stage 1: upload + parse ──────────────────────────────────────
    setStage('uploading');
    setMessage('Uploading your résumé…');
    setProgress(10);

    const form = new FormData();
    form.append('file', file);

    const parseRes = await fetch('/api/parse-resume', { method: 'POST', body: form });
    const parseData = await parseRes.json();

    if (!parseRes.ok) {
      setStage('error');
      setMessage(parseData.error ?? 'Failed to parse résumé.');
      return;
    }

    setStage('parsing');
    setMessage('AI is reading your résumé…');
    setProgress(50);

    // ── Stage 2: match ────────────────────────────────────────────────
    setStage('matching');
    setMessage('Finding your top 10 matches…');
    setProgress(75);

    const matchRes  = await fetch('/api/match-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_id: parseData.resume_id }),
    });
    const matchData = await matchRes.json();

    if (!matchRes.ok) {
      setStage('error');
      setMessage(matchData.error ?? 'Failed to match jobs.');
      return;
    }

    setProgress(100);
    setStage('done');
    setMessage(`Found ${matchData.total} matches! Redirecting…`);

    // Go to matches page
    setTimeout(() => router.push(`/dashboard/matches?resume=${parseData.resume_id}`), 800);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const isProcessing = ['uploading', 'parsing', 'matching'].includes(stage);

  return (
    <div className="w-full">
      {/* Drop zone */}
      <label
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-14 text-center transition cursor-pointer
          ${dragging ? 'border-primary bg-primary/10' : 'border-white/20 hover:border-primary/60 hover:bg-white/[0.02]'}
          ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          type="file"
          accept=".pdf,.docx,.doc,.odt"
          className="hidden"
          onChange={onFileChange}
          disabled={isProcessing}
        />
        <div className="text-5xl">
          {stage === 'done'  ? '✅' :
           stage === 'error' ? '❌' :
           isProcessing      ? '⏳' : '📄'}
        </div>
        <div>
          <p className="text-lg font-semibold text-white">
            {isProcessing || stage === 'done' || stage === 'error'
              ? message
              : 'Drop your résumé here'}
          </p>
          {stage === 'idle' && (
            <p className="mt-1 text-sm text-white/50">PDF, DOCX, or ODT · max 10MB</p>
          )}
        </div>
        {stage === 'idle' && (
          <span className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white">
            Choose file
          </span>
        )}
      </label>

      {/* Progress bar */}
      {isProcessing && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {stage === 'error' && (
        <button
          onClick={() => { setStage('idle'); setMessage(''); setProgress(0); }}
          className="mt-4 rounded-lg border border-white/20 px-4 py-1.5 text-sm text-white/70 hover:bg-white/5"
        >
          Try again
        </button>
      )}
    </div>
  );
}
