import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { transcribeAudio } from '@/lib/whisper';
import { summarizeTranscript } from '@/lib/openrouter';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function log(meetingId: string, step: string, detail?: string) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [meeting:${meetingId}] ${step}${detail ? ` — ${detail}` : ''}`);
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  console.log('POST /api/meetings hit');
  const supabase = await createClient();
  console.log('supabase client created');

  const { title, storagePath, fileName, fileSize, entityType, fileType } = await req.json();
  console.log('body parsed', { title, storagePath });

  if (!title || !storagePath) {
    return NextResponse.json({ error: 'title and storagePath required' }, { status: 400 });
  }

  const meetingId = uuidv4();
  log(meetingId, 'PIPELINE start', `"${title}" | storage: ${storagePath} | size: ${fileSize ? (fileSize / 1024).toFixed(1) + ' KB' : 'unknown'}`);

  const ext = storagePath.split('.').pop()?.toLowerCase() ?? '';
  const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);

  // Download file from Supabase Storage into memory
  log(meetingId, 'DOWNLOAD from Supabase Storage');
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('meetings')
    .download(storagePath);

  if (downloadError || !fileData) {
    log(meetingId, 'DOWNLOAD failed', downloadError?.message);
    return NextResponse.json({ error: `Storage download failed: ${downloadError?.message}` }, { status: 500 });
  }
  const fileBuffer = Buffer.from(await fileData.arrayBuffer());
  log(meetingId, 'DOWNLOAD done', `${(fileBuffer.length / 1024).toFixed(1)} KB`);

  // Create DB row with placeholder audio_path; will be updated after transcription
  const { error: insertError } = await supabase.from('meetings').insert({
    id: meetingId,
    title,
    audio_path: '',
    video_path: isVideo ? storagePath : null,
    status: 'pending',
    entity_type: entityType ?? 'upload',
    file_type: fileType ?? 'audio',
  });
  if (insertError) {
    log(meetingId, 'DB insert failed', insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  log(meetingId, 'DB row created');

  try {
    log(meetingId, 'TRANSCRIBE starting');
    await supabase.from('meetings').update({ status: 'transcribing' }).eq('id', meetingId);
    const t0 = Date.now();
    const { text: transcript, audioBuffer } = await transcribeAudio(fileBuffer, fileName ?? storagePath.split('/').pop());
    log(meetingId, 'TRANSCRIBE done', `${transcript.length} chars in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

    // Upload compressed audio to Supabase Storage
    const audioStoragePath = `audio/${meetingId}.mp3`;
    log(meetingId, 'UPLOAD audio to storage', audioStoragePath);
    const { error: uploadError } = await supabase.storage
      .from('meetings')
      .upload(audioStoragePath, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
    if (uploadError) {
      log(meetingId, 'UPLOAD audio failed', uploadError.message);
      // Non-fatal — continue without audio_path
    } else {
      log(meetingId, 'UPLOAD audio done');
    }

    log(meetingId, 'SUMMARIZE starting');
    await supabase.from('meetings').update({
      status: 'summarizing',
      transcript,
      audio_path: uploadError ? '' : audioStoragePath,
    }).eq('id', meetingId);
    const t1 = Date.now();
    const summary = await summarizeTranscript(transcript);
    log(meetingId, 'SUMMARIZE done', `${summary.keyPoints.length} key points, ${summary.actionItems.length} action items in ${((Date.now() - t1) / 1000).toFixed(1)}s`);

    await supabase.from('meetings').update({
      status: 'done',
      summary: summary.summary,
      key_points: summary.keyPoints,
      action_items: summary.actionItems,
      decisions: summary.decisions,
      updated_at: new Date().toISOString(),
    }).eq('id', meetingId);
    log(meetingId, 'DONE pipeline complete');
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error(`[meeting:${meetingId}] PIPELINE ERROR:`, message);
    if (stack) console.error(stack);
    log(meetingId, 'FAILED', message);
    await supabase.from('meetings').update({ status: 'failed', summary: message }).eq('id', meetingId);
  }

  return NextResponse.json({ id: meetingId });
}
