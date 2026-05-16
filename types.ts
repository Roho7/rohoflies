export type MeetingStatus = 'pending' | 'transcribing' | 'summarizing' | 'done' | 'failed';
export type EntityType = 'upload' | 'recording';
export type FileType = 'video' | 'audio';

export interface ActionItem {
  task: string;
  owner: string;
}

export interface Meeting {
  id: string;
  title: string;
  audio_path: string;
  video_path: string | null;
  duration_sec: number | null;
  transcript: string | null;
  summary: string | null;
  key_points: string[] | null;
  action_items: ActionItem[] | null;
  decisions: string[] | null;
  status: MeetingStatus;
  entity_type: EntityType | null;
  file_type: FileType | null;
  created_at: string;
  updated_at: string;
}
