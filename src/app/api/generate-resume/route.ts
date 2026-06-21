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

// ─── apply accepted edits via deterministic string replacement ────────────────
// Using exact string replacement (not Claude) guarantees the accepted suggestion
// text is inserted verbatim — no reinterpretation or creative paraphrasing.

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
      // Apply accepted edits to Header string fields the same way body sections are handled.
      const reps = replacementsBySec['Header'];
      if (!reps || reps.length === 0) return s;
      let { name, title, phone, email, location, links } = s.data;
      for (const { original, finalText } of reps) {
        let applied = false;
        if (name.includes(original)) { name = name.split(original).join(finalText); applied = true; }
        if (title && title.includes(original)) { title = title.split(original).join(finalText); applied = true; }
        if (phone && phone.includes(original)) { phone = phone.split(original).join(finalText); applied = true; }
        if (email && email.includes(original)) { email = email.split(original).join(finalText); applied = true; }
        if (location && location.includes(original)) { location = location.split(original).join(finalText); applied = true; }
        if (!applied) console.warn('[applyEditsDirectly] edit not applied — original text not found in Header | original:', JSON.stringify(original.slice(0, 80)));
      }
      return { title: 'Header' as const, data: { name, title, phone, email, location, links } };
    }
    const reps = replacementsBySec[s.title];
    if (!reps || reps.length === 0) return s;

    let content = s.content;
    for (const { original, finalText } of reps) {
      if (content.includes(original)) {
        content = content.split(original).join(finalText);
      } else {
        console.warn('[applyEditsDirectly] edit not applied — original text not found in section', JSON.stringify(s.title), '| original:', JSON.stringify(original.slice(0, 80)));
      }
    }
    return { title: s.title, content };
  });
}

// ─── trim pass ────────────────────────────────────────────────────────────────

async function trimSectionsWithClaude(
  sections: ResumeSection[],
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

  // Track what actually changed
  const changes: TrimChange[] = [];
  for (const t of trimmedBody) {
    const orig = body.find((s) => s.title === t.title);
    if (orig && orig.content !== t.content) {
      changes.push({ section: t.title, before: orig.content, after: t.content });
    }
  }

  // Rebuild full sections with header intact
  const header = sections.find((s) => 'data' in s);
  const result: ResumeSection[] = [];
  if (header) result.push(header);
  for (const s of trimmedBody) result.push({ title: s.title, content: s.content });

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
      const trimResult = await trimSectionsWithClaude(finalSections);
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
