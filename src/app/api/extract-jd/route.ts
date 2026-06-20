import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a job description extractor. You receive raw HTML from a web page.
Extract only the actual job description text - the role title, responsibilities, requirements, qualifications, and any other details directly about the job.
Ignore and do not include: navigation menus, cookie banners, ads, promotional content, site headers/footers, apply buttons, social share widgets, or any other page chrome.
If you cannot find any job description content in the HTML, respond with exactly: NO_JD_FOUND
Otherwise respond with just the extracted job description text, cleanly formatted, with no preamble or explanation.`;

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  // Step 1: Fetch the page server-side
  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ResumeSync/1.0)' },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch {
    return NextResponse.json(
      {
        error: 'fetch_failed',
        message:
          "We couldn't load that page. The link may be broken, the site may block automated requests, or it timed out. Try a different URL or paste the job description directly.",
      },
      { status: 422 }
    );
  }

  // Step 2: Ask Claude to extract the job description
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      // Truncate HTML to ~200k chars to stay within token limits
      messages: [{ role: 'user', content: html.slice(0, 200_000) }],
    });

    const extracted =
      response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    if (!extracted || extracted === 'NO_JD_FOUND') {
      return NextResponse.json(
        {
          error: 'no_jd_found',
          message:
            "We couldn't find a job description on that page. The page may require a login, or the content may be dynamically loaded. Try a different URL or paste the job description text directly.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: extracted });
  } catch {
    return NextResponse.json(
      {
        error: 'claude_error',
        message:
          'Something went wrong while analyzing the page. Please try again or paste the job description directly.',
      },
      { status: 500 }
    );
  }
}
