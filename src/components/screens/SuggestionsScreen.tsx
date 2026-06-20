'use client';

import { useState } from 'react';
import type { Suggestion, SuggestionDecision } from '@/types';

interface Props {
  suggestions: Suggestion[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onUpdate: (id: number, patch: Partial<Suggestion>) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ── Individual card ──────────────────────────────────────────

interface CardProps {
  suggestion: Suggestion;
  onUpdate: (patch: Partial<Suggestion>) => void;
}

function SuggestionCard({ suggestion, onUpdate }: CardProps) {
  const [customText, setCustomText] = useState(suggestion.customText ?? '');

  const decide = (action: SuggestionDecision) => {
    const next = suggestion.decision === action ? null : action;
    onUpdate({ decision: next });
  };

  const handleCustomTextChange = (value: string) => {
    setCustomText(value);
    onUpdate({ customText: value });
  };

  const isReviewed = suggestion.decision !== null;

  return (
    <article
      className={`rounded-xl p-5 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300 ${
        !isReviewed
          ? 'ai-gradient-border'
          : 'border border-outline-variant bg-white opacity-70'
      }`}
    >
      {/* Section label + type badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-label-md font-semibold text-outline uppercase tracking-widest">
          {suggestion.section}
        </span>
        <span
          className={`text-label-md font-semibold px-2 py-0.5 rounded-full ${
            suggestion.type === 'positioning'
              ? 'bg-tertiary-fixed/30 text-tertiary'
              : 'bg-primary-fixed/20 text-primary'
          }`}
        >
          {suggestion.type === 'positioning' ? 'Positioning' : 'Substantive'}
        </span>
      </div>

      {/* Reviewed status badge */}
      {isReviewed && (
        <div className="flex justify-end mb-3">
          <span
            className={`text-label-md font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
              suggestion.decision === 'accept'
                ? 'bg-secondary-container text-on-secondary-container'
                : suggestion.decision === 'reject'
                ? 'bg-error-container text-on-error-container'
                : 'bg-surface-container-high text-on-surface'
            }`}
          >
            <span
              className="material-symbols-outlined text-sm leading-none"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {suggestion.decision === 'accept'
                ? 'check'
                : suggestion.decision === 'reject'
                ? 'close'
                : 'edit'}
            </span>
            {suggestion.decision === 'accept'
              ? 'ACCEPTED'
              : suggestion.decision === 'reject'
              ? 'REJECTED'
              : 'CUSTOM'}
          </span>
        </div>
      )}

      {/* Original */}
      <div className="mb-4">
        <p className="text-label-md font-semibold text-outline uppercase mb-1">Original</p>
        <p className="text-body-md text-on-surface-variant italic border-l-2 border-outline-variant pl-3">
          &ldquo;{suggestion.original}&rdquo;
        </p>
      </div>

      {/* Proposed */}
      <div className="mb-4">
        <p className="text-label-md font-semibold text-primary uppercase mb-1">Proposed</p>
        <p className="text-body-md text-on-surface font-semibold bg-surface-container-low p-3 rounded-xl border border-primary/10">
          &ldquo;{suggestion.proposed}&rdquo;
        </p>
      </div>

      {/* Rationale */}
      <div className="flex items-start gap-2 mb-4 p-3 bg-surface-container rounded-xl">
        <span className="material-symbols-outlined text-on-surface-variant text-lg leading-none shrink-0 mt-0.5">
          lightbulb
        </span>
        <p className="text-body-sm text-on-surface-variant leading-snug">{suggestion.rationale}</p>
      </div>

      {/* Custom textarea */}
      {suggestion.decision === 'custom' && (
        <textarea
          value={customText}
          onChange={(e) => handleCustomTextChange(e.target.value)}
          placeholder="Write your own version of this line…"
          rows={3}
          className="mb-3 w-full resize-none rounded-xl border-2 border-outline-variant bg-white p-3 text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none transition-colors custom-scrollbar"
        />
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        {/* Reject */}
        <button
          onClick={() => decide('reject')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-colors active:scale-95 ${
            suggestion.decision === 'reject'
              ? 'border-error bg-error-container/20 text-error'
              : 'border-outline-variant hover:bg-surface-container-high text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-xl leading-none mb-1">close</span>
          <span className="text-label-md uppercase">Reject</span>
        </button>

        {/* Write my own */}
        <button
          onClick={() => decide('custom')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-colors active:scale-95 ${
            suggestion.decision === 'custom'
              ? 'border-primary bg-primary-fixed/30 text-primary'
              : 'border-outline-variant hover:bg-surface-container-high text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-xl leading-none mb-1">edit</span>
          <span className="text-label-md uppercase">Write mine</span>
        </button>

        {/* Accept */}
        <button
          onClick={() => decide('accept')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-colors active:scale-95 ${
            suggestion.decision === 'accept'
              ? 'border-secondary bg-secondary text-on-secondary'
              : 'bg-surface-container-highest text-on-surface hover:bg-secondary-container hover:text-on-secondary-container border-transparent'
          }`}
        >
          <span
            className="material-symbols-outlined text-xl leading-none mb-1"
            style={{ fontVariationSettings: suggestion.decision === 'accept' ? "'FILL' 1" : "'FILL' 0" }}
          >
            check_circle
          </span>
          <span className="text-label-md uppercase">Accept</span>
        </button>
      </div>
    </article>
  );
}

// ── Screen ───────────────────────────────────────────────────

export default function SuggestionsScreen({
  suggestions,
  loading,
  error,
  onRetry,
  onUpdate,
  onContinue,
  onBack,
}: Props) {
  const reviewed = suggestions.filter((s) => s.decision !== null).length;
  const total = suggestions.length;
  const allReviewed = total > 0 && reviewed === total;
  const progressPct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">

      {/* Fixed top header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16 bg-surface shadow-sm">
        <button
          onClick={onBack}
          className="text-primary hover:opacity-80 transition-opacity active:scale-95 transition-transform"
          aria-label="Back"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-headline-md font-bold text-primary">ResumeSync</h1>
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-high">
          <span className="material-symbols-outlined text-primary">account_circle</span>
        </div>
      </header>

      {/* Scrollable content */}
      <main className="pt-20 px-4 pb-28 max-w-lg mx-auto w-full">

        {loading ? (
          /* Loading state */
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-pulse-ring" />
              <div className="absolute inset-2 border-4 border-primary/10 rounded-full animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-3xl leading-none">auto_awesome</span>
              </div>
            </div>
            <div className="space-y-2 max-w-xs">
              <h2 className="text-headline-md font-bold text-on-surface">Generating suggestions…</h2>
              <p className="text-body-md text-on-surface-variant">
                Reviewing your resume against the job description to find the most impactful edits.
              </p>
            </div>
            <div className="w-full max-w-xs progress-beam" />
          </div>
        ) : error ? (
          /* Error state */
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center max-w-sm mx-auto">
            <div className="w-20 h-20 rounded-full bg-error-container flex items-center justify-center">
              <span className="material-symbols-outlined text-error text-4xl leading-none">cloud_off</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-headline-md font-bold text-on-surface">Suggestions failed</h2>
              <p className="text-body-md text-on-surface-variant">{error}</p>
            </div>
            <button
              onClick={onRetry}
              className="w-full h-14 rounded-xl bg-primary text-on-primary font-semibold text-body-md flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-xl leading-none">refresh</span>
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* Progress counter section */}
            <section className="mb-8 mt-4 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-container text-on-secondary-container mb-3">
                <span
                  className="material-symbols-outlined text-lg leading-none"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  stars
                </span>
                <span className="text-label-md font-semibold">AI ENHANCEMENT ACTIVE</span>
              </div>
              <h2 className="text-headline-lg-mobile font-bold text-on-surface mb-3">Suggestions Review</h2>
              <div className="flex flex-col items-center gap-3">
                <p className="text-body-md text-on-surface-variant">
                  {reviewed} of {total} reviewed
                </p>
                <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary-fixed-dim rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </section>

            {/* Suggestion cards */}
            <div className="flex flex-col gap-6">
              {suggestions.map((s) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  onUpdate={(patch) => onUpdate(s.id, patch)}
                />
              ))}
            </div>
          </>
        )}

      </main>

      {/* Fixed bottom CTA — only shown when cards are visible */}
      {!loading && !error && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-6 bg-gradient-to-t from-surface via-surface/95 to-transparent z-40">
          <button
            onClick={onContinue}
            disabled={!allReviewed}
            className={`w-full h-14 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
              allReviewed
                ? 'bg-primary text-on-primary shadow-primary/20 active:scale-[0.98]'
                : 'bg-outline-variant text-on-surface-variant cursor-not-allowed'
            }`}
          >
            {allReviewed
              ? 'Continue to Final Review'
              : `${total - reviewed} decision${total - reviewed !== 1 ? 's' : ''} remaining`}
            {allReviewed && (
              <span className="material-symbols-outlined text-xl leading-none">arrow_forward</span>
            )}
          </button>
        </div>
      )}

    </div>
  );
}
