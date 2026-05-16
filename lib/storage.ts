import fs from 'fs/promises';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export async function saveAudioFile(meetingId: string, ext: string, buffer: Buffer): Promise<string> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `${meetingId}.${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  await fs.writeFile(filepath, buffer);
  return `uploads/${filename}`;
}

export async function getAudioPath(relativePath: string): Promise<string> {
  return path.join(process.cwd(), relativePath);
}
