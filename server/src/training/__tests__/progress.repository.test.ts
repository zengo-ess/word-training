/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../../db/connection.js";
import { runMigrations } from "../../db/migrate.js";
import { createDeck } from "../../decks/decks.repository.js";
import { createWord } from "../../words/words.repository.js";
import { getProgress, upsertProgress } from "../progress.repository.js";

let db: Database.Database;
let wordId: string;

beforeEach(() => {
  db = createConnection(":memory:");
  runMigrations(db);
  const deckId = createDeck(db, "Колода").id;
  wordId = createWord(db, { deckId, english: "cat", russian: "кот" }).id;
});

describe("upsertProgress / getProgress", () => {
  it("создаёт строку прогресса с guid и дефолтами", () => {
    const progress = upsertProgress(db, wordId, { currentType: 1 });
    expect(progress.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(progress.word_id).toBe(wordId);
    expect(progress.current_type).toBe(1);
    expect(progress.learned_at).toBeNull();
    expect(progress.ease_factor).toBe(2.5);
    expect(progress.interval_days).toBe(0);
    expect(progress.total_reviews).toBe(0);
  });

  it("обновляет существующую строку, не плодит новую", () => {
    upsertProgress(db, wordId, { currentType: 1 });
    const updated = upsertProgress(db, wordId, {
      currentType: null,
      learnedAt: "2026-06-05T12:00:00.000Z",
      intervalDays: 1,
      nextReviewAt: "2026-06-06T12:00:00.000Z",
    });
    expect(updated.current_type).toBeNull();
    expect(updated.learned_at).toBe("2026-06-05T12:00:00.000Z");
    expect(updated.interval_days).toBe(1);
    const all = db.prepare("SELECT COUNT(*) AS c FROM progress WHERE word_id = ?").get(wordId) as { c: number };
    expect(all.c).toBe(1);
  });

  it("getProgress возвращает undefined без строки", () => {
    expect(getProgress(db, wordId)).toBeUndefined();
  });
});
