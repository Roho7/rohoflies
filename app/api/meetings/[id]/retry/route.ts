import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { transcribeAudio } from '@/lib/whisper';
import { summarizeTranscript } from '@/lib/openrouter';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function log(id: string, step: string, detail?: string) {
  console.log(`[${new Date().toISOString()}] [meeting:${id}] RETRY ${step}${detail ? ` — ${detail}` : ''}`);
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: meeting, error: fetchError } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  if (meeting.status !== 'failed') {
    return NextResponse.json({ error: 'Only failed meetings can be retried' }, { status: 400 });
  }

  // For retry: prefer original video if available, otherwise use audio_path
  const downloadPath = meeting.video_path ?? meeting.audio_path;
  log(id, 'starting', `download path: ${downloadPath}`);

  // Download from Supabase Storage
  log(id, 'DOWNLOAD');
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('meetings')
    .download(downloadPath);

  if (downloadError || !fileData) {
    log(id, 'DOWNLOAD failed', downloadError?.message);
    return NextResponse.json({ error: `Storage download failed: ${downloadError?.message}` }, { status: 500 });
  }

  const fileBuffer = Buffer.from(await fileData.arrayBuffer());
  const fileName = downloadPath.split('/').pop() ?? 'audio.mp3';
  log(id, 'DOWNLOAD done', `${(fileBuffer.length / 1024).toFixed(1)} KB`);

  try {
    log(id, 'TRANSCRIBE starting');
    await supabase.from('meetings').update({ status: 'transcribing', summary: null }).eq('id', id);
    const t0 = Date.now();
    const { text: transcript, audioBuffer } = await transcribeAudio(fileBuffer, fileName);
    log(id, 'TRANSCRIBE done', `${transcript.length} chars in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

    // Upload compressed audio
    const audioStoragePath = `audio/${id}.mp3`;
    log(id, 'UPLOAD audio to storage', audioStoragePath);
    const { error: uploadError } = await supabase.storage
      .from('meetings')
      .upload(audioStoragePath, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
    if (uploadError) log(id, 'UPLOAD audio failed', uploadError.message);
    else log(id, 'UPLOAD audio done');

    log(id, 'SUMMARIZE starting');
    await supabase.from('meetings').update({
      status: 'summarizing',
      transcript,
      audio_path: uploadError ? meeting.audio_path : audioStoragePath,
    }).eq('id', id);
    const t1 = Date.now();
    const summary = await summarizeTranscript(transcript);
    log(id, 'SUMMARIZE done', `${((Date.now() - t1) / 1000).toFixed(1)}s`);

    await supabase.from('meetings').update({
      status: 'done',
      summary: summary.summary,
      key_points: summary.keyPoints,
      action_items: summary.actionItems,
      decisions: summary.decisions,
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    log(id, 'DONE');
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    log(id, 'FAILED', message);
    await supabase.from('meetings').update({ status: 'failed', summary: message }).eq('id', id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
