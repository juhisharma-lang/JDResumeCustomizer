'use client';

import type { Suggestion, GenerateResumeResult } from '@/types';

interface Props {
  suggestions: Suggestion[];
  generateLoading: boolean;
  generateError: string | null;
  generateResult: GenerateResumeResult | null;
  onDownload: () => void;
  onBack: () => void;
}

export default function FinalReviewScreen({
  suggestions,
  generateLoading,
  generateError,
  generateResult,
  onDownload,
  onBack,
}: Props) {
  const accepted = suggestions.filter((s) => s.decision === 'accept');
  const rejected = suggestions.filter((s) => s.decision === 'reject');
  const custom = suggestions.filter((s) => s.decision === 'custom');

  // Summary items derived from real data
  const changeItems: { text: string; muted?: boolean }[] = [
    ...(accepted.length > 0
      ? [{ text: `${accepted.length} suggested edit${accepted.length !== 1 ? 's' : ''} accepted` }]
      : []),
    ...(custom.length > 0
      ? [{ text: `${custom.length} section${custom.length !== 1 ? 's' : ''} rewritten with your own text` }]
      : []),
    ...(generateResult?.trimApplied && generateResult.trimChanges.length > 0
      ? [{ text: `${generateResult.trimChanges.length} section${generateResult.trimChanges.length !== 1 ? 's' : ''} condensed to fit original page count` }]
      : []),
    ...(rejected.length > 0
      ? [{ text: `${rejected.length} suggestion${rejected.length !== 1 ? 's' : ''} skipped`, muted: true }]
      : []),
  ];

  const pageCountLabel = (() => {
    if (!generateResult) return null;
    const { finalPageCount, originalPageCount, pageCountExceeded } = generateResult;
    if (pageCountExceeded) {
      // Trim ran but couldn't bring the count down to the ATS baseline
      return `${finalPageCount} page${finalPageCount !== 1 ? 's' : ''} — couldn't trim to ${originalPageCount}`;
    }
    return `${finalPageCount} page${finalPageCount !== 1 ? 's' : ''}`;
  })();

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
        <div className="w-10" />
      </header>

      {/* Scrollable content */}
      <main className="pt-24 px-4 pb-32 max-w-md mx-auto w-full">

        {/* Page title */}
        <section className="mb-8">
          <h2 className="text-headline-lg-mobile font-bold text-on-surface mb-2">Final Review</h2>
          <p className="text-body-md text-on-surface-variant">
            {generateLoading
              ? 'Building your customized resume…'
              : generateError
              ? 'Something went wrong. Your edits are saved — try again below.'
              : 'Your synchronized resume is ready for download.'}
          </p>
        </section>

        {/* Loading state */}
        {generateLoading && (
          <div className="rounded-xl p-8 mb-8 flex flex-col items-center gap-4 bg-surface-container-low">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-body-md text-on-surface-variant text-center">
              Applying your edits and rendering the ATS template…
            </p>
            <p className="text-body-sm text-on-surface-variant/60 text-center">This usually takes 10–20 seconds.</p>
          </div>
        )}

        {/* Error state */}
        {generateError && !generateLoading && (
          <div className="rounded-xl p-5 mb-8 bg-error/5 border border-error/20 flex items-start gap-3">
            <span
              className="material-symbols-outlined text-error text-xl leading-none mt-0.5 shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              error
            </span>
            <div>
              <p className="text-body-sm text-error mb-1">{generateError}</p>
            </div>
          </div>
        )}

        {/* Page count exceeded warning */}
        {generateResult?.pageCountExceeded && (
          <div className="rounded-xl p-5 mb-8 bg-tertiary-container/40 border border-tertiary/20">
            <div className="flex items-start gap-3">
              <span
                className="material-symbols-outlined text-tertiary text-xl leading-none mt-0.5 shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                info
              </span>
              <div>
                <p className="text-body-sm font-semibold text-on-surface mb-1">One extra page needed</p>
                <p className="text-body-sm text-on-surface-variant">
                  Even after condensing, the accepted edits need {generateResult.finalPageCount} page
                  {generateResult.finalPageCount !== 1 ? 's' : ''} to fit — one more than your original{' '}
                  {generateResult.originalPageCount}-page resume. Everything from your accepted edits is included.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Optimization summary card — shown once generation is done */}
        {generateResult && (
          <div
            className="rounded-xl p-6 mb-8 shadow-sm"
            style={{
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span
                className="material-symbols-outlined text-primary text-xl leading-none"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
              <h3 className="text-headline-md font-semibold text-on-surface">Optimization Summary</h3>
            </div>

            {changeItems.length > 0 ? (
              <ul className="space-y-4 mb-6">
                {changeItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    {!item.muted ? (
                      <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-secondary-container flex items-center justify-center">
                        <span
                          className="material-symbols-outlined text-on-secondary-container leading-none"
                          style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}
                        >
                          check
                        </span>
                      </div>
                    ) : (
                      <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-outline-variant/30 flex items-center justify-center">
                        <span
                          className="material-symbols-outlined text-on-surface-variant leading-none"
                          style={{ fontSize: '14px' }}
                        >
                          remove
                        </span>
                      </div>
                    )}
                    <span className={`text-body-md ${item.muted ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-md text-on-surface-variant mb-6">
                No suggestions were accepted — your original resume was rendered as-is into the ATS template.
              </p>
            )}

            {/* Page count + ATS badge */}
            <div className="pt-4 border-t border-outline-variant flex justify-between items-center">
              <span
                className={`text-label-md font-semibold ${
                  generateResult.pageCountExceeded ? 'text-tertiary' : 'text-on-surface-variant'
                }`}
              >
                {pageCountLabel}
              </span>
              <div className="flex items-center gap-1 bg-surface-container-high px-2 py-1 rounded-full">
                <span className="material-symbols-outlined text-secondary leading-none" style={{ fontSize: '16px' }}>
                  verified
                </span>
                <span className="text-label-md font-semibold text-secondary">ATS Ready</span>
              </div>
            </div>
          </div>
        )}


      </main>

      {/* Fixed bottom download action */}
      <footer className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-surface/80 backdrop-blur-xl z-50">
        <div className="max-w-md mx-auto">
          <button
            onClick={onDownload}
            disabled={!generateResult || generateLoading}
            className={`w-full font-bold py-4 rounded-xl flex items-center justify-center gap-3 text-body-md transition-all shadow-lg ${
              generateResult && !generateLoading
                ? 'bg-secondary text-on-secondary hover:opacity-90 active:scale-[0.98]'
                : 'bg-outline-variant text-on-surface-variant cursor-not-allowed'
            }`}
          >
            <span
              className="material-symbols-outlined text-xl leading-none"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {generateLoading ? 'hourglass_empty' : 'download'}
            </span>
            {generateLoading ? 'Building resume…' : 'Download Resume'}
          </button>
        </div>
      </footer>

    </div>
  );
}
