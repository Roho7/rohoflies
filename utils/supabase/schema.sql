-- Run this in Supabase Dashboard → SQL Editor
-- Then enable Realtime on the meetings table:
--   Database → Replication → enable meetings table

create table meetings (
  id          text primary key,
  title       text not null,
  audio_path  text not null,
  duration_sec int,
  transcript  text,
  summary     text,
  key_points  jsonb,
  action_items jsonb,
  decisions   jsonb,
  status      text not null default 'pending',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
