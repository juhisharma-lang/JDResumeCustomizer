'use client';

import { useState, useEffect } from 'react';
import type { Verdict, ParsedResume } from '@/types';

interface Props {
  jdText: string;
  resume: ParsedResume;
  onComplete: (verdict: Verdict, reasoning: string) => void;
}

export default function AnalyzingScreen({ jdText, resume, onComplete }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setError(null);
    let cancelled = false;

    async function runVerdict() {
      try {
        const res = await fetch('/api/verdict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jdText, resume }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.message ?? 'Something went wrong. Please try again.');
          return;
        }
        onComplete(data.verdict, data.reasoning);
      } catch {
        if (!cancelled) {
          setError('Something went wrong. Check your connection and try again.');
        }
      }
    }

    runVerdict();
    return () => {
      cancelled = true;
    };
    // jdText, resume, and onComplete are stable while this screen is mounted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col overflow-x-hidden">

      {/* Atmospheric radial background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,_rgba(79,70,229,0.05)_0%,_transparent_60%)]" />
      </div>

      {/* Fixed top header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16 bg-surface shadow-sm">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">arrow_back</span>
          <span className="text-headline-md font-bold text-primary">ResumeSync</span>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant">more_vert</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-24 text-center">

        {error ? (
          /* Error state */
          <div className="flex flex-col items-center gap-6 max-w-sm">
            <div className="w-20 h-20 rounded-full bg-error-container flex items-center justify-center">
              <span className="material-symbols-outlined text-error text-4xl leading-none">
                cloud_off
              </span>
            </div>
            <div className="space-y-2">
              <h1 className="text-headline-md font-bold text-on-surface">Analysis failed</h1>
              <p className="text-body-md text-on-surface-variant">{error}</p>
            </div>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="w-full h-14 rounded-xl bg-primary text-on-primary font-semibold text-body-md flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-xl leading-none">refresh</span>
              Try again
            </button>
          </div>
        ) : (
          /* Loading animation */
          <>
        {/* Pulsing ring animation */}
        <div className="relative w-64 h-64 mb-10 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-pulse-ring" />
          <div
            className="absolute inset-4 border-4 border-primary/10 rounded-full animate-pulse-ring"
            style={{ animationDelay: '0.5s' }}
          />
          <div
            className="absolute inset-8 border-4 border-secondary-container/20 rounded-full animate-pulse-ring"
            style={{ animationDelay: '1s' }}
          />

          {/* Central card */}
          <div className="relative z-10 w-32 h-32 bg-white rounded-3xl shadow-xl flex flex-col items-center justify-center p-4">
            <div className="grid grid-cols-2 gap-2 w-full mb-3">
              <div className="h-10 bg-primary/10 rounded flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl leading-none">description</span>
              </div>
              <div className="h-10 bg-secondary-container/30 rounded flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-2xl leading-none">analytics</span>
              </div>
            </div>
            <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden relative">
              <div className="absolute inset-y-0 left-0 bg-primary w-1/2 animate-[beam_2s_infinite_ease-in-out]" />
            </div>
            <span className="mt-2 text-label-md font-semibold text-primary tracking-widest">SYNCING</span>
          </div>

          {/* Floating micro-chips */}
          <div className="absolute top-0 right-0 p-3 bg-white shadow-lg rounded-full animate-floating">
            <span
              className="material-symbols-outlined text-primary text-xl leading-none"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </div>
          <div
            className="absolute bottom-4 left-0 p-2 bg-white shadow-lg rounded-xl animate-floating"
            style={{ animationDelay: '0.8s' }}
          >
            <span
              className="material-symbols-outlined text-secondary text-xl leading-none"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
          </div>
        </div>

        {/* Copy */}
        <div className="space-y-4 max-w-sm">
          <h1 className="text-headline-lg-mobile font-bold text-on-surface">
            Comparing your resume to the job description…
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Identifying key skills and match gaps to give you the perfect alignment.
          </p>
        </div>

        {/* Progress beam */}
        <div className="mt-12 w-full max-w-xs space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-label-md font-semibold text-outline">Progress</span>
            <span className="text-label-md font-semibold text-primary">Analyzing…</span>
          </div>
          <div className="progress-beam" />
        </div>
          </>
        )}

      </main>

    </div>
  );
}
