import OpenAI from 'openai';

export const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://rohoflies.app',
    'X-Title': 'Rohoflies',
  },
});

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  actionItems: { task: string; owner: string }[];
  decisions: string[];
}

const PROMPT_TEMPLATE = `You are summarizing a meeting transcript. Return ONLY valid JSON matching this schema, with no preamble or markdown fences:

{
  "summary": "2-3 sentence overview of the meeting",
  "keyPoints": ["bullet", "bullet"],
  "actionItems": [{ "task": "...", "owner": "name or 'unassigned'" }],
  "decisions": ["decision made"]
}

If the transcript is too short or unclear, return empty arrays rather than inventing content.

Transcript:
<<<
{TRANSCRIPT}
>>>`;

export async function summarizeTranscript(transcript: string): Promise<SummaryResult> {
  const prompt = PROMPT_TEMPLATE.replace('{TRANSCRIPT}', transcript);

  const completion = await openrouter.chat.completions.create({
    model: 'google/gemini-3.1-flash-lite',
    messages: [{ role: 'user', content: prompt }],  
  });

  const text = completion.choices[0].message.content ?? '';
  console.log('[openrouter] summarize raw response:', text.slice(0, 300));

  try {
    return JSON.parse(text);
  } catch {
    console.error('[openrouter] failed to parse summary JSON:', text);
    return { summary: text, keyPoints: [], actionItems: [], decisions: [] };
  }
}
