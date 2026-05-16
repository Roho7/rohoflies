'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FileUpload from '@/components/FileUpload';
import Recorder from '@/components/Recorder';
import { createClient } from '@/utils/supabase/client';

type Mode = 'upload' | 'record';

export default function NewMeetingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('upload');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleRecordingComplete(blob: Blob) {
    const f = new File([blob], 'recording.webm', { type: blob.type });
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Please enter a meeting title.'); return; }
    if (!file) { setError('Please upload or record audio.'); return; }

    if (file.size > 500 * 1024 * 1024) {
      setError('File is too large. Maximum size is 500MB.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Step 1: upload file directly to Supabase Storage
      setStatus('Uploading file to storage...');
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'mp3';
      const storagePath = `recordings/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      console.log('[1] starting storage upload', storagePath, file.size, file.type);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('meetings')
        .upload(storagePath, file, { upsert: true });

      console.log('[2] upload result', { uploadData, uploadError });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // Step 2: kick off the server pipeline
      setStatus('Transcribing and summarizing... this may take a minute.');
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          storagePath,
          fileName: file.name,
          fileSize: file.size,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process meeting');

      router.push(`/meetings/${data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setLoading(false);
      setStatus('');
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">New Meeting</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Meeting title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Q2 planning sync"
            disabled={loading}
          />
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'upload' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('upload')}
              disabled={loading}
            >
              Upload File
            </Button>
            <Button
              type="button"
              variant={mode === 'record' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('record')}
              disabled={loading}
            >
              Record
            </Button>
          </div>

          {mode === 'upload' && <FileUpload onFileSelected={setFile} />}
          {mode === 'record' && <Recorder onRecordingComplete={handleRecordingComplete} />}

          {file && mode === 'record' && (
            <p className="text-sm text-muted-foreground">Recording ready: {file.name}</p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {loading && (
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            {status}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Create Meeting'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => router.push('/')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </main>
  );
}
