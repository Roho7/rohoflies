import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.from('meetings').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch audio_path before deleting the row
  const { data: meeting } = await supabase.from('meetings').select('audio_path').eq('id', id).single();

  const { error } = await supabase.from('meetings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Delete from Supabase Storage (best-effort — don't fail the request if this errors)
  if (meeting?.audio_path) {
    const { error: storageError } = await supabase.storage.from('meetings').remove([meeting.audio_path]);
    if (storageError) console.error(`[delete] storage cleanup failed for ${meeting.audio_path}:`, storageError.message);
    else console.log(`[delete] removed storage file: ${meeting.audio_path}`);
  }

  return NextResponse.json({ success: true });
}
