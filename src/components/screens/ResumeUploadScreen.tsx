'use client';

import { useRef, useState, useEffect } from 'react';
import type { ParsedResume } from '@/types';

interface Props {
  file: File | null;
  onFileChange: (f: File | null) => void;
  parsedResume: ParsedResume | null;
  onParsedResume: (r: ParsedResume | null) => void;
  onContinue: () => void;
  onBack: () => void;
}

const ACCEPTED_EXTS = ['pdf', 'docx'];
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

type ParseStatus = 'idle' | 'loading' | 'success' | 'error';

function getExt(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function isAccepted(f: File) {
  return ACCEPTED_EXTS.includes(getExt(f.name)) || ACCEPTED_MIME_TYPES.includes(f.type);
}

export default function ResumeUploadScreen({
  file,
  onFileChange,
  parsedResume,
  onParsedResume,
  onContinue,
  onBack,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle');
  const [parseError, setParseError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);

  // Trigger parsing whenever a new file is selected
  useEffect(() => {
    if (!file) {
      setParseStatus('idle');
      setParseError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function parse() {
      setParseStatus('loading');
      setParseError(null);
      onParsedResume(null);

      const form = new FormData();
      form.append('file', file!);

      try {
        const res = await fetch('/api/parse-resume', { method: 'POST', body: form, signal: controller.signal });
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setParseStatus('error');
          setParseError(data.message ?? 'Something went wrong. Please try again.');
          return;
        }

        setParseStatus('success');
        onParsedResume({
          sections: data.structured.sections,
          fileType: data.fileType,
          pageCount: data.pageCount ?? 1,
          // v2 (keep-original-format path): paragraphPositions: data.paragraphPositions,
        });
      } catch {
        if (cancelled) return;
        setParseStatus('error');
        setParseError('Something went wrong. Please check your connection and try again.');
      }
    }

    parse();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const handleFile = (f: File) => {
    setTypeError(null);
    if (!isAccepted(f)) {
      setTypeError('Only .pdf and .docx files are accepted. Please choose a different file.');
      return;
    }
    onFileChange(f);
  };

  const clearFile = () => {
    onFileChange(null);
    onParsedResume(null);
    setParseStatus('idle');
    setParseError(null);
    setTypeError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) handleFile(picked);
    // Reset so the same file can be re-selected after clearing
    e.target.value = '';
  };

  const isDocx = file ? getExt(file.name) === 'docx' : false;
  const canContinue = parseStatus === 'success' && parsedResume !== null;

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col">

      {/* Fixed top header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16 bg-surface shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-surface-container transition-colors active:scale-95 text-primary"
            aria-label="Back"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="text-headline-md font-bold text-primary">ResumeSync</span>
        </div>
        <span className="text-label-md font-semibold bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full">
          STEP 1 / 3
        </span>
      </header>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Scrollable content */}
      <main className="flex-1 pt-24 pb-32 px-4 flex flex-col max-w-lg mx-auto w-full">

        <header className="mb-10">
          <h1 className="text-headline-lg-mobile font-bold text-on-surface mb-2">Upload your resume</h1>
          <p className="text-body-md text-on-surface-variant">
            {"We'll use AI to analyze your experience and match it against job descriptions."}
          </p>
        </header>

        <div className="flex flex-col gap-6 flex-1">

          {/* Drop zone — only shown when no file is selected */}
          {!file && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 shadow-sm ${
                isDragging
                  ? 'border-primary bg-primary-fixed scale-[1.02]'
                  : 'border-outline-variant bg-white hover:shadow-md'
              }`}
            >
              <div className="absolute inset-0 overflow-hidden rounded-xl opacity-20 pointer-events-none">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-container rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary-container rounded-full blur-3xl" />
              </div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-primary-fixed rounded-2xl flex items-center justify-center text-primary mb-4 shadow-sm">
                  <span className="material-symbols-outlined text-4xl leading-none">upload_file</span>
                </div>
                <p className="text-headline-md font-semibold text-on-surface mb-2">Drag and drop file</p>
                <p className="text-body-sm text-on-surface-variant mb-6">PDF or Word (.docx) accepted</p>
                <span className="bg-primary text-on-primary font-bold px-8 py-3 rounded-xl shadow-lg shadow-primary/20 text-body-sm">
                  Browse Files
                </span>
              </div>
            </div>
          )}

          {/* Wrong file type error */}
          {typeError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-error/5 border border-error/20">
              <span className="material-symbols-outlined text-error text-xl leading-none mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                error
              </span>
              <p className="text-body-sm text-error">{typeError}</p>
            </div>
          )}

          {/* File card — shown once a file is picked */}
          {file && (
            <div className="bg-white rounded-xl p-4 flex items-center justify-between border border-outline-variant shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isDocx
                    ? 'bg-primary/10 text-primary'
                    : 'bg-error-container/20 text-error'
                }`}>
                  <span className="material-symbols-outlined text-xl leading-none">
                    {isDocx ? 'description' : 'picture_as_pdf'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-body-md font-semibold text-on-surface truncate">{file.name}</p>
                  <p className="text-body-sm text-on-surface-variant">
                    {(file.size / 1024).toFixed(0)} KB
                    {parseStatus === 'loading' && ' · Reading…'}
                    {parseStatus === 'success' && ' · Ready'}
                    {parseStatus === 'error' && ' · Failed'}
                  </p>
                </div>
              </div>
              <button
                onClick={clearFile}
                disabled={parseStatus === 'loading'}
                className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/5 rounded-full transition-colors active:scale-90 shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Remove file"
              >
                <span className="material-symbols-outlined text-xl leading-none">delete</span>
              </button>
            </div>
          )}

          {/* Loading indicator */}
          {parseStatus === 'loading' && (
            <div className="flex items-center gap-3 px-1">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-body-sm text-on-surface-variant">Parsing your resume…</p>
            </div>
          )}

          {/* Parse error */}
          {parseStatus === 'error' && parseError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-error/5 border border-error/20">
              <span className="material-symbols-outlined text-error text-xl leading-none mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                error
              </span>
              <div className="flex flex-col gap-2 min-w-0">
                <p className="text-body-sm text-error leading-relaxed">{parseError}</p>
                <button
                  onClick={clearFile}
                  className="text-body-sm font-semibold text-error underline underline-offset-2 text-left"
                >
                  Remove and try a different file
                </button>
              </div>
            </div>
          )}

          {/* Success confirmation */}
          {parseStatus === 'success' && (
            <div className="flex items-center gap-3 px-1">
              <span className="material-symbols-outlined text-xl leading-none text-[color:var(--md-sys-color-tertiary,#386A20)]" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
              <p className="text-body-sm text-on-surface-variant">Resume parsed successfully.</p>
            </div>
          )}

          {/* Replace link */}
          {file && parseStatus !== 'loading' && (
            <button
              onClick={() => inputRef.current?.click()}
              className="text-body-sm text-on-surface-variant hover:text-primary transition-colors -mt-2"
            >
              Replace file
            </button>
          )}

          {/* File format note */}
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            <span className="material-symbols-outlined text-base leading-none align-middle mr-1" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
            All resumes are output as an ATS optimized PDF. Original format preservation is coming in v2.
          </p>

          {/* AI pro tip card */}
          <div className="p-5 rounded-2xl bg-white shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary-fixed opacity-10 pointer-events-none" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
                <span
                  className="material-symbols-outlined text-lg leading-none"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                <strong className="text-primary">Pro Tip:</strong> Our AI works best with structured
                resumes. Ensure your contact info is at the top for better matching.
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Fixed bottom action */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-surface/80 backdrop-blur-md z-50">
        <div className="max-w-lg mx-auto">
          <button
            onClick={onContinue}
            disabled={!canContinue}
            className={`w-full h-14 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              canContinue
                ? 'bg-secondary text-on-secondary shadow-xl shadow-secondary/10 hover:opacity-90 active:scale-[0.98]'
                : 'bg-outline-variant text-on-surface-variant cursor-not-allowed'
            }`}
          >
            Continue
            <span className="material-symbols-outlined text-xl leading-none">arrow_forward</span>
          </button>
        </div>
      </div>

    </div>
  );
}
