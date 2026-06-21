export type Screen =
  | 'start'
  | 'jd-input'
  | 'resume-upload'
  | 'format-preference'
  | 'analyzing'
  | 'verdict'
  | 'suggestions'
  | 'final-review'
  | 'limit-reached';

export type JDMode = 'text' | 'url';
export type FormatPreference = 'ats' | 'original';
export type Verdict = 'skip' | 'apply_conditionally' | 'apply';
export type SuggestionDecision = 'accept' | 'reject' | 'custom' | null;
export type SuggestionType = 'positioning' | 'substantive';

export interface Suggestion {
  id: number;
  section: string;
  original: string;
  proposed: string;
  rationale: string;
  type: SuggestionType;
  decision: SuggestionDecision;
  customText?: string;
}

export interface ResumeHeaderData {
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  links: { label: string; url: string | null }[];
}

export type ResumeSection =
  | { title: 'Header'; data: ResumeHeaderData }
  | { title: string; content: string };

// Tracks where each section heading falls in the original DOCX XML paragraph order.
// Used by the future python-docx preservation service to locate paragraphs for in-place edits.
export interface DocxParagraphPosition {
  sectionHeading: string; // original heading text as it appears in the document
  paragraphIndex: number; // 0-based estimated paragraph index in document XML
}

export interface ParsedResume {
  sections: ResumeSection[];
  fileType: 'pdf' | 'docx';
  pageCount: number;
  paragraphPositions?: DocxParagraphPosition[]; // docx uploads only
}

// A suggestion after the user has reviewed it — only accepted and user-written ones are sent to generate-resume.
export interface ResolvedSuggestion {
  section: string;
  original: string;
  finalText: string; // proposed text for 'accepted'; customText for 'user-written'
  status: 'accepted' | 'user-written';
}

export interface TrimChange {
  section: string;
  before: string;
  after: string;
}

export interface GenerateResumeResult {
  pdfBase64: string;
  finalPageCount: number;
  originalPageCount: number;
  pageCountExceeded: boolean;
  trimApplied: boolean;
  trimChanges: TrimChange[];
}
