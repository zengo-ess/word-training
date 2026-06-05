import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function audioPublicUrl(wordId: string): string {
  return `/uploads/audio/${wordId}.mp3`;
}

export function saveAudioFile(uploadsDir: string, wordId: string, data: Buffer): string {
  const dir = join(uploadsDir, "audio");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${wordId}.mp3`), data);
  return audioPublicUrl(wordId);
}

export function deleteAudioFile(uploadsDir: string, wordId: string): void {
  const file = join(uploadsDir, "audio", `${wordId}.mp3`);
  if (existsSync(file)) {
    rmSync(file);
  }
}
