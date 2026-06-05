/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { audioPublicUrl, saveAudioFile, deleteAudioFile } from "../audioStorage.js";

let uploadsDir: string;

beforeEach(() => {
  uploadsDir = mkdtempSync(join(tmpdir(), "wt-audio-"));
});

afterEach(() => {
  rmSync(uploadsDir, { recursive: true, force: true });
});

describe("audioPublicUrl", () => {
  it("строит публичный путь по id слова", () => {
    expect(audioPublicUrl("abc")).toBe("/uploads/audio/abc.mp3");
  });
});

describe("saveAudioFile", () => {
  it("пишет файл в audio/ и возвращает публичный путь", () => {
    const url = saveAudioFile(uploadsDir, "abc", Buffer.from("mp3"));
    expect(url).toBe("/uploads/audio/abc.mp3");
    const file = join(uploadsDir, "audio", "abc.mp3");
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file).toString()).toBe("mp3");
  });
});

describe("deleteAudioFile", () => {
  it("удаляет файл; на отсутствующем не падает", () => {
    saveAudioFile(uploadsDir, "abc", Buffer.from("mp3"));
    deleteAudioFile(uploadsDir, "abc");
    expect(existsSync(join(uploadsDir, "audio", "abc.mp3"))).toBe(false);
    expect(() => deleteAudioFile(uploadsDir, "missing")).not.toThrow();
  });
});
