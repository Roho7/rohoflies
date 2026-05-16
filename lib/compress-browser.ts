import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  if (ffmpeg?.loaded) return ffmpeg;

  ffmpeg = new FFmpeg();

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => onProgress(Math.round(progress * 100)));
  }

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
}

export async function compressToMp3(
  file: File,
  onProgress?: (stage: string, pct?: number) => void
): Promise<File> {
  onProgress?.('Loading compressor...');
  const ff = await getFFmpeg((pct) => onProgress?.('Compressing...', pct));

  const inputName = `input.${file.name.split('.').pop() || 'mp4'}`;
  const outputName = 'output.mp3';

  onProgress?.('Compressing...');
  await ff.writeFile(inputName, await fetchFile(file));
  await ff.exec([
    '-i', inputName,
    '-vn',
    '-ar', '16000',
    '-ac', '1',
    '-b:a', '32k',
    outputName,
  ]);

  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  const blob = new Blob([data as any], { type: 'audio/mpeg' });
  return new File([blob], `${file.name.replace(/\.[^/.]+$/, '')}.mp3`, { type: 'audio/mpeg' });
}
