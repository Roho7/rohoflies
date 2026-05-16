# Gemini.md

This file gives Gemini Code (and any other AI assistant) the context it needs to work productively in this repo. Keep it short, accurate, and current.

---

## Project: Fireflies-mini

A basic version of [Fireflies.ai](https://fireflies.ai) — an AI meeting assistant. Records or accepts uploaded audio, transcribes it, and produces a summary with action items.

Built as a take-home / learning project. Scope is intentionally narrow.

## Core features (in scope)

1. **Meeting Recording** — file upload (`.mp3`/`.wav`/`.mp4`/`.m4a`) + in-browser mic capture via `MediaRecorder`
2. **Transcription** — audio → text via OpenAI Whisper API using Openrouter
3. **Summary & Action Items** — transcript → structured JSON via Gemini using Openrouter (summary, key points, action items, decisions)
4. **User Interface** — Next.js app with three views: meeting list, new meeting (upload/record), meeting detail

## Explicitly out of scope (do not build)

- Google Meet / Zoom / Teams bot integration (no OAuth, no Puppeteer, no Meet Media API)
- Multi-user / auth / accounts
- Real-time live transcription during recording
- Speaker diarization (Whisper doesn't do it; not worth swapping providers for v1)
- Cloud deployment, billing, team features

If a feature isn't in "Core features," push back before adding it.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Single app for UI + API routes |
| Language | TypeScript | — |
| Styling | Tailwind CSS | Fast, no design system overhead |
| DB | Supabase (Postgres) | Realtime subscriptions, hosted Postgres, no local file |
| Transcription | OpenAI Whisper (`openai/whisper-1`) via Openrouter | Cheapest, one HTTP call, ~$0.006/min |
| Summarization | Gemini (`google/gemini-flash-1.5`) via Openrouter | Structured JSON output |
| Audio capture | Browser `MediaRecorder` API | No native deps |
| File storage | Local `./uploads/` dir | No S3 needed for v1 |

## Folder structure

```
fireflies-mini/
├── Gemini.md                           # this file
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.ts
├── .env.local                          # OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
├── .gitignore                          # ignore /uploads, .env*
│
├── uploads/                            # audio files (gitignored)
│
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── page.tsx                    # / → meeting list
    │   ├── meetings/
    │   │   ├── new/
    │   │   │   └── page.tsx            # /meetings/new → upload + record UI
    │   │   └── [id]/
    │   │       └── page.tsx            # /meetings/[id] → transcript + summary
    │   └── api/
    │       ├── meetings/
    │       │   ├── route.ts            # GET list, POST create
    │       │   └── [id]/
    │       │       └── route.ts        # GET one, DELETE
    │       ├── transcribe/
    │       │   └── route.ts            # POST audio file → { text }
    │       └── summarize/
    │           └── route.ts            # POST { transcript } → { summary, ... }
    │
    ├── components/
    │   ├── Recorder.tsx                # MediaRecorder UI (start/stop/timer)
    │   ├── FileUpload.tsx              # drag-drop + file picker
    │   ├── TranscriptView.tsx          # scrollable transcript pane
    │   ├── SummaryPanel.tsx            # summary + bullets + action items
    │   └── MeetingCard.tsx             # list item on home page
    │
    ├── lib/
    │   ├── supabase.ts                 # Supabase client singleton (server + browser)
    │   ├── whisper.ts                  # Whisper via Openrouter wrapper
    │   ├── openrouter.ts               # Gemini via Openrouter wrapper + prompt
    │   └── storage.ts                  # save/read audio files in ./uploads
    │
    └── types.ts                        # shared TS types
```

## Data model

```sql
-- Supabase SQL (run in dashboard or migration)
create table meetings (
  id          text primary key default gen_random_uuid()::text,
  title       text not null,
  audio_path  text not null,
  duration_sec int,
  transcript  text,
  summary     text,
  key_points  jsonb,
  action_items jsonb,
  decisions   jsonb,
  status      text not null default 'pending', -- pending | transcribing | summarizing | done | failed
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Enable realtime for this table in Supabase dashboard
```

Use native Postgres `jsonb` columns for `keyPoints`, `actionItems`, `decisions` — no JSON.parse needed.

## End-to-end flow

```
User clicks "New meeting"
   │
   ├── Option A: upload audio file
   └── Option B: record via MediaRecorder, then "Stop & Save"
         │
         ▼
   POST /api/meetings   (multipart: audio file + title)
         │
         ├── save file to ./uploads/<cuid>.<ext>
         ├── create Meeting row, status=pending
         ├── kick off pipeline (await — single user, so blocking is fine):
         │     ├── status=transcribing → POST internal call to whisper.ts
         │     ├── status=summarizing  → POST internal call to Gemini.ts
         │     └── status=done
         └── return meeting id
         │
         ▼
   Redirect to /meetings/[id]   (shows transcript + summary)
```

For v1, run the pipeline synchronously in the POST handler. If it gets slow, switch to: return id immediately + poll status from the detail page.

## Build order (do in this sequence)

1. Scaffold Next.js + Tailwind, get `npm run dev` working
2. Create `meetings` table in Supabase, enable Realtime, build `lib/supabase.ts`
3. Build `/api/transcribe` — accept file, call Whisper via Openrouter, return text. Test with `curl` and a sample mp3
4. Build `/api/summarize` — accept transcript, call Gemini with structured prompt, return JSON
5. Build `/api/meetings` POST that ties upload + transcribe + summarize + DB write together
6. Build UI: home page (list), new page (FileUpload only first), detail page
7. Add `Recorder.tsx` component for in-browser recording
8. Polish: loading states, error states, empty states, delete button

Each step should leave the app runnable. Don't build the UI before the API works.

## Prompt for Gemini (summarization)

Use as the user message; output must be strict JSON. Keep this in `src/lib/openrouter.ts`:

```
You are summarizing a meeting transcript. Return ONLY valid JSON matching this schema, with no preamble or markdown fences:

{
  "summary": "2-3 sentence overview of the meeting",
  "keyPoints": ["bullet", "bullet", ...],
  "actionItems": [{ "task": "...", "owner": "name or 'unassigned'" }],
  "decisions": ["decision made", ...]
}

If the transcript is too short or unclear, return empty arrays rather than inventing content.

Transcript:
<<<
{TRANSCRIPT}
>>>
```

Parse the response with `JSON.parse`. Wrap in try/catch; on parse failure, store raw response in `summary` and leave the other fields empty.

## Conventions

- **Server-only secrets** — `OPENROUTER_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are read inside API routes only. Never imported from a client component. `SUPABASE_URL` and `SUPABASE_ANON_KEY` are safe to expose to the client.
- **Audio files** — stored at `./uploads/<meetingId>.<ext>`. The DB stores the relative path; never the absolute path.
- **Errors** — API routes return `{ error: string }` with appropriate status code. Client shows a toast / inline message; never silently fails.
- **Types** — shared types live in `src/types.ts`. Prisma types are imported directly from `@prisma/client` where needed.
- **No premature abstraction** — two API calls don't need a "service layer." Inline first, extract if it repeats.

## Commands

```bash
npm install
cp .env.local.example .env.local        # fill in OPENROUTER_API_KEY + Supabase keys
# Run the SQL schema in Supabase dashboard → SQL editor
# Enable Realtime on the meetings table in Supabase dashboard → Database → Replication
npm run dev                             # http://localhost:3000
```

## Things to add later (post-v1, only if time permits)

- "AskFred"-style chat: a `/api/ask` route that takes a question + meeting id, sends transcript + question to Gemini, streams back the answer
- Export transcript + summary as Markdown
- Tag/search meetings
- Multi-file batch upload
- Simple speaker labeling (manual: user types names, regex-split on `Speaker 1:` etc.)

Anything beyond this list belongs in a v2 doc, not in this codebase.

## Notes for the AI assistant working on this

- This is a learning/take-home project. **Favor clarity over cleverness.** A reviewer should be able to read the code top-to-bottom and understand the pipeline.
- Don't add testing frameworks, CI, Docker, or auth unless explicitly asked.
- Don't swap the stack. If Whisper or Gemini is annoying, fix the prompt or the wrapper — don't rewrite to a different provider.
- When in doubt, refer back to "Explicitly out of scope" above.