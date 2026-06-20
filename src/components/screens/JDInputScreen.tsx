'use client';

import { useState } from 'react';
import type { JDMode } from '@/types';

interface Props {
  mode: JDMode;
  onModeChange: (m: JDMode) => void;
  text: string;
  onTextChange: (t: string) => void;
  url: string;
  onUrlChange: (u: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function JDInputScreen({
  mode,
  onModeChange,
  text,
  onTextChange,
  url,
  onUrlChange,
  onContinue,
  onBack,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasInput = mode === 'text' ? text.trim().length > 0 : url.trim().length > 0;
  const canContinue = hasInput && !isLoading;

  function handleModeChange(m: JDMode) {
    setError(null);
    onModeChange(m);
  }

  function handleUrlChange(u: string) {
    setError(null);
    onUrlChange(u);
  }

  async function handleContinue() {
    if (mode === 'text') {
      onContinue();
      return;
    }

    // URL path: extract the job description server-side
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/extract-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? 'Something went wrong. Please try again.');
        return;
      }

      // Populate the shared text state so the rest of the app sees the same data
      onTextChange(data.text);
      onContinue();
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">

      {/* Fixed top header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center gap-4 px-4 h-16 bg-surface shadow-sm">
        <button
          onClick={onBack}
          className="text-primary active:scale-95 transition-transform hover:opacity-80"
          aria-label="Back"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-headline-md font-bold text-primary">ResumeSync</h1>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 mt-16 px-4 pt-8 pb-28 max-w-lg mx-auto w-full">

        {/* Section heading */}
        <section className="mb-8">
          <h2 className="text-headline-lg-mobile font-bold text-on-surface mb-2">Job Details</h2>
          <p className="text-body-md text-on-surface-variant">
            Paste the job description or a link to the job posting to start the AI sync process.
          </p>
        </section>

        {/* Tab toggle */}
        <div className="bg-surface-container-low p-1.5 rounded-xl flex mb-8">
          {(['text', 'url'] as JDMode[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleModeChange(tab)}
              className={`flex-1 py-2.5 rounded-lg text-label-md font-semibold transition-all duration-200 ${
                mode === tab
                  ? 'bg-white shadow-sm text-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {tab === 'text' ? 'Paste Text' : 'Paste URL'}
            </button>
          ))}
        </div>

        {/* Input area */}
        {mode === 'text' ? (
          <div className="relative group">
            <textarea
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Paste the full job description here… (e.g. Responsibilities, Requirements, Preferred Skills)"
              rows={12}
              className="w-full bg-white border-2 border-outline-variant rounded-xl p-4 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none resize-none transition-colors custom-scrollbar"
            />
            <div className="absolute bottom-4 right-4 pointer-events-none">
              <span className="material-symbols-outlined text-outline-variant group-focus-within:text-primary transition-colors">description</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="relative group">
              <input
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://linkedin.com/jobs/view/..."
                disabled={isLoading}
                className={`w-full bg-white border-2 rounded-xl px-4 py-4 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none transition-colors ${
                  error
                    ? 'border-error focus:border-error'
                    : 'border-outline-variant focus:border-primary'
                } disabled:opacity-60`}
              />
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                {isLoading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : (
                  <span className={`material-symbols-outlined transition-colors ${error ? 'text-error' : 'text-outline-variant group-focus-within:text-primary'}`}>
                    link
                  </span>
                )}
              </div>
            </div>

            {/* Helper note */}
            <p className="mt-3 text-body-sm text-on-surface-variant leading-relaxed">
              <span className="material-symbols-outlined text-base leading-none align-middle mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
              {"Works best with LinkedIn job links. Some sites, like Indeed and Naukri, often block automatic extraction - if a link doesn't work, paste the job description text directly instead."}
            </p>

            {/* Loading status */}
            {isLoading && (
              <p className="mt-3 text-body-sm text-primary flex items-center gap-2">
                <span>Fetching and analyzing the job posting…</span>
              </p>
            )}

            {/* Error message */}
            {error && !isLoading && (
              <div className="mt-3 p-4 rounded-xl bg-error-container border border-error flex items-start gap-3">
                <span className="material-symbols-outlined text-error text-xl leading-none shrink-0 mt-0.5">
                  error
                </span>
                <div>
                  <p className="text-body-sm text-on-error-container">{error}</p>
                  <p className="text-body-sm text-on-error-container/70 mt-1">
                    Try a different URL, or switch to{' '}
                    <button
                      onClick={() => handleModeChange('text')}
                      className="underline font-medium hover:opacity-80"
                    >
                      Paste Text
                    </button>
                    {' '}to add the job description manually.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info tip */}
        <div className="mt-4 p-4 rounded-xl bg-surface-container border border-surface-container-high flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-xl leading-none shrink-0 mt-0.5">info</span>
          <p className="text-body-sm text-on-surface-variant">
            The more detail you provide, the better ResumeSync can tailor your keywords.
          </p>
        </div>

      </main>

      {/* Fixed bottom action */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white/80 backdrop-blur-md z-40">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={`w-full h-14 rounded-xl font-semibold text-body-md flex items-center justify-center gap-2 transition-all duration-300 ${
              canContinue
                ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 active:scale-[0.98]'
                : 'bg-outline-variant text-on-surface-variant cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Extracting…
              </>
            ) : (
              <>
                Continue
                <span className="material-symbols-outlined text-xl leading-none">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
