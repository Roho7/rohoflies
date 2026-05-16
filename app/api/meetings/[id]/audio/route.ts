import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: meeting } = await supabase.from('meetings').select('audio_path').eq('id', id).single();
  if (!meeting?.audio_path) return NextResponse.json({ error: 'No audio' }, { status: 404 });

  // Return a signed URL valid for 1 hour
  const { data, error } = await supabase.storage.from('meetings').createSignedUrl(meeting.audio_path, 3600);
  if (error || !data) return NextResponse.json({ error: 'Could not create signed URL' }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}
