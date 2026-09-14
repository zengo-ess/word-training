import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const IMAGE_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function saveUploadedImage(
  uploadsDir: string,
  mimeType: string,
  data: Buffer,
): string | null {
  const ext = IMAGE_EXT_BY_MIME[mimeType];
  if (!ext) {
    return null;
  }
  const dir = join(uploadsDir, "images");
  mkdirSync(dir, { recursive: true });
  const id = randomUUID();
  writeFileSync(join(dir, `${id}.${ext}`), data);
  return `/uploads/images/${id}.${ext}`;
}
