import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { openrouter } from '@/lib/openrouter';
import { Meeting } from '@/types';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';

const SYSTEM_PROMPT = `You are a meeting preparation assistant. You help users prepare for upcoming meetings by analyzing their past meeting history.

You have access to a tool that can search past meetings by keyword. Use it whenever the user asks about specific topics, people, decisions, or action items from past meetings.

Format rules for your responses:
- Use markdown: **bold** for key terms/names/metrics, bullet points for lists
- Use ## headers to organize longer responses into sections
- Be concise but specific — reference actual details from meetings when available
- If you search and find no results, say so honestly

The user is preparing for: "Fireflies AI — Future Scope Discussion" — a meeting about the future roadmap, potential features, and strategic direction of Fireflies.ai.`;

const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_meetings',
      description: 'Search past meetings by keyword. Searches across meeting summaries using fuzzy text matching. Use this to find meetings about specific topics, people, or decisions.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search keyword or phrase to look for in meeting summaries',
          },
        },
        required: ['query'],
      },
    },
  },
];

function formatMeetingForContext(meeting: Meeting): string {
  const parts = [`**${meeting.title}** (${new Date(meeting.created_at).toLocaleDateString()})`];
  if (meeting.summary) parts.push(`Summary: ${meeting.summary}`);
  if (meeting.key_points?.length) parts.push(`Key Points: ${meeting.key_points.join('; ')}`);
  if (meeting.action_items?.length) {
    const items = meeting.action_items.map(ai => `${ai.task} (${ai.owner})`).join('; ');
    parts.push(`Action Items: ${items}`);
  }
  if (meeting.decisions?.length) parts.push(`Decisions: ${meeting.decisions.join('; ')}`);
  return parts.join('\n');
}

async function searchMeetings(query: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('meetings')
    .select('title, summary, key_points, action_items, decisions, created_at')
    .eq('status', 'done')
    .ilike('summary', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) return `Error searching meetings: ${error.message}`;
  if (!data || data.length === 0) return `No meetings found matching "${query}".`;

  return (data as Meeting[])
    .map((m, i) => `--- Result ${i + 1} ---\n${formatMeetingForContext(m)}`)
    .join('\n\n');
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json() as { messages: ChatCompletionMessageParam[] };

    const fullMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    let completion = await openrouter.chat.completions.create({
      model: 'google/gemini-3.5-flash',
      messages: fullMessages,
      tools: TOOLS,
    });

    let assistantMessage = completion.choices[0].message;

    // Tool call loop — handle up to 5 rounds
    let rounds = 0;
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && rounds < 5) {
      rounds++;
      fullMessages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== 'function') continue;
        if (toolCall.function.name === 'search_meetings') {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await searchMeetings(args.query);
          fullMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          });
        }
      }

      completion = await openrouter.chat.completions.create({
        model: 'google/gemini-3.5-flash',
        messages: fullMessages,
        tools: TOOLS,
      });

      assistantMessage = completion.choices[0].message;
    }

    // If content is still empty after tool use, make one final call without tools to force a text response
    if (!assistantMessage.content && rounds > 0) {
      fullMessages.push(assistantMessage);
      completion = await openrouter.chat.completions.create({
        model: 'google/gemini-3.5-flash',
        messages: fullMessages,
      });
      assistantMessage = completion.choices[0].message;
    }

    return NextResponse.json({
      content: assistantMessage.content ?? '',
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
