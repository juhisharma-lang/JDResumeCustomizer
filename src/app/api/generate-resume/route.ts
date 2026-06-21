import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import Anthropic from '@anthropic-ai/sdk';
import type { ParsedResume, ResumeSection, ResolvedSuggestion, TrimChange } from '@/types';

const client = new Anthropic();

const bodySectionSchema = {
  type: 'object' as const,
  properties: {
    title: { type: 'string' as const },
    content: { type: 'string' as const },
  },
  required: ['title', 'content'],
};

// ─── text normalisation helpers ───────────────────────────────────────────────

// Converts a single character to its ASCII equivalent for matching purposes.
// Handles the most common sources of mismatch: Unicode quotes, dashes, and
// non-breaking spaces that PDF/DOCX extractors and Claude produce inconsistently.
function normChar(ch: string): string {
  if (ch === '‘' || ch === '’' || ch === 'ʼ') return "'";
  if (ch === '“' || ch === '”' || ch === '«' || ch === '»') return '"';
  if (ch === '–' || ch === '—' || ch === '―') return '-';
  if (ch === ' ' || ch === ' ') return ' ';
  return ch;
}

// Produces a normalised form of `s` suitable for fuzzy comparison: unicode
// punctuation → ASCII, whitespace runs → single space, trimmed.
function normalizeText(s: string): string {
  let out = '';
  let prevSpace = false;
  for (const ch of s) {
    const n = normChar(ch);
    if (/\s/.test(n)) {
      if (!prevSpace) { out += ' '; prevSpace = true; }
    } else {
      out += n;
      prevSpace = false;
    }
  }
  return out.trim();
}

// Strips surrounding double-quotes that Claude sometimes emits when it treats a
// header field value as a JSON string literal (e.g. returns `"Senior Engineer"`
// with the quotes included rather than just `Senior Engineer`).
function stripOuterQuotes(s: string): string {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"') && !s.slice(1, -1).includes('"')) {
    return s.slice(1, -1);
  }
  return s;
}

// Replaces all occurrences of `original` inside `content` with `replacement`.
// Tries exact match first; falls back to a normalised match that tolerates
// whitespace variation and Unicode punctuation variants (curly quotes, non-
// breaking spaces, en/em dashes). When normalised matching is used, the
// replacement is spliced into the *original* content bytes so surrounding
// formatting (real newlines, tabs, etc.) outside the matched span is preserved.
function applyReplacement(
  content: string,
  original: string,
  replacement: string,
): { result: string; applied: boolean } {
  // Pass 1 — exact
  if (content.includes(original)) {
    return { result: content.split(original).join(replacement), applied: true };
  }

  // Pass 2 — normalised
  const normTarget = normalizeText(original);
  if (!normTarget) return { result: content, applied: false };

  // Build normBuf (normalised version of content) and a parallel index array
  // normToOrig[i] = index in `content` of the character that produced normBuf[i].
  // Consecutive whitespace is collapsed so normBuf[i] may represent a run of
  // whitespace characters in content; normToOrig[i] points to the first one.
  let normBuf = '';
  const normToOrig: number[] = [];
  let prevSpace = false;
  for (let i = 0; i < content.length; i++) {
    const n = normChar(content[i]);
    if (/\s/.test(n)) {
      if (!prevSpace) { normBuf += ' '; normToOrig.push(i); prevSpace = true; }
    } else {
      normBuf += n;
      normToOrig.push(i);
      prevSpace = false;
    }
  }

  if (!normBuf.includes(normTarget)) return { result: content, applied: false };

  // Replace all occurrences, splicing into `result` with an offset to account
  // for length changes from previous replacements.
  let result = content;
  let offset = 0;
  let searchFrom = 0;

  while (true) {
    const ni = normBuf.indexOf(normTarget, searchFrom);
    if (ni === -1) break;

    const origStart = normToOrig[ni];
    const origEnd =
      ni + normTarget.length < normToOrig.length
        ? normToOrig[ni + normTarget.length]
        : content.length;

    result =
      result.slice(0, origStart + offset) +
      replacement +
      result.slice(origEnd + offset);
    offset += replacement.length - (origEnd - origStart);
    searchFrom = ni + normTarget.length;
  }

  return { result, applied: true };
}

// ─── apply accepted edits via deterministic string replacement ────────────────
// Using string replacement (not Claude) guarantees the accepted suggestion text
// is inserted verbatim — no reinterpretation or creative paraphrasing.
// Exact match is tried first; a normalised fuzzy match is the fallback so that
// minor whitespace or Unicode punctuation differences don't silently drop edits.

function applyEditsDirectly(
  sections: ResumeSection[],
  resolved: ResolvedSuggestion[],
): ResumeSection[] {
  const replacementsBySec: Record<string, { original: string; finalText: string }[]> = {};
  for (const r of resolved) {
    if (!replacementsBySec[r.section]) replacementsBySec[r.section] = [];
    replacementsBySec[r.section].push({ original: r.original, finalText: r.finalText });
  }

  return sections.map((s) => {
    if ('data' in s) {
      const reps = replacementsBySec['Header'];
      if (!reps || reps.length === 0) return s;
      let { name, title, phone, email, location, links } = s.data;
      for (const { original, finalText: raw } of reps) {
        // Strip surrounding JSON-string quotes that Claude sometimes emits for
        // header field values (e.g. `"Senior Engineer"` with literal quote chars).
        const finalText = stripOuterQuotes(raw);
        let applied = false;
        const tryField = (field: string): string => {
          const { result, applied: ok } = applyReplacement(field, original, finalText);
          if (ok) applied = true;
          return result;
        };
        name = tryField(name);
        if (title != null) title = tryField(title);
        if (phone != null) phone = tryField(phone);
        if (email != null) email = tryField(email);
        if (location != null) location = tryField(location);
        if (!applied) {
          console.warn(
            '[applyEditsDirectly] edit not applied — original text not found in any Header field',
            '| original:', JSON.stringify(original.slice(0, 80)),
          );
        }
      }
      return { title: 'Header' as const, data: { name, title, phone, email, location, links } };
    }

    const reps = replacementsBySec[s.title];
    if (!reps || reps.length === 0) return s;

    let content = s.content;
    for (const { original, finalText } of reps) {
      const { result, applied } = applyReplacement(content, original, finalText);
      if (applied) {
        content = result;
      } else {
        console.warn(
          '[applyEditsDirectly] edit not applied — original text not found in section',
          JSON.stringify(s.title),
          '| original:', JSON.stringify(original.slice(0, 80)),
        );
      }
    }
    return { title: s.title, content };
  });
}

// ─── trim pass ────────────────────────────────────────────────────────────────

async function trimSectionsWithClaude(
  sections: ResumeSection[],
  resolvedSuggestions: ResolvedSuggestion[],
): Promise<{ sections: ResumeSection[]; changes: TrimChange[] }> {
  const body = sections.filter((s): s is { title: string; content: string } => !('data' in s));

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: `You are condensing resume sections to reduce total length by roughly 10–15%.
Rules:
- Tighten verbose phrasing and remove filler words. Never remove entire bullet points unless they are purely decorative.
- Keep all specific facts, metrics, dates, job titles, technologies, and company names.
- Never invent facts, numbers, tools, metrics, or claims not present in the original text.
- Do not reorder bullets or restructure sections.
- Never use em dashes (—) or en dashes (–) in condensed text; use commas, periods, or semicolons instead.
- Return every section even if you made no changes to it.
Call submit_trim with the condensed sections.`,
    tools: [
      {
        name: 'submit_trim',
        description: 'Return all body sections with wording condensed.',
        input_schema: {
          type: 'object' as const,
          properties: {
            sections: {
              type: 'array' as const,
              items: bodySectionSchema,
            },
          },
          required: ['sections'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit_trim' },
    messages: [
      {
        role: 'user',
        content: body
          .map((s) => `SECTION: ${s.title}\n${s.content}`)
          .join('\n\n---\n\n'),
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No tool_use in submit_trim response');

  const { sections: trimmedBody } = toolUse.input as { sections: { title: string; content: string }[] };

  // Build a per-section index of accepted-suggestion text that must survive trimming.
  // Header edits are applied to the Header data object, not body content, so skip them.
  const protectedBySec = new Map<string, string[]>();
  for (const r of resolvedSuggestions) {
    if (r.section === 'Header') continue;
    if (!protectedBySec.has(r.section)) protectedBySec.set(r.section, []);
    protectedBySec.get(r.section)!.push(r.finalText);
  }

  // For every trimmed section, verify that all accepted-edit text is still present
  // verbatim. If any was altered, revert the whole section to its pre-trim content —
  // we must never silently undo a change the user explicitly approved.
  const verifiedBody = trimmedBody.map((t) => {
    const spans = protectedBySec.get(t.title);
    if (!spans || spans.length === 0) return t;
    for (const span of spans) {
      if (!t.content.includes(span)) {
        const orig = body.find((s) => s.title === t.title);
        console.warn(
          '[trimSectionsWithClaude] accepted-edit text was modified during trim — reverting section to pre-trim content',
          '| section:', JSON.stringify(t.title),
          '| missing span:', JSON.stringify(span.slice(0, 80)),
        );
        return orig ?? t;
      }
    }
    return t;
  });

  // Track what actually changed (using the verified output, not the raw trimmed output).
  const changes: TrimChange[] = [];
  for (const t of verifiedBody) {
    const orig = body.find((s) => s.title === t.title);
    if (orig && orig.content !== t.content) {
      changes.push({ section: t.title, before: orig.content, after: t.content });
    }
  }

  // Rebuild full sections with header intact
  const header = sections.find((s) => 'data' in s);
  const result: ResumeSection[] = [];
  if (header) result.push(header);
  for (const s of verifiedBody) result.push({ title: s.title, content: s.content });

  return { sections: result, changes };
}

// ─── page count via pdf-parse ────────────────────────────────────────────────

async function countPdfPages(pdfBuffer: Buffer): Promise<number> {
  try {
    // pdf-parse exports PDFParse as a named function. @types/pdf-parse uses `export =`
    // so TypeScript mis-types it as a constructor; cast through unknown to call it.
    const { PDFParse } = await import('pdf-parse');
    const parse = PDFParse as unknown as (buf: Buffer) => Promise<{ numpages?: number }>;
    const result = await parse(pdfBuffer);
    const count = result.numpages ?? 1;
    console.log('[countPdfPages] pdf-parse numpages:', count);
    return count;
  } catch (err) {
    // Fallback: count /Type /Page entries in the raw bytes
    console.warn('[countPdfPages] pdf-parse failed, using regex fallback:', err);
    const str = pdfBuffer.toString('latin1');
    const matches = str.match(/\/Type\s*\/Page(?!s)/g);
    const count = matches ? matches.length : 1;
    console.log('[countPdfPages] regex page count:', count);
    return count;
  }
}

// ─── render to PDF ────────────────────────────────────────────────────────────

async function renderToPdf(sections: ResumeSection[]): Promise<Buffer> {
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const { ATSTemplate } = await import('@/lib/atsTemplate');
  // renderToBuffer types require DocumentProps on the element; cast via unknown since
  // ATSTemplate is a wrapper component that returns a <Document> internally.
  const element = React.createElement(ATSTemplate, { sections }) as unknown as React.ReactElement<{ title?: string }>;
  const RENDER_TIMEOUT_MS = 30_000;
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('PDF rendering timed out after 30s')), RENDER_TIMEOUT_MS)
  );
  return Promise.race([renderToBuffer(element), timeout]);
}

// ─── route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let resume: ParsedResume;
  let resolvedSuggestions: ResolvedSuggestion[];

  try {
    const body = await req.json();
    resume = body.resume;
    resolvedSuggestions = body.resolvedSuggestions ?? [];
    if (!resume?.sections) throw new Error('missing resume');
  } catch {
    return NextResponse.json(
      { error: 'invalid_request', message: 'Missing or invalid request body.' },
      { status: 400 }
    );
  }

  try {
    // Step 1: Use the page count captured from the original uploaded file during parsing.
    // This is the true user-facing baseline — comparing against a re-render of the same
    // content through the ATS template would only detect drift within the template itself,
    // not overflow relative to what the user actually uploaded.
    const baselinePageCount = resume.pageCount;
    if (!baselinePageCount || baselinePageCount <= 0) {
      // pageCount is typed as required number but could be 0 if the parser failed to detect
      // pages (e.g. a DOCX whose page count is estimated, not read from file metadata).
      // Log prominently so this is never a silent fallback to a wrong baseline.
      console.warn(
        '[generate-resume] resume.pageCount is missing or zero — overflow detection will be unreliable.',
        { fileType: resume.fileType, pageCount: resume.pageCount }
      );
    }
    console.log('[generate-resume] baseline page count (from parsed file):', baselinePageCount);

    // Step 2: Apply accepted edits via deterministic string replacement (no Claude).
    const finalSections: ResumeSection[] =
      resolvedSuggestions.length === 0
        ? resume.sections
        : applyEditsDirectly(resume.sections, resolvedSuggestions);

    // Step 3: Render with edits.
    let pdfBuffer = await renderToPdf(finalSections);
    let finalPageCount = await countPdfPages(pdfBuffer);
    console.log('[generate-resume] page count after applying edits:', finalPageCount, '| edits applied:', resolvedSuggestions.length);

    // Step 4: Trim pass if the edited document exceeds the ATS baseline page count.
    let trimApplied = false;
    let trimChanges: TrimChange[] = [];
    let pageCountExceeded = false;

    console.log('[generate-resume] trim needed:', finalPageCount > baselinePageCount, '| undershoot:', finalPageCount < baselinePageCount);
    if (finalPageCount < baselinePageCount) {
      // Output came out shorter than the original — trimming cannot recover pages, so flag immediately.
      pageCountExceeded = true;
      console.log('[generate-resume] page count undershoot — output is', finalPageCount, 'pages, baseline is', baselinePageCount);
    } else if (finalPageCount > baselinePageCount) {
      console.log('[generate-resume] starting trim pass');
      const trimResult = await trimSectionsWithClaude(finalSections, resolvedSuggestions);
      trimChanges = trimResult.changes;
      trimApplied = true;

      pdfBuffer = await renderToPdf(trimResult.sections);
      finalPageCount = await countPdfPages(pdfBuffer);
      console.log('[generate-resume] page count after trim:', finalPageCount, '| sections changed:', trimChanges.length);

      if (finalPageCount !== baselinePageCount) {
        pageCountExceeded = true;
        console.log('[generate-resume] trim did not resolve page count mismatch — output is', finalPageCount, 'pages, baseline is', baselinePageCount);
      }
    }

    const pdfBase64 = pdfBuffer.toString('base64');

    return NextResponse.json({
      pdfBase64,
      finalPageCount,
      originalPageCount: baselinePageCount,
      pageCountExceeded,
      trimApplied,
      trimChanges,
    });
  } catch (e) {
    console.error('[generate-resume]', e);
    return NextResponse.json(
      { error: 'generation_failed', message: 'Something went wrong while generating your resume. Please try again.' },
      { status: 500 }
    );
  }
}
