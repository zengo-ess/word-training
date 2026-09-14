/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { saveUploadedImage } from "../imageStorage.js";

let uploadsDir: string;

beforeEach(() => {
  uploadsDir = mkdtempSync(join(tmpdir(), "wt-image-"));
});

afterEach(() => {
  rmSync(uploadsDir, { recursive: true, force: true });
});

describe("saveUploadedImage", () => {
  it("пишет файл в images/ с расширением по mime-типу и возвращает публичный путь", () => {
    const url = saveUploadedImage(uploadsDir, "image/png", Buffer.from("png-bytes"));
    expect(url).toMatch(/^\/uploads\/images\/[0-9a-f-]{36}\.png$/);
    const file = join(uploadsDir, "images", url!.split("/").pop() as string);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file).toString()).toBe("png-bytes");
  });

  it("поддерживает jpeg и webp", () => {
    expect(saveUploadedImage(uploadsDir, "image/jpeg", Buffer.from("a"))).toMatch(/\.jpg$/);
    expect(saveUploadedImage(uploadsDir, "image/webp", Buffer.from("a"))).toMatch(/\.webp$/);
  });

  it("возвращает null для неподдерживаемого mime-типа, файл не создаётся", () => {
    const url = saveUploadedImage(uploadsDir, "application/pdf", Buffer.from("a"));
    expect(url).toBeNull();
    expect(existsSync(join(uploadsDir, "images")) ? readdirSync(join(uploadsDir, "images")) : []).toHaveLength(0);
  });
});
