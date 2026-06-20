'use client';

import type { Verdict } from '@/types';

interface Props {
  verdict: Verdict;
  reasoning: string;
  onProceed: () => void;
  onTryAgain: () => void;
}

const VERDICT_CONFIG: Record<
  Verdict,
  {
    icon: string;
    badgeBorderClass: string;
    badgeGlowClass: string;
    badgeIconClass: string;
    badgeLabel: string;
    headlineLabel: string;
    reasoning: string;
    proceedLabel: string;
    chips: { label: string; colorClass: string }[];
  }
> = {
  apply: {
    icon: 'check_circle',
    badgeBorderClass: 'border-secondary',
    badgeGlowClass: 'bg-secondary-container',
    badgeIconClass: 'text-secondary',
    badgeLabel: 'Apply',
    headlineLabel: 'Perfect Alignment',
    reasoning:
      'Your background aligns well with the core requirements in this job description. The role asks for experience you have, and the language overlaps significantly. A few targeted edits should make your resume highly competitive for this position.',
    proceedLabel: 'Proceed with Edits',
    chips: [
      { label: 'Strong Match', colorClass: 'bg-primary-fixed text-on-primary-fixed-variant' },
      { label: 'High Demand Skill', colorClass: 'bg-tertiary-fixed text-on-tertiary-fixed-variant' },
    ],
  },
  apply_conditionally: {
    icon: 'warning',
    badgeBorderClass: 'border-tertiary',
    badgeGlowClass: 'bg-tertiary-fixed',
    badgeIconClass: 'text-tertiary',
    badgeLabel: 'Conditional',
    headlineLabel: 'Possible Alignment',
    reasoning:
      'There is meaningful overlap between your experience and this role, but a few key requirements are only partially addressed in your current resume. With careful framing and targeted edits, you can make a credible case. Pay close attention to the suggested changes.',
    proceedLabel: 'Proceed with Edits',
    chips: [
      { label: 'Partial Match', colorClass: 'bg-primary-fixed text-on-primary-fixed-variant' },
      { label: 'Gaps Identified', colorClass: 'bg-tertiary-fixed text-on-tertiary-fixed-variant' },
    ],
  },
  skip: {
    icon: 'cancel',
    badgeBorderClass: 'border-error',
    badgeGlowClass: 'bg-error-container',
    badgeIconClass: 'text-error',
    badgeLabel: 'Skip',
    headlineLabel: 'Weak Alignment',
    reasoning:
      "This role appears to require skills or experience that aren't well represented in your current resume. Applying may not be the best use of your time without a significant repositioning. If you still want to apply, we can suggest minimal edits to strengthen what you have.",
    proceedLabel: 'Proceed with Minimal Edits',
    chips: [
      { label: 'Weak Match', colorClass: 'bg-error-container text-on-error-container' },
      { label: 'Consider Skipping', colorClass: 'bg-tertiary-fixed text-on-tertiary-fixed-variant' },
    ],
  },
};

export default function VerdictScreen({ verdict, reasoning, onProceed, onTryAgain }: Props) {
  const config = VERDICT_CONFIG[verdict];

  return (
    <div className="min-h-screen bg-surface text-on-background flex flex-col items-center overflow-x-hidden">

      {/* Fixed top header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16 bg-surface shadow-sm">
        <div className="w-10" />
        <span className="text-headline-md font-bold text-primary">ResumeSync</span>
        <div className="w-10" />
      </header>

      <main className="w-full max-w-md px-4 pt-24 pb-40 flex-1 flex flex-col items-center">

        {/* Badge section */}
        <div className="w-full flex flex-col items-center mb-10 animate-reveal-up">
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Outer glow */}
            <div className={`absolute inset-0 ${config.badgeGlowClass} opacity-20 rounded-full blur-3xl animate-pulse`} />
            <div className={`absolute inset-0 border-4 ${config.badgeBorderClass} rounded-full scale-110 opacity-30`} />
            {/* Badge circle */}
            <div
              className={`relative bg-white rounded-full w-40 h-40 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] flex flex-col items-center justify-center border-4 ${config.badgeBorderClass}`}
            >
              <span
                className={`material-symbols-outlined text-6xl mb-1 leading-none ${config.badgeIconClass}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {config.icon}
              </span>
              <span className="text-label-md font-bold text-on-surface uppercase tracking-widest">
                {config.badgeLabel}
              </span>
            </div>
          </div>
          <h1 className="mt-8 text-headline-lg-mobile font-bold text-center text-on-surface">
            {config.headlineLabel}
          </h1>
        </div>

        {/* AI Reasoning card */}
        <div
          className="w-full bg-white rounded-xl p-6 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] border border-slate-100 relative overflow-hidden mb-6 animate-reveal-up"
          style={{ animationDelay: '0.15s' }}
        >
          <div className="ai-shimmer absolute inset-0 pointer-events-none" />
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-sm leading-none">auto_awesome</span>
            </div>
            <span className="text-label-md font-semibold text-primary uppercase">AI Verdict</span>
          </div>
          <p className="text-body-md text-on-surface-variant leading-relaxed">{reasoning}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {config.chips.map((chip) => (
              <span
                key={chip.label}
                className={`px-3 py-1 rounded-full text-label-md font-semibold ${chip.colorClass}`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </div>

      </main>

      {/* Fixed footer with action buttons */}
      <footer className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white/80 backdrop-blur-xl z-40 border-t border-slate-100 flex flex-col gap-3">
        <button
          onClick={onProceed}
          className="w-full bg-primary-container text-on-primary font-semibold text-body-md h-14 rounded-xl shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
        >
          {config.proceedLabel}
          <span className="material-symbols-outlined text-xl leading-none">edit_note</span>
        </button>
        <button
          onClick={onTryAgain}
          className="w-full bg-transparent text-outline font-semibold text-body-md h-14 rounded-xl border-2 border-outline/20 active:scale-95 transition-all duration-200"
        >
          Try a different job description
        </button>
      </footer>

    </div>
  );
}
