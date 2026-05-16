'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Meeting } from '@/types';
import { Upload, Mic, Video, Music, Sparkles } from 'lucide-react';
import AudioPlayer from '@/components/AudioPlayer';
import { useMeetings } from '@/context/MeetingsContext';

type Tab = 'summary' | 'transcript';

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { meetings } = useMeetings();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [tab, setTab] = useState<Tab>('summary');

  // Try context first, then fetch directly
  useEffect(() => {
    const fromCtx = meetings.find((m) => m.id === id);
    if (fromCtx) { setMeeting(fromCtx); return; }
    fetch(`/api/meetings/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setMeeting(data); });
  }, [id, meetings]);

  if (!meeting) return null;

  const date = new Date(meeting.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  const keyPoints = meeting.key_points as string[] | null;
  const actionItems = meeting.action_items as { task: string; owner: string }[] | null;
  const decisions = meeting.decisions as string[] | null;
  const hasAudio = !!(meeting.status === 'done' && meeting.audio_path);

  const summaryContent = (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      {/* Title row */}
      <div className="flex items-start gap-4 mb-3">
        <h1 className="text-2xl font-bold text-gray-900 flex-1">{meeting.title}</h1>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-emerald-600 shrink-0">
          {meeting.file_type === 'video' ? <><Video size={14} /> Video</> : <><Music size={14} /> Audio</>}
        </span>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400 mb-8">
        <div className="w-6 h-6 rounded bg-[#b5451b] flex items-center justify-center text-white text-xs font-semibold">R</div>
        <span>User</span>
        <span>·</span>
        <span>{date}</span>
        <span>·</span>
        {meeting.entity_type === 'recording' ? (
          <><Mic size={13} /> Live recording</>
        ) : (
          <><Upload size={13} /> Upload</>
        )}
      </div>

      {/* Status messages */}
      {meeting.status === 'failed' && (
        <div className="rounded-lg bg-red-50 border border-red-100 p-4 mb-6 text-sm text-red-600">
          Processing failed: {meeting.summary}
        </div>
      )}
      {['pending', 'transcribing', 'summarizing'].includes(meeting.status) && (
        <div className="rounded-lg bg-gray-50 p-6 text-center text-gray-400 text-sm mb-6">
          {meeting.status === 'transcribing'
            ? 'Transcribing audio...'
            : meeting.status === 'summarizing'
            ? 'Generating summary...'
            : 'Starting...'}{' '}
          — refresh in a moment.
        </div>
      )}

      {/* Summary */}
      {meeting.status === 'done' && (
        <div className="space-y-8">
          <div className="flex items-center gap-2 text-purple-600 font-medium text-sm mb-4">
            <Sparkles size={15} />
            General Summary
          </div>
          {meeting.summary && <p className="text-sm text-gray-700 leading-relaxed">{meeting.summary}</p>}

          {keyPoints && keyPoints.length > 0 && (
            <ul className="space-y-2">
              {keyPoints.map((pt, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-purple-400 mt-0.5">•</span>
                  {pt}
                </li>
              ))}
            </ul>
          )}

          {actionItems && actionItems.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Action Items</h3>
              <div className="space-y-2">
                {actionItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                    <span className="flex-1 text-gray-700">{item.task}</span>
                    <span className="text-gray-400 text-xs">{item.owner}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {decisions && decisions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Decisions</h3>
              <div className="space-y-2">
                {decisions.map((d, i) => (
                  <div key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-green-500 shrink-0">✓</span>
                    {d}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const transcriptContent = (
    <div className="flex-1 overflow-y-auto p-5">
      {meeting.transcript ? (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{meeting.transcript}</p>
      ) : (
        <p className="text-sm text-gray-400 italic">No transcript available.</p>
      )}
    </div>
  );

  return (
    <div className={`flex flex-col h-full ${hasAudio ? 'pb-24' : ''}`}>

      {/* Mobile tabs */}
      <div className="md:hidden flex border-b border-gray-100 shrink-0">
        {(['summary', 'transcript'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Mobile: single panel based on tab */}
      <div className="md:hidden flex-1 overflow-hidden flex flex-col">
        {tab === 'summary' ? summaryContent : transcriptContent}
      </div>

      {/* Desktop: two-column layout */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto border-r border-gray-100">
          {summaryContent}
        </div>
        {(meeting.transcript || meeting.status === 'done') && (
          <div className="w-96 flex flex-col border-l border-gray-100 shrink-0">
            <div className="px-5 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-purple-600 border-b-2 border-purple-600 pb-2">Transcript</span>
            </div>
            {transcriptContent}
          </div>
        )}
      </div>

      {/* Audio player */}
      {hasAudio && <AudioPlayer meetingId={meeting.id} />}
    </div>
  );
}
