'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/utils/supabase/client';

export default function RecordPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function formatTime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  async function startRecording() {
    setError(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];

    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => stream.getTracks().forEach((t) => t.stop());

    mr.start();
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }

  async function stopAndSave() {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);

    // Wait for onstop to fire and chunks to be ready
    await new Promise<void>((resolve) => {
      if (mediaRecorderRef.current) {
        const original = mediaRecorderRef.current.onstop;
        mediaRecorderRef.current.onstop = (e) => {
          original?.call(mediaRecorderRef.current!, e);
          resolve();
        };
      } else resolve();
    });

    setSubmitting(true);
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
      const meetingTitle = title.trim() || `Recording ${new Date().toLocaleString()}`;

      const supabase = createClient();
      const storagePath = `recordings/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('meetings')
        .upload(storagePath, file, { upsert: false });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: meetingTitle, storagePath, fileName: 'recording.webm', fileSize: blob.size, entityType: 'recording', fileType: 'audio' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process meeting');

      router.push(`/meetings/${data.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>
        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-semibold">
          R
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4">
        <h1 className="text-lg font-medium text-gray-800">New Recording</h1>

        {/* Mic icon — pulses while recording */}
        <div className={`p-4 rounded-full transition-all ${isRecording ? 'bg-purple-100 animate-pulse' : 'bg-gray-100'}`}>
          <Mic size={32} className={isRecording ? 'text-purple-600' : 'text-gray-400'} />
        </div>

        {/* Title input */}
        <Input
          placeholder="Recording Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isRecording || submitting}
          className="max-w-sm text-center rounded-full border-gray-200 focus-visible:ring-purple-400"
        />

        {/* Timer */}
        <span className="text-6xl font-semibold tracking-tight text-gray-800 tabular-nums">
          {formatTime(elapsed)}
        </span>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Action button */}
        <div className="flex flex-col items-center gap-3 w-full max-w-sm">
          {!isRecording && !submitting && (
            <Button
              onClick={startRecording}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 text-base rounded-lg gap-2"
            >
              <Mic size={18} />
              Start Recording
            </Button>
          )}
          {isRecording && (
            <Button
              onClick={stopAndSave}
              className="w-full bg-red-500 hover:bg-red-600 text-white h-12 text-base rounded-lg"
            >
              Stop & Save
            </Button>
          )}
          {submitting && (
            <Button disabled className="w-full h-12 text-base rounded-lg">
              Processing...
            </Button>
          )}
          <p className="text-xs text-gray-400 text-center">
            Make sure to get participants consent when recording.
          </p>
        </div>
      </div>
    </>
  );
}
