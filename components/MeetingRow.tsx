'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Mic, Video, MoreHorizontal, Eye, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Meeting } from '@/types';

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDuration(sec: number | null) {
  if (sec === null || sec === undefined) return '0 min';
  const m = Math.floor(sec / 60);
  return m === 1 ? '1 min' : `${m} min`;
}

function Avatar({ title }: { title: string }) {
  return (
    <div className="w-8 h-8 rounded-md bg-[#b5451b] flex items-center justify-center shrink-0">
      <span className="text-white text-lg font-semibold">{title.charAt(0).toUpperCase()}</span>
    </div>
  );
}

const IN_PROGRESS_STATUSES = new Set(['pending', 'transcribing', 'summarizing']);

function TypeIcon({ meeting }: { meeting: Meeting }) {
  if (IN_PROGRESS_STATUSES.has(meeting.status)) return <Loader2 size={15} className="text-purple-400 animate-spin" />;
  if (meeting.entity_type === 'recording') return <Mic size={15} className="text-gray-400" />;
  if (meeting.file_type === 'video') return <Video size={15} className="text-gray-400" />;
  return null;
}

interface MeetingRowProps {
  meeting: Meeting;
  onDelete?: () => void;
}

export default function MeetingRow({ meeting, onDelete }: MeetingRowProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const date = new Date(meeting.created_at);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = formatTime(meeting.created_at);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${meeting.title}"?`)) return;
    setDeleting(true);
    await fetch(`/api/meetings/${meeting.id}`, { method: 'DELETE' });
    if (onDelete) onDelete();
    else router.refresh();
  }

  async function handleRetry(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setRetrying(true);
    await fetch(`/api/meetings/${meeting.id}/retry`, { method: 'POST' });
    router.refresh();
    setRetrying(false);
  }

  return (
    <div
      className="group flex items-center gap-4 bg-white border border-gray-100 rounded-lg px-3 py-2 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
      onClick={() => router.push(`/meetings/${meeting.id}`)}
    >
      <Avatar title={meeting.title} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-900 truncate">{meeting.title}</span>
          <ChevronRight size={14} className="text-gray-400 shrink-0" />
          <TypeIcon meeting={meeting} />
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-400">
          <span>{dateStr}</span>
          <span>·</span>
          <span>{timeStr}</span>
          {meeting.status === 'failed' && (
            <>
              <span>·</span>
              <span className="text-xs font-medium text-red-400">Failed</span>
            </>
          )}
        </div>
      </div>

      {/* Row menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 shrink-0"
          >
            <MoreHorizontal size={16} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={(e) => { e.stopPropagation(); router.push(`/meetings/${meeting.id}`); }}>
            <Eye size={13} className="text-gray-500" /> View Details
          </DropdownMenuItem>
          {meeting.status === 'failed' && (
            <DropdownMenuItem className="gap-2 cursor-pointer text-amber-600 focus:text-amber-600" disabled={retrying} onClick={handleRetry}>
              <RefreshCw size={13} className={retrying ? 'animate-spin' : ''} />
              {retrying ? 'Retrying…' : 'Retry'}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="gap-2 cursor-pointer text-red-500 focus:text-red-500" disabled={deleting} onClick={handleDelete} variant="destructive">
            <Trash2 size={13} /> {deleting ? 'Deleting…' : 'Delete'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
