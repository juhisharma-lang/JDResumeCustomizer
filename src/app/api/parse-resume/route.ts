import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { DocxParagraphPosition } from '@/types';

const client = new Anthropic();

// Build the system prompt, optionally injecting pre-extracted hyperlinks for docx files
function buildSystemPrompt(extractedLinks?: { label: string; url: string }[]): string {
  const linksInstruction = extractedLinks && extractedLinks.length > 0
    ? `- "links": an array of { "label": string, "url": string | null } objects for contact/social links only (LinkedIn, Portfolio, GitHub, personal website, etc.). The following hyperlinks were extracted directly from the document source and their URLs are exact — use them verbatim for this field only:\n${extractedLinks.map(l => `  { "label": "${l.label}", "url": "${l.url}" }`).join('\n')}\n  Match each contact/social link label (e.g. "LinkedIn", "Portfolio", "GitHub") to the closest entry above and use that url value. Only set "url" to null for a contact link type that does not appear in this list at all. Do NOT use this list to modify or append URL text to any other section's content — all section content must be taken from the raw extracted text verbatim.`
    : `- "links": an array of { "label": string, "url": string | null } objects, one per link found (LinkedIn, portfolio, GitHub, personal website, etc.). Use the actual URL from the source text. The source text may contain markdown-style links in the form [Label](https://...) — when you see this pattern, use the text inside the square brackets as the label and the URL inside the parentheses as the url value. Only set "url" to null when no URL genuinely exists anywhere in the source text for that link — never write an explanatory phrase in place of a URL, and never guess or invent a URL that is not explicitly present in the source text.`;

  return `You are a resume parser. You receive raw text extracted from a resume file.
Organize the content into clearly labeled, standard ATS-friendly sections.

Always capture a "Header" section first, before anything else. The Header uses a structured "data" field instead of a freeform "content" string. It must contain:
- "name": the candidate's full name
- "title": their professional title or tagline if one appears, otherwise null
- "phone": phone number as a plain string if present, otherwise null
- "email": email address if present, otherwise null
- "location": city, state, or location string if present, otherwise null
${linksInstruction}

All other sections use a freeform "content" string as before. Never drop header information.

Standard section names to use (after Header):
- "Summary" (covers: objective, profile, about me, professional summary, etc.)
- "Work Experience" (covers: experience, professional history, my journey, career history, etc.)
- "Education"
- "Skills" (covers: technical skills, competencies, tools, what I know, etc.)
- "Certifications" (if present)
- "Projects" (if present)
- "Volunteer Work" (if present)
- "Publications" (if present)
- "Awards & Honors" (if present)

Map any creative or unconventional section headers to the closest standard equivalent.
For example, "My Journey" → "Work Experience", "What I Know" → "Skills".
Only include sections that are genuinely present in the resume.
Preserve all detail — do not summarize or omit content.

Respond with a valid JSON object in exactly this format with no preamble or explanation:
{
  "sections": [
    {
      "title": "Header",
      "data": {
        "name": "Jane Smith",
        "title": "Senior Product Designer",
        "phone": "+1 555-123-4567",
        "email": "jane@example.com",
        "location": "San Francisco, CA",
        "links": [
          { "label": "LinkedIn", "url": "https://linkedin.com/in/janesmith" },
          { "label": "Portfolio", "url": "https://janesmith.com" },
          { "label": "GitHub", "url": null }
        ]
      }
    },
    { "title": "Summary", "content": "..." },
    { "title": "Work Experience", "content": "..." }
  ]
}`;
}

// Walk mammoth's HTML to find heading elements and estimate their paragraph index in the original DOCX.
// The index is approximate (each block-level tag counts as one paragraph), which is good enough
// for the future python-docx service to narrow down where to look.
function extractDocxParagraphPositions(html: string): DocxParagraphPosition[] {
  const positions: DocxParagraphPosition[] = [];
  const headingRe = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(html)) !== null) {
    const beforeHeading = html.slice(0, match.index);
    // Count preceding block-level opening tags as an approximate paragraph index
    const preceding = beforeHeading.match(/<(h[1-6]|p|li)[>\s]/gi) ?? [];
    const headingText = match[2].replace(/<[^>]+>/g, '').trim();
    if (headingText) {
      positions.push({ sectionHeading: headingText, paragraphIndex: preceding.length });
    }
  }
  return positions;
}

// Convert mammoth HTML to plain text, preserving list item bullets as "- "
function htmlToPlainText(html: string): string {
  return html
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<\/p>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Extract all hyperlinks from mammoth's HTML output as { label, url } pairs
function extractLinksFromHtml(html: string): { label: string; url: string }[] {
  const links: { label: string; url: string }[] = [];
  const anchorRe = /<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(html)) !== null) {
    const url = match[1].trim();
    // Strip nested HTML tags then unescape HTML entities (same set handled in htmlToPlainText)
    const label = match[2]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .trim();
    if (url && label) links.push({ label, url });
  }
  return links;
}

export async function POST(req: NextRequest) {
  // Parse multipart form data
  let file: File;
  try {
    const formData = await req.formData();
    const f = formData.get('file');
    if (!f || typeof f === 'string') throw new Error('no file');
    file = f as File;
  } catch {
    return NextResponse.json(
      { error: 'invalid_request', message: 'No file was received.' },
      { status: 400 }
    );
  }

  // Detect file type from extension and MIME (extension wins since MIME can lie on drag-drop)
  if (!file.name || !file.name.includes('.')) {
    return NextResponse.json(
      { error: 'invalid_request', message: 'The uploaded file must have a .pdf or .docx extension.' },
      { status: 400 }
    );
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  const isPdf =
    ext === 'pdf' || file.type === 'application/pdf';
  const isDocx =
    ext === 'docx' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (!isPdf && !isDocx) {
    return NextResponse.json(
      {
        error: 'unsupported_type',
        message: 'Only .pdf and .docx files are supported.',
      },
      { status: 422 }
    );
  }

  const fileType: 'pdf' | 'docx' = isPdf ? 'pdf' : 'docx';

  // Extract raw text from the file
  let rawText: string;
  let pageCount = 1;
  let docxLinks: { label: string; url: string }[] | undefined;
  let paragraphPositions: DocxParagraphPosition[] | undefined;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (isPdf) {
      // pdf-parse v2 API: PDFParse class with { data } options (see next.config.js for webpack exclusion)
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      rawText = result.text ?? '';
      pageCount = (result as { numpages?: number }).numpages ?? 1;

      if (rawText.trim().length < 30) {
        return NextResponse.json(
          {
            error: 'scanned_pdf',
            message:
              'This PDF appears to be a scanned image rather than a text-based PDF, so we can\'t extract the text. Try uploading a .docx version or a text-based PDF instead.',
          },
          { status: 422 }
        );
      }
    } else {
      const mammoth = await import('mammoth');
      const htmlResult = await mammoth.convertToHtml({ buffer });
      const htmlValue = htmlResult.value ?? '';
      // Derive plain text from HTML so list items keep their "- " bullet markers
      rawText = htmlToPlainText(htmlValue);

      // pageCount for DOCX will be computed after Claude structures the sections (see below);

      // Capture heading positions for the future docx preservation service
      paragraphPositions = extractDocxParagraphPositions(htmlValue);

      // Only extract links from the header area (before the first section heading)
      // so project inline hyperlinks never leak into the Claude links list
      const firstSectionIdx = htmlValue.search(/<h[2-6][\s>]/i);
      const headerHtml = firstSectionIdx > 0 ? htmlValue.slice(0, firstSectionIdx) : htmlValue.slice(0, 3000);
      // Exclude mailto: links — email is captured in its own dedicated header field
      docxLinks = extractLinksFromHtml(headerHtml).filter(
        l => !l.url.toLowerCase().startsWith('mailto:')
      );

      if (rawText.trim().length < 30) {
        return NextResponse.json(
          {
            error: 'empty_file',
            message: "This file appears to be empty or couldn't be read. Please try a different file.",
          },
          { status: 422 }
        );
      }
    }
  } catch {
    return NextResponse.json(
      {
        error: 'parse_failed',
        message:
          "This file couldn't be read. It may be corrupted or in an unexpected format. Please try a different file.",
      },
      { status: 422 }
    );
  }

  // Send extracted text to Claude to organize into sections
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: buildSystemPrompt(docxLinks),
      messages: [{ role: 'user', content: rawText.slice(0, 100_000) }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    // Strip markdown code fences in case Claude wraps the JSON
    const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const structured = JSON.parse(jsonText);

    // For DOCX files, compute real page count by rendering the structured sections through
    // the same ATS template and pdf-parse pipeline used in generate-resume. This replaces
    // the word-count heuristic so the baseline used for overflow detection is accurate.
    if (fileType === 'docx' && Array.isArray(structured?.sections)) {
      try {
        const React = (await import('react')).default;
        const { renderToBuffer } = await import('@react-pdf/renderer');
        const { ATSTemplate } = await import('@/lib/atsTemplate');
        const el = React.createElement(ATSTemplate, { sections: structured.sections }) as unknown as React.ReactElement<{ title?: string }>;
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PDF page-count render timed out')), 30_000)
        );
        const pdfBuf = await Promise.race([renderToBuffer(el), timeout]);
        const { PDFParse } = await import('pdf-parse');
        const parse = PDFParse as unknown as (buf: Buffer) => Promise<{ numpages?: number }>;
        const rendered = await parse(pdfBuf);
        pageCount = rendered.numpages ?? pageCount;
      } catch (err) {
        console.warn('[parse-resume] DOCX real page count render failed, keeping estimate of 1:', err);
      }
    }

    return NextResponse.json({ structured, fileType, pageCount, paragraphPositions });
  } catch (e) {
    console.error('[parse-resume] outer catch:', e);
    return NextResponse.json(
      {
        error: 'claude_error',
        message: 'Something went wrong while analyzing your resume. Please try again.',
      },
      { status: 500 }
    );
  }
}
