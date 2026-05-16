import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import MeetingRow from '@/components/MeetingRow';
import { Meeting } from '@/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(6);

  return (
    <div className="flex flex-col">
      {/* Gradient hero */}
      <div
        className="relative overflow-hidden px-8 py-14 flex flex-col items-center text-center"
        style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 30%, #ddd6fe 60%, #c4b5fd 100%)' }}
      >
        <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />
        <div className="absolute -bottom-10 -right-10 w-80 h-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="relative z-10">
          <p className="text-sm font-medium text-purple-600 mb-2 tracking-wide uppercase">Welcome back</p>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Your Meeting Intelligence Hub</h1>
          <p className="text-gray-500 text-base max-w-md">
            Upload recordings or capture live — get transcripts, summaries, and action items instantly.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8"
          style={{ background: 'linear-gradient(to bottom, transparent, #f9fafb)' }} />
      </div>

      {/* Recent meetings */}
      <div className="px-8 py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-800">Recent Meetings</h2>
          <Link href="/meetings" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
            View all →
          </Link>
        </div>

        {(!meetings || meetings.length === 0) && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-base font-medium">No meetings yet.</p>
            <p className="text-sm mt-1">Upload a file or start a recording to get started.</p>
          </div>
        )}

        {meetings && meetings.length > 0 && (
          <div className="flex flex-col gap-3 w-full">
            {(meetings as Meeting[]).map((meeting) => (
              <MeetingRow key={meeting.id} meeting={meeting} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
