'use client';

import { useState, useCallback } from 'react';
import type {
  Screen,
  JDMode,
  FormatPreference,
  Verdict,
  Suggestion,
  SuggestionDecision,
  SuggestionType,
  ParsedResume,
  GenerateResumeResult,
} from '@/types';
import StartScreen from '@/components/screens/StartScreen';
import JDInputScreen from '@/components/screens/JDInputScreen';
import ResumeUploadScreen from '@/components/screens/ResumeUploadScreen';
import FormatPreferenceScreen from '@/components/screens/FormatPreferenceScreen';
import AnalyzingScreen from '@/components/screens/AnalyzingScreen';
import VerdictScreen from '@/components/screens/VerdictScreen';
import SuggestionsScreen from '@/components/screens/SuggestionsScreen';
import FinalReviewScreen from '@/components/screens/FinalReviewScreen';

export default function Home() {
  const [screen, setScreen] = useState<Screen>('start');

  // JD input state
  const [jdMode, setJdMode] = useState<JDMode>('text');
  const [jdText, setJdText] = useState('');
  const [jdUrl, setJdUrl] = useState('');

  // Resume upload state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);

  // Format preference state
  const [formatPreference, setFormatPreference] = useState<FormatPreference | null>(null);

  // Verdict state — populated by the analyzing screen via the verdict API
  const [verdict, setVerdict] = useState<Verdict>('apply');
  const [verdictReasoning, setVerdictReasoning] = useState('');

  // Suggestions state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  // Generate / download state
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateResult, setGenerateResult] = useState<GenerateResumeResult | null>(null);

  const go = useCallback((s: Screen) => setScreen(s), []);

  const handleVerdictComplete = useCallback(
    (v: Verdict, reasoning: string) => {
      setVerdict(v);
      setVerdictReasoning(reasoning);
      go('verdict');
    },
    [go]
  );

  const fetchSuggestions = useCallback(
    async (v: Verdict, reasoning: string) => {
      setSuggestionsLoading(true);
      setSuggestionsError(null);
      setSuggestions([]);
      try {
        const res = await fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jdText, resume: parsedResume, verdict: v, verdictReasoning: reasoning }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Something went wrong.');
        setSuggestions(
          (data.suggestions as Array<{ section: string; original: string; proposed: string; rationale: string; type: SuggestionType }>).map(
            (s, i) => ({ ...s, id: i + 1, decision: null as SuggestionDecision })
          )
        );
      } catch (e) {
        setSuggestionsError(
          e instanceof Error ? e.message : 'Something went wrong. Please try again.'
        );
      } finally {
        setSuggestionsLoading(false);
      }
    },
    [jdText, parsedResume]
  );

  const handleVerdictProceed = useCallback(() => {
    go('suggestions');
    fetchSuggestions(verdict, verdictReasoning);
  }, [go, fetchSuggestions, verdict, verdictReasoning]);

  const updateSuggestion = useCallback((id: number, patch: Partial<Suggestion>) => {
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const triggerGenerate = useCallback(
    async (currentSuggestions: Suggestion[]) => {
      if (!parsedResume) return;

      setGenerateLoading(true);
      setGenerateError(null);
      setGenerateResult(null);

      const resolvedSuggestions = currentSuggestions
        .filter((s) => s.decision === 'accept' || s.decision === 'custom')
        .map((s) => ({
          section: s.section,
          original: s.original,
          finalText: s.decision === 'accept' ? s.proposed : (s.customText ?? s.proposed),
          status: (s.decision === 'accept' ? 'accepted' : 'user-written') as 'accepted' | 'user-written',
        }));

      try {
        const res = await fetch('/api/generate-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resume: parsedResume,
            originalPageCount: parsedResume.pageCount,
            resolvedSuggestions,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Something went wrong.');
        setGenerateResult(data as GenerateResumeResult);
      } catch (e) {
        setGenerateError(
          e instanceof Error ? e.message : 'Something went wrong generating your resume. Please try again.'
        );
      } finally {
        setGenerateLoading(false);
      }
    },
    [parsedResume]
  );

  const handleSuggestionsContinue = useCallback(() => {
    go('final-review');
    triggerGenerate(suggestions);
  }, [go, triggerGenerate, suggestions]);

  const handleDownload = useCallback(() => {
    if (!generateResult?.pdfBase64) return;
    const binary = atob(generateResult.pdfBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume-ats.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generateResult]);

  return (
    <main className="min-h-screen">
      {screen === 'start' && (
        <StartScreen onContinue={() => go('jd-input')} />
      )}

      {screen === 'jd-input' && (
        <JDInputScreen
          mode={jdMode}
          onModeChange={setJdMode}
          text={jdText}
          onTextChange={setJdText}
          url={jdUrl}
          onUrlChange={setJdUrl}
          onContinue={() => go('resume-upload')}
          onBack={() => go('start')}
        />
      )}

      {screen === 'resume-upload' && (
        <ResumeUploadScreen
          file={resumeFile}
          onFileChange={setResumeFile}
          parsedResume={parsedResume}
          onParsedResume={setParsedResume}
          onContinue={() => go('format-preference')}
          onBack={() => go('jd-input')}
        />
      )}

      {screen === 'format-preference' && (
        <FormatPreferenceScreen
          file={resumeFile}
          preference={formatPreference}
          onPreferenceChange={setFormatPreference}
          onContinue={() => go('analyzing')}
          onBack={() => go('resume-upload')}
        />
      )}

      {screen === 'analyzing' && (
        <AnalyzingScreen
          jdText={jdText}
          resume={parsedResume!}
          onComplete={handleVerdictComplete}
        />
      )}

      {screen === 'verdict' && (
        <VerdictScreen
          verdict={verdict}
          reasoning={verdictReasoning}
          onProceed={handleVerdictProceed}
          onTryAgain={() => go('jd-input')}
        />
      )}

      {screen === 'suggestions' && (
        <SuggestionsScreen
          suggestions={suggestions}
          loading={suggestionsLoading}
          error={suggestionsError}
          onRetry={() => fetchSuggestions(verdict, verdictReasoning)}
          onUpdate={updateSuggestion}
          onContinue={handleSuggestionsContinue}
          onBack={() => go('verdict')}
        />
      )}

      {screen === 'final-review' && (
        <FinalReviewScreen
          suggestions={suggestions}
          generateLoading={generateLoading}
          generateError={generateError}
          generateResult={generateResult}
          onDownload={handleDownload}
          onBack={() => go('suggestions')}
        />
      )}
    </main>
  );
}
