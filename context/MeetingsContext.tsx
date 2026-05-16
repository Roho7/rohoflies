'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Meeting } from '@/types';

interface MeetingsContextValue {
  meetings: Meeting[];
  loading: boolean;
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (id: string, patch: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
}

const MeetingsContext = createContext<MeetingsContextValue | null>(null);

export function MeetingsProvider({ children }: { children: React.ReactNode }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/meetings')
      .then((r) => r.json())
      .then((data: Meeting[]) => setMeetings(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Poll any in-progress meetings every 3 seconds
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    const inProgress = meetings.filter((m) =>
      m.status === 'pending' || m.status === 'transcribing' || m.status === 'summarizing'
    );

    if (inProgress.length === 0) return;

    pollRef.current = setInterval(async () => {
      const updates = await Promise.all(
        inProgress.map((m) =>
          fetch(`/api/meetings/${m.id}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      );
      setMeetings((prev) =>
        prev.map((m) => {
          const updated = updates.find((u) => u?.id === m.id);
          return updated ?? m;
        })
      );
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [meetings]);

  function addMeeting(meeting: Meeting) {
    setMeetings((prev) => [meeting, ...prev]);
  }

  function updateMeeting(id: string, patch: Partial<Meeting>) {
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function deleteMeeting(id: string) {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <MeetingsContext.Provider value={{ meetings, loading, addMeeting, updateMeeting, deleteMeeting }}>
      {children}
    </MeetingsContext.Provider>
  );
}

export function useMeetings() {
  const ctx = useContext(MeetingsContext);
  if (!ctx) throw new Error('useMeetings must be used within MeetingsProvider');
  return ctx;
}
