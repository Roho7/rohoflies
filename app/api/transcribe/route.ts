import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/whisper';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('file') as File | null;
    const audioPath = formData.get('audioPath') as string;
    if (!audioFile && !audioPath) return NextResponse.json({ error: 'file or audioPath required' }, { status: 400 });
    const buffer = audioFile ? Buffer.from(await audioFile.arrayBuffer()) : Buffer.from(audioPath);
    const filename = audioFile?.name ?? 'audio.mp3';
    const { text } = await transcribeAudio(buffer, filename);
    return NextResponse.json({ text });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
