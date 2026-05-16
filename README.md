# rohoflies.ai

A Fireflies.ai clone. Upload or record audio and video — get a transcript, summary, key points, action items, and decisions automatically.

---

## Features

### Upload a Meeting recording
Pick any audio or video file (MP3, WAV, M4A, AAC, FLAC, OGG, MP4, MOV, AVI, MKV, WebM). The app compresses it in your browser, uploads it, then automatically transcribes and summarizes it. You get a full transcript, a 2–3 sentence summary, key points, action items with owners, and decisions — all without doing anything else.

### Record live audio
Hit the mic button in the top bar or go to `/record`. The browser captures your microphone. When you stop, it saves the recording, transcribes and summarizes it.

### Browse your meetings
The home screen shows your 6 most recent meetings. The Meetings page shows all of them grouped by date. The Uploads page shows only uploaded files.

### Read a meeting
Each meeting has its own page with two panels: the left shows the summary, key points, action items, and decisions; the right shows the full scrollable transcript. An audio player appears at the bottom so you can listen while reading.

### Delete or retry
Every meeting row has a three-dot menu. You can delete a meeting (removes it from the database and storage) or retry a failed one (re-runs transcription and summarization using the original file).

---

## Build Process

This project was built in ~5 hours between 2PM IST to 9PM IST on 16th May, Saturday, 2026. This project was built with the help of Claude Code which I used to architect, design and develop most parts of the project. The process I followed is as follows: 
- I used the official Fireflies.ai app thoroughly to get familiar with the core flows. 
- I wrote a rough spec document in Claude desktop and brainstormed implementation details for the Upload Recording flow. 
- I knew I could make the entire project functional, with real transcription and summarization features.
- For the frontend, I chose NEXT.js as I am the most familiar with it and I knew I could write simple server side logic in a single repo using it.
- I chose Supabase as the db (as it is what I am most familiar with) to store meetings and recordings. It is a single table that stores the transcription data and recording links. For storage of audio and video files I used Supabase Storage. 
- I chose Shadcn as the component library due to its close compatibility with NEXT.js and due to it clean aesthetic and customizability.
- For the LLM provider, I chose Openrouter as I had some credits left there from older projects and because I wanted to play around with different LLMs without rewriting too much code. 
- Finally after a thorough QnA session with Claude, I compiled the building plan in a CLAUDE.md file. 
- I moved over to Claude Code and asked it to follow the plan in CLAUDE.md and build the first iteration step by step. 
- After I reviewed the first pass, I made some structural and stylistic changes. 
- There were several problems with file upload like: 
  - Large files were not being uploaded to Supabase due to free tier limits
  - Large files were too heavy to be sent in API calls directly.
  - Video files were failing to be properly transcribed by the Whisper model.
- I changed the architecture as follows: 
  - Convert video files to compressed mp3 using ffmpeg. 
  - Upload small sized audio file to Supabase and get the public link.
  - Use the link to call the /transcribe api and read the audio to get a base64. 
  - Pass the lightweight base64 to the LLM for transcription. 
- These fixes solved the above problems and also made the application 10 times faster. 
- Next I changed the plan slightly to build out a Live Recording features similar to Fireflies.ai. This was straightforward. I used the browser's inbuilt media recorder API to capture audio and send the audio blob to supabase and then the same /transcribe API. 
- Lastly I cleaned up and prettified the UI to look more similar to Fireflies.ai and put all the common recording states and logic in a Context. 
- The one thing I would change in this build is the polling logic that gets the latest state of the in-progress recording. I would use a realtime feature from the database to take care of it. But currently, it works fine as is, its just poor design.
- I also implemented search as my last commit. User can now search through their transcripts using related phrases.



## Upload flow

1. Pick a file and give it a name in the dialog
2. ffmpeg.wasm compresses the file to a 32kbps mono 16kHz mp3
3. The compressed mp3 uploads to Supabase Storage under `recordings/`
4. The dialog closes immediately and a row appears in the list with a spinner
5. A background API call creates the meeting row in the database with `status: pending`
6. Downloads the mp3 from Storage, sends it to OpenAI Whisper via OpenRouter → gets back the transcript
7. Uploads the compressed audio to Supabase Storage for playback
8. Sends the transcript to Gemini via OpenRouter → gets back structured JSON (summary, key points, action items, decisions)
9. The UI polls every 3 seconds and updates the row — the spinner disappears when done

---

## Recording flow

1. Click the mic button in the top bar → land on `/record` (no sidebar, focused UI)
2. Browser asks for microphone permission and starts MediaRecorder
3. A live timer runs while you speak
4. Click Stop → the audio blob is captured
5. Give it a name and save → the blob uploads to Supabase Storage
6. Same pipeline as the upload flow from step 5 onwards

---

## Data & state

All meetings are loaded once into a shared React context (`MeetingsContext`) when the app mounts. Every page (home, meetings, uploads) reads from this context instead of fetching independently. The context also runs a polling loop every 3 seconds for any meeting that is still processing, updating the row automatically until it reaches `done` or `failed`.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (Postgres) |
| File storage | Supabase Storage |
| Transcription | OpenAI Whisper via OpenRouter |
| Summarization | Gemini Flash via OpenRouter |
| Browser compression | ffmpeg.wasm |
| Audio capture | Browser MediaRecorder API |

---

## Local Setup

### Step 1
```bash
npm install
```

### Step 2

Create a `.env` file:

```
OPENROUTER_API_KEY=your_key
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_key
```

### Step 3
Run the SQL schema `schema.sql` in the Supabase dashboard.

### Step 4

Run the dev server:

```bash
npm run dev
```
