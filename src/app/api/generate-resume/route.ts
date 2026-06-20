import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import Anthropic from '@anthropic-ai/sdk';
import type { ParsedResume, ResumeSection, ResumeHeaderData, ResolvedSuggestion, TrimChange } from '@/types';

const client = new Anthropic();

// ─── section schema reused in both Claude tool calls ─────────────────────────

const bodySectionSchema = {
  type: 'object' as const,
  properties: {
    title: { type: 'string' as const },
    content: { type: 'string' as const },
  },
  required: ['title', 'content'],
};

// ─── apply accepted edits via Claude ─────────────────────────────────────────

async function applyEditsWithClaude(
  sections: ResumeSection[],
  resolved: ResolvedSuggestion[],
): Promise<ResumeSection[]> {
  // Group replacements by section for clarity in the prompt
  const replacementsBySec: Record<string, { target: string; replacement: string }[]> = {};
  for (const r of resolved) {
    if (!replacementsBySec[r.section]) replacementsBySec[r.section] = [];
    replacementsBySec[r.section].push({ target: r.original, replacement: r.finalText });
  }

  const sectionDescriptions = sections.map((s) => {
    if ('data' in s) {
      return `SECTION: Header\n[structured header — copy verbatim, make no changes]`;
    }
    const reps = replacementsBySec[s.title];
    if (!reps || reps.length === 0) {
      return `SECTION: ${s.title}\nSTATUS: No edits — copy content exactly as given\nCONTENT:\n${s.content}`;
    }
    const repList = reps
      .map((r, i) => `  Replacement ${i + 1}:\n    TARGET: ${r.target}\n    USE INSTEAD: ${r.replacement}`)
      .join('\n');
    return `SECTION: ${s.title}\nSTATUS: Apply replacements below, change nothing else\nCONTENT:\n${s.content}\nREPLACEMENTS:\n${repList}`;
  });

  // Pull out the header data to pass through unchanged
  const headerSection = sections.find((s): s is { title: 'Header'; data: ResumeHeaderData } => 'data' in s);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: `You are applying user-approved text replacements to a resume. Your job is purely mechanical:
- For sections marked "Apply replacements": locate the TARGET text exactly and replace it with USE INSTEAD. Touch nothing else in that section.
- For sections marked "No edits": output the content byte-for-byte. Do not rephrase, reorder, or alter punctuation.
- The Header section is always passed through unchanged (you will not see its content — it will be reattached by the system).
Call the apply_edits tool with the body sections only (no Header).`,
    tools: [
      {
        name: 'apply_edits',
        description: 'Submit all non-header sections with edits applied.',
        input_schema: {
          type: 'object' as const,
          properties: {
            sections: {
              type: 'array' as const,
              items: bodySectionSchema,
              description: 'All non-header sections, in original order.',
            },
          },
          required: ['sections'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'apply_edits' },
    messages: [
      {
        role: 'user',
        content: `Apply edits to these resume sections:\n\n${sectionDescriptions.join('\n\n---\n\n')}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No tool_use in apply_edits response');

  const { sections: editedBody } = toolUse.input as { sections: { title: string; content: string }[] };

  // Rebuild full sections array: header first (unchanged), then edited body
  const result: ResumeSection[] = [];
  if (headerSection) result.push(headerSection);
  for (const s of editedBody) result.push({ title: s.title, content: s.content });
  return result;
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
- Do not reorder bullets or restructure sections.
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
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    return (result as { numpages?: number }).numpages ?? 1;
  } catch {
    // Fallback: count /Type /Page entries in the raw bytes
    const str = pdfBuffer.toString('latin1');
    const matches = str.match(/\/Type\s*\/Page[^s]/g);
    return matches ? matches.length : 1;
  }
}

// ─── render to PDF ────────────────────────────────────────────────────────────

async function renderToPdf(sections: ResumeSection[]): Promise<Buffer> {
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const { ATSTemplate } = await import('@/lib/atsTemplate');
  // renderToBuffer types require DocumentProps on the element; cast via unknown since
  // ATSTemplate is a wrapper component that returns a <Document> internally.
  const element = React.createElement(ATSTemplate, { sections }) as unknown as React.ReactElement<{ title?: string }>;
  return renderToBuffer(element);
}

// ─── route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let resume: ParsedResume;
  let originalPageCount: number;
  let resolvedSuggestions: ResolvedSuggestion[];

  try {
    const body = await req.json();
    resume = body.resume;
    originalPageCount = body.originalPageCount ?? 1;
    resolvedSuggestions = body.resolvedSuggestions ?? [];
    if (!resume?.sections) throw new Error('missing resume');
  } catch {
    return NextResponse.json(
      { error: 'invalid_request', message: 'Missing or invalid request body.' },
      { status: 400 }
    );
  }

  try {
    // Step 1: Apply accepted edits
    let finalSections: ResumeSection[];
    if (resolvedSuggestions.length === 0) {
      finalSections = resume.sections;
    } else {
      finalSections = await applyEditsWithClaude(resume.sections, resolvedSuggestions);
    }

    // Step 2: Render to PDF and check page count
    let pdfBuffer = await renderToPdf(finalSections);
    let finalPageCount = await countPdfPages(pdfBuffer);

    // Step 3: Trim pass if the rendered document exceeds the original page count
    let trimApplied = false;
    let trimChanges: TrimChange[] = [];
    let pageCountExceeded = false;

    if (finalPageCount > originalPageCount) {
      const trimResult = await trimSectionsWithClaude(finalSections);
      finalSections = trimResult.sections;
      trimChanges = trimResult.changes;
      trimApplied = true;

      // Re-render after trim
      pdfBuffer = await renderToPdf(finalSections);
      finalPageCount = await countPdfPages(pdfBuffer);

      if (finalPageCount > originalPageCount) {
        pageCountExceeded = true;
      }
    }

    const pdfBase64 = pdfBuffer.toString('base64');

    return NextResponse.json({
      pdfBase64,
      finalPageCount,
      originalPageCount,
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
