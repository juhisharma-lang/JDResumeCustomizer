'use client';

import type { FormatPreference } from '@/types';

interface Props {
  file?: File | null;
  preference: FormatPreference | null;
  onPreferenceChange: (p: FormatPreference) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface CardProps {
  icon: string;
  label: string;
  description: string;
  chips?: string[];
  selected: boolean;
  disabled: boolean;
  disabledNote?: string;
  onSelect: () => void;
}

function FormatCard({
  icon,
  label,
  description,
  chips,
  selected,
  disabled,
  disabledNote,
  onSelect,
}: CardProps) {
  return (
    <button
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      className={`w-full p-6 rounded-xl text-left transition-all duration-300 shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] ${
        disabled
          ? 'bg-surface-container-low border-2 border-outline-variant/30 opacity-60 grayscale cursor-not-allowed'
          : selected
          ? 'bg-primary-fixed/20 border-2 border-primary'
          : 'bg-white border-2 border-transparent hover:shadow-lg'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            disabled ? 'bg-outline-variant/20 text-outline' : 'bg-primary/10 text-primary'
          }`}
        >
          <span
            className="material-symbols-outlined text-2xl leading-none"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>
        {selected && !disabled && (
          <span className="material-symbols-outlined text-primary text-2xl leading-none">check_circle</span>
        )}
      </div>

      <h3
        className={`text-headline-md font-semibold mb-2 ${
          disabled ? 'text-outline' : 'text-on-surface'
        }`}
      >
        {label}
      </h3>
      <p className={`text-body-sm leading-relaxed ${disabled ? 'text-outline' : 'text-on-surface-variant'}`}>
        {description}
      </p>

      {chips && !disabled && (
        <div className="mt-4 flex gap-2 flex-wrap">
          {chips.map((chip) => (
            <span
              key={chip}
              className="px-3 py-1 bg-secondary-container text-on-secondary-container text-label-md font-semibold rounded-full"
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      {disabled && disabledNote && (
        <div className="mt-4 p-3 bg-surface-container rounded-lg flex items-start gap-2 border border-outline-variant/40">
          <span className="material-symbols-outlined text-outline text-sm leading-none shrink-0 mt-0.5">schedule</span>
          <p className="text-body-sm text-on-surface-variant leading-tight">{disabledNote}</p>
        </div>
      )}
    </button>
  );
}

export default function FormatPreferenceScreen({
  preference,
  onPreferenceChange,
  onContinue,
  onBack,
}: Props) {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">

      {/* Fixed top header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center gap-4 px-4 h-16 bg-surface shadow-sm backdrop-blur-sm">
        <button
          onClick={onBack}
          className="active:scale-95 transition-transform text-primary hover:opacity-80"
          aria-label="Back"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-headline-md font-bold text-primary">ResumeSync</h1>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 pt-24 pb-32 px-4 max-w-lg mx-auto w-full">

        <section className="mb-10 text-center">
          <h2 className="text-headline-lg-mobile font-bold text-on-surface mb-2">Select Format</h2>
          <p className="text-body-md text-on-surface-variant">
            How should ResumeSync generate your new synced version?
          </p>
        </section>

        <div className="space-y-6">
          <FormatCard
            icon="description"
            label="ATS Optimized Template"
            description="Clean, structured layout designed to pass 99% of Applicant Tracking Systems globally. Professional and readable."
            chips={['High Success Rate', 'Recommended']}
            selected={preference === 'ats'}
            disabled={false}
            onSelect={() => onPreferenceChange('ats')}
          />
          <FormatCard
            icon="history_edu"
            label="Keep My Original Format"
            description="Maintain your current fonts, spacing, and personal branding layout while we update the content."
            selected={false}
            disabled={true}
            disabledNote="Coming in v2. For now, copy the suggested edits manually into your own formatted file."
            onSelect={() => {}}
          />
        </div>

        {/* Step progress dots */}
        <div className="mt-12 flex justify-center items-center gap-3">
          <div className="w-8 h-2 rounded-full bg-primary" />
          <div className="w-8 h-2 rounded-full bg-primary" />
          <div className="w-16 h-2 rounded-full bg-secondary-fixed" />
          <div className="w-8 h-2 rounded-full bg-surface-container-highest" />
        </div>

      </main>

      {/* Fixed bottom action */}
      <footer className="fixed bottom-0 left-0 right-0 px-4 py-6 bg-surface shadow-[0_-4px_20px_0_rgba(0,0,0,0.04)] z-50">
        <div className="max-w-lg mx-auto">
          <button
            onClick={onContinue}
            disabled={!preference}
            className={`w-full h-14 rounded-xl font-bold flex items-center justify-center gap-2 transition-all group ${
              preference
                ? 'bg-secondary-fixed text-on-secondary-fixed active:scale-95'
                : 'bg-outline-variant text-on-surface-variant cursor-not-allowed'
            }`}
          >
            <span className="text-headline-md font-semibold">Continue</span>
            <span className="material-symbols-outlined text-xl leading-none group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </button>
          <p className="text-center text-label-md text-on-surface-variant mt-3 uppercase tracking-widest">
            Step 3 of 4
          </p>
        </div>
      </footer>

    </div>
  );
}
