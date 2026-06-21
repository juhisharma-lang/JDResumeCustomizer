import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { ParsedResume, Verdict, ResumeSection } from '@/types';

const client = new Anthropic();

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'to', 'for', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'shall', 'can', 'not', 'no', 'nor', 'but', 'at',
  'by', 'from', 'up', 'about', 'into', 'through', 'during', 'that',
  'this', 'these', 'those', 'it', 'its', 'on', 'as', 'if', 'so',
  'yet', 'both', 'each', 'more', 'most', 'other', 'some', 'such',
  'than', 'too', 'very', 'just', 'also', 'us', 'our', 'we', 'you',
  'your', 'they', 'their', 'he', 'she', 'his', 'her', 'who', 'which',
  'what', 'when', 'where', 'how', 'all', 'any', 'few', 'only', 'own',
  'same', 'then', 'there', 'here', 'per', 'new', 'work', 'use',
]);

function extractWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function keywordOverlap(jdText: string, resumeText: string): number {
  const jdWords = extractWords(jdText);
  const resumeWords = extractWords(resumeText);
  if (jdWords.size === 0) return 0;
  let matches = 0;
  Array.from(jdWords).forEach((w) => {
    if (resumeWords.has(w)) matches++;
  });
  return Math.round((matches / jdWords.size) * 100);
}

function resumeToText(resume: ParsedResume): string {
  return resume.sections
    .map((section: ResumeSection) => {
      if ('data' in section) {
        const d = section.data;
        return [d.name, d.title, d.location].filter(Boolean).join(' ');
      }
      return section.content;
    })
    .join(' ');
}

export async function POST(req: NextRequest) {
  let jdText: string;
  let resume: ParsedResume;

  try {
    const body = await req.json();
    jdText = body.jdText;
    resume = body.resume;
    if (!jdText || !resume) throw new Error('missing fields');
  } catch {
    return NextResponse.json(
      { error: 'invalid_request', message: 'Missing jdText or resume in request body.' },
      { status: 400 }
    );
  }

  const resumeText = resumeToText(resume);
  const overlapPct = keywordOverlap(jdText, resumeText);

  const sectionsText = resume.sections
    .map((s: ResumeSection) => {
      if ('data' in s) {
        const d = s.data;
        return `HEADER\nName: ${d.name}\nTitle: ${d.title ?? 'N/A'}\nLocation: ${d.location ?? 'N/A'}`;
      }
      return `${s.title.toUpperCase()}\n${s.content}`;
    })
    .join('\n\n');

  const userPrompt = `A candidate's resume and a job description are provided below. A preliminary keyword overlap analysis found that ${overlapPct}% of meaningful words in the job description appear in the resume. Use this as one grounding signal — not the sole decision.

Make an overall, holistic judgment. Consider career trajectory, depth of relevant experience, seniority alignment, industry fit, and how well the candidate's background positions them for this specific role. Do not score sections in isolation.

When flagging caveats in your reasoning, label each one as either a positioning gap (the resume's current framing — its summary, objective, or title line — targets a different role than this JD, but the underlying experience is relevant; fixable through rewriting that framing) or a structural gap (the candidate genuinely lacks qualifications, scope of experience, or skills the JD requires; not addressable through editing). Framing mismatches are real and worth surfacing, but must be labeled as positioning gaps so the candidate knows they can be resolved — not conflated with missing qualifications.

---
JOB DESCRIPTION:
${jdText.slice(0, 8000)}

---
CANDIDATE RESUME:
${sectionsText.slice(0, 8000)}

---
Call submit_verdict with your overall recommendation.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system:
        'You are a senior talent advisor who evaluates job fit holistically. You consider career trajectory, experience depth, seniority alignment, and overall positioning — not a checklist of keyword matches. When you identify gaps or caveats, distinguish between two kinds: positioning gaps (the resume\'s stated target, summary, or title line aims at a different role than this JD, but the underlying experience is relevant — fixable through reframing) and structural gaps (missing qualifications, experience depth, or skills the JD requires that editing alone cannot address). Both are worth naming. Label each clearly so the candidate understands what kind of obstacle it is.',
      tools: [
        {
          name: 'submit_verdict',
          description:
            'Submit the final holistic verdict on whether the candidate should apply for this job.',
          input_schema: {
            type: 'object' as const,
            properties: {
              verdict: {
                type: 'string',
                enum: ['skip', 'apply_conditionally', 'apply'],
                description:
                  '"apply" = strong overall fit; "apply_conditionally" = meaningful overlap but gaps that can be addressed with targeted edits; "skip" = weak alignment, applying would not be a good use of their time.',
              },
              reasoning: {
                type: 'string',
                description:
                  'A 2–4 sentence plain-language explanation a non-technical person would understand. Explain the overall fit and the key reason for the verdict. If you flag any caveats or gaps, label each one explicitly as either a positioning gap (a framing or targeting mismatch fixable through rewriting) or a structural gap (a missing qualification or experience depth that editing cannot fix).',
              },
            },
            required: ['verdict', 'reasoning'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_verdict' },
      messages: [{ role: 'user', content: userPrompt }],
    });

    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('No tool use in response');
    }

    const input = toolUse.input as { verdict: Verdict; reasoning: string };

    return NextResponse.json({ verdict: input.verdict, reasoning: input.reasoning });
  } catch {
    return NextResponse.json(
      {
        error: 'claude_error',
        message: 'Something went wrong while analyzing job fit. Please try again.',
      },
      { status: 500 }
    );
  }
}
