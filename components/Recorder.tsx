'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface RecorderProps {
  onRecordingComplete: (blob: Blob) => void;
}

export default function Recorder({ onRecordingComplete }: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      onRecordingComplete(blob);
      stream.getTracks().forEach((t) => t.stop());
    };

    mr.start();
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  }

  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {isRecording && (
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-2xl font-mono">{formatted}</span>
        </div>
      )}
      {!isRecording ? (
        <Button onClick={startRecording} variant="default">
          Start Recording
        </Button>
      ) : (
        <Button onClick={stopRecording} variant="destructive">
          Stop & Save
        </Button>
      )}
      {!isRecording && seconds === 0 && (
        <p className="text-sm text-muted-foreground">Click to start recording from your microphone</p>
      )}
      {!isRecording && seconds > 0 && (
        <p className="text-sm text-muted-foreground">Recording saved ({formatted})</p>
      )}
    </div>
  );
}
