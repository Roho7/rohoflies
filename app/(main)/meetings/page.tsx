import { createClient } from '@/utils/supabase/server';
import MeetingRow from '@/components/MeetingRow';
import { Meeting } from '@/types';

export const dynamic = 'force-dynamic';

function groupByDate(meetings: Meeting[]): { label: string; items: Meeting[] }[] {
  const groups: Record<string, Meeting[]> = {};
  for (const m of meetings) {
    const label = new Date(m.created_at).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
    if (!groups[label]) groups[label] = [];
    groups[label].push(m);
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

export default async function MeetingsPage() {
  const supabase = await createClient();
  const { data: meetings, error } = await supabase
    .from('meetings')
    .select('*')
    .order('created_at', { ascending: false });

  const groups = groupByDate((meetings as Meeting[]) ?? []);

  return (
    <div className="px-6 py-6 w-full">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">All Meetings</h1>

      {error && <p className="text-red-500 text-sm">Failed to load meetings: {error.message}</p>}

      {!error && groups.length === 0 && (
        <div className="text-center py-24 text-gray-400">
          <p className="text-base font-medium">No meetings yet.</p>
          <p className="text-sm mt-1">Upload a file or start a recording to get started.</p>
        </div>
      )}

      {groups.map(({ label, items }) => (
        <div key={label} className="mb-6">
          <p className="text-sm text-gray-400 font-medium mb-3 px-1">{label}</p>
          <div className="flex flex-col gap-3">
            {items.map((meeting) => (
              <MeetingRow key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </div>
      ))}

      {groups.length > 0 && (
        <p className="text-center text-sm text-gray-300 py-6">You've reached the end of your meetings</p>
      )}
    </div>
  );
}
