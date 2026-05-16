'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function DeleteButton({ meetingId }: { meetingId: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm('Delete this meeting?')) return;
    const res = await fetch(`/api/meetings/${meetingId}`, { method: 'DELETE' });
    if (res.ok) router.push('/');
    else alert('Failed to delete meeting');
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete}>
      Delete
    </Button>
  );
}
