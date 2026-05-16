'use client';

import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
}

const ACCEPTED = '.mp3,.wav,.mp4,.m4a,.mov,.avi,.mkv,.webm,.flac,.ogg,.aac';

export default function FileUpload({ onFileSelected }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setSelectedFile(file);
    onFileSelected(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="audio-upload">Audio file</Label>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        {selectedFile ? (
          <div>
            <p className="font-medium text-sm">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB — click to change
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground">Drag & drop an audio or video file here, or click to browse</p>
            <p className="text-xs text-muted-foreground/70 mt-1">MP3, WAV, M4A, AAC, FLAC, OGG · MP4, MOV, AVI, MKV, WebM</p>
          </div>
        )}
      </div>
      <Input
        id="audio-upload"
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
  );
}
