'use client';

import { useState, useRef } from 'react';
import { Upload, FileAudio } from 'lucide-react';
import MeetingRow from '@/components/MeetingRow';
import { Meeting } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { createClient } from '@/utils/supabase/client';
import { compressToMp3 } from '@/lib/compress-browser';
import { useMeetings } from '@/context/MeetingsContext';

const ACCEPTED = '.mp3,.wav,.mp4,.m4a,.mov,.avi,.mkv,.webm,.flac,.ogg,.aac';
const NEEDS_COMPRESSION_RE = /\.(mp4|mov|avi|mkv|webm|flac|ogg|wav)$/i;
const SIZE_THRESHOLD = 5 * 1024 * 1024;

export default function UploadsPage() {
  const { meetings, addMeeting, updateMeeting, deleteMeeting } = useMeetings();
  const uploads = meetings.filter((m) => m.entity_type === 'upload');

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [compressionPct, setCompressionPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setTitle(baseName);
    setPendingFile(file);
    setError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleSubmit() {
    if (!pendingFile || !title.trim()) return;

    setLoading(true);
    setCompressionPct(null);
    setError(null);

    try {
      let fileToUpload = pendingFile;
      const needsCompression = NEEDS_COMPRESSION_RE.test(pendingFile.name) || pendingFile.size > SIZE_THRESHOLD;

      if (needsCompression) {
        fileToUpload = await compressToMp3(pendingFile, (stage, pct) => {
          setStatus(stage);
          if (pct !== undefined) setCompressionPct(pct);
        });
        setCompressionPct(null);
      }

      setStatus('Uploading...');
      const supabase = createClient();
      const storagePath = `recordings/${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;

      const { error: uploadError } = await supabase.storage
        .from('meetings')
        .upload(storagePath, fileToUpload, { upsert: true });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const tempId = `optimistic-${Date.now()}`;
      const optimisticMeeting: Meeting = {
        id: tempId,
        title: title.trim(),
        audio_path: '',
        video_path: null,
        duration_sec: null,
        transcript: null,
        summary: null,
        key_points: null,
        action_items: null,
        decisions: null,
        status: 'pending',
        entity_type: 'upload',
        file_type: 'audio',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      addMeeting(optimisticMeeting);
      setPendingFile(null);
      setTitle('');
      setLoading(false);
      setStatus('');

      fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: optimisticMeeting.title,
          storagePath,
          fileName: fileToUpload.name,
          fileSize: fileToUpload.size,
          entityType: 'upload',
          fileType: 'audio',
        }),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          updateMeeting(tempId, { status: 'failed' });
          return;
        }
        // Replace optimistic row with real meeting — context polling takes it from here
        updateMeeting(tempId, { ...data });
      }).catch(() => {
        updateMeeting(tempId, { status: 'failed' });
      });

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setLoading(false);
      setStatus('');
      setCompressionPct(null);
    }
  }

  return (
    <div className="max-w-full p-4 md:p-12 mx-auto space-y-6">

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-14 flex flex-col items-center text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-purple-400 bg-purple-50'
            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/40 bg-white'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
          <Upload size={22} className="text-purple-600" />
        </div>
        <p className="text-sm font-semibold text-gray-800 mb-1">Upload a file to generate a transcript</p>
        <p className="text-xs text-gray-400 mb-5">MP3, WAV, M4A, AAC, FLAC, OGG · MP4, MOV, AVI, MKV, WebM</p>
        <Button
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        >
          Browse Files
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {/* Recent uploads */}
      {uploads.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center text-gray-400">
          <FileAudio size={32} className="mb-2 opacity-40" />
          <p className="text-sm">You have no recent uploads!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          {uploads.map((meeting) => (
            <MeetingRow key={meeting.id} meeting={meeting} onDelete={() => deleteMeeting(meeting.id)} />
          ))}
        </div>
      )}

      {/* Title dialog */}
      <Dialog open={!!pendingFile} onOpenChange={(open) => { if (!open && !loading) { setPendingFile(null); setTitle(''); setError(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Name this meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-sm text-gray-500 bg-gray-50 rounded-md px-3 py-2 truncate">
              {pendingFile?.name}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="upload-title">Meeting title</Label>
              <Input
                id="upload-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q2 planning sync"
                disabled={loading}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {loading && (
              <div className="space-y-1.5">
                <p className="text-sm text-gray-500">{status}</p>
                {compressionPct !== null && (
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${compressionPct}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setPendingFile(null); setTitle(''); setError(null); }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleSubmit}
              disabled={loading || !title.trim()}
            >
              {loading ? status || 'Processing...' : 'Upload & Transcribe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
