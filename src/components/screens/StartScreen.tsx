'use client';

interface Props {
  onContinue: () => void;
}

export default function StartScreen({ onContinue }: Props) {
  return (
    <div className="min-h-screen bg-surface text-on-background flex flex-col overflow-hidden">

      {/* Decorative background blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-secondary-container/30 rounded-full blur-[100px] -translate-y-1/2" />
      </div>

      {/* Fixed top header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16 bg-surface/80 backdrop-blur-md">
        <span className="text-headline-md font-bold text-primary">ResumeSync</span>
        <span className="material-symbols-outlined text-primary opacity-60 cursor-pointer select-none text-2xl">help_outline</span>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col relative z-10 pt-16 pb-32 px-4">

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-center py-10 gap-6">

          {/* AI badge chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 w-fit">
            <span className="material-symbols-outlined text-primary text-base leading-none">auto_awesome</span>
            <span className="text-label-md font-semibold text-primary tracking-widest uppercase">AI-Powered Optimization</span>
          </div>

          {/* Headline */}
          <h1 className="text-headline-xl font-bold text-on-background max-w-[300px] leading-tight">
            Sync Your{' '}
            <br />
            <span className="text-primary italic">Career.</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-body-lg text-on-surface-variant max-w-xs leading-relaxed">
            Optimize your resume for any job description in seconds.
          </p>
        </div>

        {/* Feature bento tiles */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/40">
            <span className="material-symbols-outlined text-primary mb-2 block text-2xl">task_alt</span>
            <p className="text-label-md font-bold text-on-surface mb-0.5">98% Match</p>
            <p className="text-body-sm text-on-surface-variant leading-tight">ATS precision</p>
          </div>
          <div className="p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-white/40">
            <span className="material-symbols-outlined text-secondary mb-2 block text-2xl">bolt</span>
            <p className="text-label-md font-bold text-on-surface mb-0.5">Instant</p>
            <p className="text-body-sm text-on-surface-variant leading-tight">Zero waiting</p>
          </div>
        </div>

      </main>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-4 bg-white/60 backdrop-blur-lg">
        <button
          onClick={onContinue}
          className="w-full h-14 bg-primary text-on-primary rounded-xl font-semibold text-body-md flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
        >
          Get Started
          <span className="material-symbols-outlined text-xl leading-none">arrow_forward</span>
        </button>
        <p className="text-center mt-3 text-label-md text-on-surface-variant">
          Paste a JD · get results in minutes
        </p>
      </div>

    </div>
  );
}
