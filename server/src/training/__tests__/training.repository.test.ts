/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../../db/connection.js";
import { runMigrations } from "../../db/migrate.js";
import { createUser } from "../../auth/users.repository.js";
import { createDeck } from "../../decks/decks.repository.js";
import { createWord } from "../../words/words.repository.js";
import { upsertProgress } from "../progress.repository.js";
import { listLearnableWords, listDueReviews } from "../training.repository.js";

let db: Database.Database;
let userId: string;
let deckId: string;

beforeEach(() => {
  db = createConnection(":memory:");
  runMigrations(db);
  userId = createUser(db, "Тестер", "salt:hash").id;
  deckId = createDeck(db, "Колода", userId, "en").id;
});

describe("listLearnableWords", () => {
  it("слово без прогресса считается новым с currentType 1", () => {
    createWord(db, { deckId, foreignWord: "cat", nativeWord: "кот" });
    const list = listLearnableWords(db, userId, 20);
    expect(list).toHaveLength(1);
    expect(list[0].word.foreign_word).toBe("cat");
    expect(list[0].currentType).toBe(1);
  });

  it("слово в процессе изучения сохраняет currentType", () => {
    const id = createWord(db, { deckId, foreignWord: "dog", nativeWord: "собака" }).id;
    upsertProgress(db, userId, id, { currentType: 3 });
    expect(listLearnableWords(db, userId, 20)[0].currentType).toBe(3);
  });

  it("выученное слово исключается из новых", () => {
    const id = createWord(db, { deckId, foreignWord: "fish", nativeWord: "рыба" }).id;
    upsertProgress(db, userId, id, {
      currentType: null,
      learnedAt: "2026-06-05T12:00:00.000Z",
    });
    expect(listLearnableWords(db, userId, 20)).toHaveLength(0);
  });

  it("уважает лимит батча", () => {
    for (let i = 0; i < 5; i += 1) {
      createWord(db, { deckId, foreignWord: `w${i}`, nativeWord: `с${i}` });
    }
    expect(listLearnableWords(db, userId, 3)).toHaveLength(3);
  });
});

describe("listDueReviews", () => {
  it("возвращает выученные слова со сроком в прошлом", () => {
    const id = createWord(db, { deckId, foreignWord: "cat", nativeWord: "кот" }).id;
    upsertProgress(db, userId, id, {
      currentType: null,
      learnedAt: "2026-06-01T12:00:00.000Z",
      intervalDays: 1,
      nextReviewAt: "2026-06-02T12:00:00.000Z",
    });
    const due = listDueReviews(db, userId, "2026-06-05T12:00:00.000Z");
    expect(due).toHaveLength(1);
    expect(due[0].word.foreign_word).toBe("cat");
    expect(due[0].progress.interval_days).toBe(1);
  });

  it("не возвращает слова со сроком в будущем", () => {
    const id = createWord(db, { deckId, foreignWord: "dog", nativeWord: "собака" }).id;
    upsertProgress(db, userId, id, {
      currentType: null,
      learnedAt: "2026-06-01T12:00:00.000Z",
      nextReviewAt: "2026-06-09T12:00:00.000Z",
    });
    expect(listDueReviews(db, userId, "2026-06-05T12:00:00.000Z")).toHaveLength(0);
  });

  it("не возвращает ещё не выученные слова", () => {
    const id = createWord(db, { deckId, foreignWord: "fish", nativeWord: "рыба" }).id;
    upsertProgress(db, userId, id, { currentType: 2 });
    expect(listDueReviews(db, userId, "2026-06-05T12:00:00.000Z")).toHaveLength(0);
  });
});
