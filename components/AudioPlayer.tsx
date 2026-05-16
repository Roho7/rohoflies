'use client';
import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Download } from 'lucide-react';

export default function AudioPlayer({ meetingId }: { meetingId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetch(`/api/meetings/${meetingId}/audio`)
      .then(r => r.json())
      .then(d => { if (d.url) setUrl(d.url); });
  }, [meetingId]);

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
    setPlaying(!playing);
  }

  function seek(delta: number) {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + delta);
  }

  function cycleSpeed() {
    const speeds = [1, 1.25, 1.5, 2];
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  if (!url) return (
    <div className="fixed bottom-0 left-[240px] right-0 bg-white border-t border-gray-100 px-6 py-3 flex items-center gap-3 text-sm text-gray-400">
      Loading audio...
    </div>
  );

  return (
    <div className="fixed bottom-0 left-[240px] right-0 bg-white border-t border-gray-100 px-6 py-3 flex items-center gap-4 z-10">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
      />
      <span className="text-sm text-gray-500 tabular-nums w-24">{fmt(currentTime)} / {fmt(duration)}</span>
      <button onClick={() => seek(-10)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"><RotateCcw size={16} /></button>
      <button onClick={togglePlay} className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white">
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>
      <button onClick={() => seek(10)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"><RotateCw size={16} /></button>
      <button onClick={cycleSpeed} className="text-xs font-medium text-gray-600 hover:bg-gray-100 px-2 py-1 rounded-lg">{speed}x</button>
      <div className="flex-1 mx-2">
        <input
          type="range"
          min={0}
          max={duration || 1}
          value={currentTime}
          onChange={(e) => {
            const t = parseFloat(e.target.value);
            if (audioRef.current) audioRef.current.currentTime = t;
            setCurrentTime(t);
          }}
          className="w-full accent-purple-600 h-1"
        />
      </div>
      <a href={url} download className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"><Download size={16} /></a>
    </div>
  );
}
