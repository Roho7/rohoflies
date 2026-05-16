import { NextRequest, NextResponse } from 'next/server';
import { summarizeTranscript } from '@/lib/openrouter';

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();
    if (!transcript) return NextResponse.json({ error: 'transcript required' }, { status: 400 });
    const result = await summarizeTranscript(transcript);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
