import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';

// ffmpeg-static's __dirname gets rewritten to /ROOT/ by Next.js bundler,
// so we resolve the binary path from process.cwd() instead.
const ffmpegPath = path.join(process.cwd(), 'node_modules/ffmpeg-static/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const VIDEO_EXTS = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm']);

// MP4 needs random access (moov atom seek) so pipes don't work — use temp files.
function extractAudio(inputBuffer: Buffer, inputExt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `roho_in_${Date.now()}.${inputExt}`);
    const outputPath = path.join(tmpDir, `roho_out_${Date.now()}.mp3`);

    fs.writeFileSync(inputPath, inputBuffer);

    ffmpeg(inputPath)
      .audioCodec('libmp3lame')
      .audioBitrate('32k')   // 32kbps is plenty for speech transcription
      .audioChannels(1)       // mono — halves the size again
      .audioFrequency(16000)  // 16kHz — Whisper's native sample rate
      .noVideo()
      .format('mp3')
      .on('error', (err) => {
        console.error('[ffmpeg] error:', err.message);
        fs.rmSync(inputPath, { force: true });
        fs.rmSync(outputPath, { force: true });
        reject(err);
      })
      .on('end', () => {
        const result = fs.readFileSync(outputPath);
        fs.rmSync(inputPath, { force: true });
        fs.rmSync(outputPath, { force: true });
        resolve(result);
      })
      .save(outputPath);
  });
}

export async function transcribeAudio(fileBuffer: Buffer, filename: string): Promise<{ text: string; audioBuffer: Buffer }> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  let audioBuffer = fileBuffer;
  let audioFilename = filename;

  if (VIDEO_EXTS.has(ext) || fileBuffer.length > 1 * 1024 * 1024) {
    // Always compress: videos need audio extraction, large audio files need size reduction
    console.log(`[whisper] compressing via ffmpeg (${(fileBuffer.length / 1024).toFixed(0)} KB input)`);
    audioBuffer = await extractAudio(fileBuffer, ext || 'mp3');
    audioFilename = filename.replace(/\.[^.]+$/, '.mp3');
    console.log(`[whisper] compressed to ${(audioBuffer.length / 1024).toFixed(0)} KB`);
  }

  const base64Audio = audioBuffer.toString('base64');
  console.log('[whisper] sending to OpenRouter as base64', { filename: audioFilename, size: audioBuffer.length });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://rohoflies.app',
        'X-Title': 'Rohoflies',
      },
      body: JSON.stringify({
        model: 'openai/whisper-1',
        input_audio: {
          data: base64Audio,
          format: 'mp3',
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[whisper] HTTP error', response.status, err);
      throw new Error(`Whisper HTTP ${response.status}: ${err}`);
    }

    const data = await response.json();
    console.log('[whisper] raw response:', JSON.stringify(data).slice(0, 200));

    const text = data.text ?? data.transcript ?? data.choices?.[0]?.message?.content;
    if (!text) throw new Error(`Whisper response has no text: ${JSON.stringify(data)}`);

    console.log('[whisper] transcription done, chars:', text.length);
    return { text, audioBuffer };
  } catch (error) {
    console.error('[whisper] error', error);
    throw error;
  }
}
