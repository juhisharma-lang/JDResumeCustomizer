import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { ParsedResume, Verdict, ResumeSection } from '@/types';

const client = new Anthropic();

function buildSectionsText(resume: ParsedResume): string {
  return resume.sections
    .map((s: ResumeSection) => {
      if ('data' in s) {
        const d = s.data;
        const lines = [
          `SECTION: Header`,
          `Name: ${d.name}`,
          d.title ? `Current Title: ${d.title}` : null,
          d.location ? `Location: ${d.location}` : null,
          d.email ? `Email: ${d.email}` : null,
        ]
          .filter(Boolean)
          .join('\n');
        return lines;
      }
      return `SECTION: ${s.title}\n${s.content}`;
    })
    .join('\n\n---\n\n');
}

function buildVolumeInstruction(verdict: Verdict, verdictReasoning: string): string {
  if (verdict === 'apply') {
    return `The verdict is "apply" — this is already a strong match.
Generate 2–4 suggestions at most. Focus only on ATS keyword alignment: surface language from the JD that the candidate's existing experience already supports but isn't yet reflected in their resume wording. Do not rewrite bullet points for narrative impact; the resume is already well-positioned. Do not pad the list.

Verdict reasoning (for context): ${verdictReasoning}`;
  }

  if (verdict === 'apply_conditionally') {
    return `The verdict is "apply_conditionally" — there is meaningful overlap but real gaps to address.
Generate 4–8 suggestions. This is where the substantive editing work happens. Prioritise the positioning gaps and framing mismatches explicitly identified in the verdict reasoning below. Help the candidate's existing experience speak more directly to what this role requires. Suggestions should reflect genuine improvements, not cosmetic changes.

Verdict reasoning (for context): ${verdictReasoning}`;
  }

  // skip
  return `The verdict is "skip" — this is a weak match.
Generate 1–3 suggestions at most — minimal surface-level edits only. Do not manufacture a longer list to justify using this feature. If you cannot identify genuinely useful edits without fabricating experience the candidate doesn't have, return fewer suggestions or an empty array. Each rationale must be honest about the limited scope of what editing can achieve here.

Verdict reasoning (for context): ${verdictReasoning}`;
}

export async function POST(req: NextRequest) {
  let jdText: string;
  let resume: ParsedResume;
  let verdict: Verdict;
  let verdictReasoning: string;

  try {
    const body = await req.json();
    jdText = body.jdText;
    resume = body.resume;
    verdict = body.verdict;
    verdictReasoning = body.verdictReasoning;
    if (!jdText || !resume || !verdict || verdictReasoning == null) {
      throw new Error('missing fields');
    }
  } catch {
    return NextResponse.json(
      { error: 'invalid_request', message: 'Missing required fields in request body.' },
      { status: 400 }
    );
  }

  const sectionsText = buildSectionsText(resume);
  const sectionTitles = resume.sections
    .map((s: ResumeSection) => ('data' in s ? 'Header' : s.title))
    .join(', ');
  const volumeInstruction = buildVolumeInstruction(verdict, verdictReasoning);

  const userPrompt = `You are reviewing a candidate's resume against a specific job description to generate targeted edit suggestions.

CRITICAL CONSTRAINT: You may only reword, reposition, or re-emphasise content already present in the resume. Never introduce facts, metrics, tool names, technologies, dates, job titles, or any claim that does not already appear somewhere in the resume's text. If the strongest suggestion for a section would require inventing a number or skill not in the resume, skip that suggestion entirely rather than fabricating the missing piece.

FORMATTING RULE: Never use em dashes (—) or en dashes (–) in any proposed text. Use commas, periods, or semicolons instead.

The resume has these sections: ${sectionTitles}
The "section" field in each suggestion must be one of these exact section names.
The "original" field must be a verbatim excerpt from the resume text above that you are targeting — not a paraphrase.

---
JOB DESCRIPTION:
${jdText.slice(0, 8000)}

---
CANDIDATE RESUME:
${sectionsText.slice(0, 8000)}

---
EDITING GUIDANCE:
${volumeInstruction}

Use the "type" field to classify each suggestion:
- "positioning": the candidate has the relevant experience but the current wording targets a different framing than this JD requires — fixable by reframing or repositioning existing content.
- "substantive": the resume's language misses a specific technical skill or keyword the JD requires that IS already present elsewhere in the resume, and surfacing it more explicitly would strengthen the application.

Call submit_suggestions with your array of suggestions.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system:
        'You are a senior resume editor. Your sole job is to suggest precise, targeted edits that align a candidate\'s resume with a specific job description, without ever inventing facts. You only work with what is already on the page.',
      tools: [
        {
          name: 'submit_suggestions',
          description: 'Submit the array of resume edit suggestions.',
          input_schema: {
            type: 'object' as const,
            properties: {
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    section: {
                      type: 'string',
                      description: 'The exact section title from the resume this suggestion targets.',
                    },
                    original: {
                      type: 'string',
                      description: 'The verbatim text from the resume being replaced.',
                    },
                    proposed: {
                      type: 'string',
                      description: 'The replacement text. Must only use facts, tools, and metrics already present in the resume. Never use em dashes (—) or en dashes (–); use commas, periods, or semicolons instead.',
                    },
                    rationale: {
                      type: 'string',
                      description: 'One or two sentences explaining why this edit helps align the resume to the JD.',
                    },
                    type: {
                      type: 'string',
                      enum: ['positioning', 'substantive'],
                      description: '"positioning" = framing mismatch fixable by reframing existing content; "substantive" = surfaces a keyword or skill already in the resume that the JD explicitly requires.',
                    },
                  },
                  required: ['section', 'original', 'proposed', 'rationale', 'type'],
                },
              },
            },
            required: ['suggestions'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_suggestions' },
      messages: [{ role: 'user', content: userPrompt }],
    });

    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('No tool use in response');
    }

    const input = toolUse.input as { suggestions: unknown[] };

    return NextResponse.json({ suggestions: input.suggestions });
  } catch {
    return NextResponse.json(
      {
        error: 'claude_error',
        message: 'Something went wrong while generating suggestions. Please try again.',
      },
      { status: 500 }
    );
  }
}
