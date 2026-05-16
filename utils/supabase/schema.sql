create table public.meetings (
  id text not null,
  title text not null,
  audio_path text not null,
  duration_sec integer null,
  transcript text null,
  summary text null,
  key_points jsonb null,
  action_items jsonb null,
  decisions jsonb null,
  status text not null default 'pending'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  entity_type text null,
  file_type text null,
  video_path text null,
  constraint meetings_pkey primary key (id)
) TABLESPACE pg_default;