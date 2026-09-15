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
    const list = listLearnableWords(db, userId, 20, "en");
    expect(list).toHaveLength(1);
    expect(list[0].word.foreign_word).toBe("cat");
    expect(list[0].currentType).toBe(1);
  });

  it("слово в процессе изучения сохраняет currentType", () => {
    const id = createWord(db, { deckId, foreignWord: "dog", nativeWord: "собака" }).id;
    upsertProgress(db, userId, id, { currentType: 3 });
    expect(listLearnableWords(db, userId, 20, "en")[0].currentType).toBe(3);
  });

  it("выученное слово исключается из новых", () => {
    const id = createWord(db, { deckId, foreignWord: "fish", nativeWord: "рыба" }).id;
    upsertProgress(db, userId, id, {
      currentType: null,
      learnedAt: "2026-06-05T12:00:00.000Z",
    });
    expect(listLearnableWords(db, userId, 20, "en")).toHaveLength(0);
  });

  it("уважает лимит батча", () => {
    for (let i = 0; i < 5; i += 1) {
      createWord(db, { deckId, foreignWord: `w${i}`, nativeWord: `с${i}` });
    }
    expect(listLearnableWords(db, userId, 3, "en")).toHaveLength(3);
  });

  it("не отдаёт слово из колоды другого языка", () => {
    createWord(db, { deckId, foreignWord: "cat", nativeWord: "кот" });
    const deDeckId = createDeck(db, "Немецкая", userId, "de").id;
    createWord(db, { deckId: deDeckId, foreignWord: "Katze", nativeWord: "кошка" });

    expect(listLearnableWords(db, userId, 20, "en")).toHaveLength(1);
    expect(listLearnableWords(db, userId, 20, "de")).toHaveLength(1);
    expect(listLearnableWords(db, userId, 20, "de")[0].word.foreign_word).toBe("Katze");
  });

  it("с deckId отдаёт слова только из этой колоды, даже если другая создана раньше", () => {
    createWord(db, { deckId, foreignWord: "cat", nativeWord: "кот" });
    const otherDeckId = createDeck(db, "Другая", userId, "en").id;
    createWord(db, { deckId: otherDeckId, foreignWord: "dog", nativeWord: "собака" });

    const list = listLearnableWords(db, userId, 20, "en", otherDeckId);
    expect(list).toHaveLength(1);
    expect(list[0].word.foreign_word).toBe("dog");
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
    const due = listDueReviews(db, userId, "2026-06-05T12:00:00.000Z", "en");
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
    expect(listDueReviews(db, userId, "2026-06-05T12:00:00.000Z", "en")).toHaveLength(0);
  });

  it("не возвращает ещё не выученные слова", () => {
    const id = createWord(db, { deckId, foreignWord: "fish", nativeWord: "рыба" }).id;
    upsertProgress(db, userId, id, { currentType: 2 });
    expect(listDueReviews(db, userId, "2026-06-05T12:00:00.000Z", "en")).toHaveLength(0);
  });

  it("не возвращает выученное слово из колоды другого языка", () => {
    const id = createWord(db, { deckId, foreignWord: "cat", nativeWord: "кот" }).id;
    upsertProgress(db, userId, id, {
      currentType: null,
      learnedAt: "2026-06-01T12:00:00.000Z",
      nextReviewAt: "2026-06-02T12:00:00.000Z",
    });
    expect(listDueReviews(db, userId, "2026-06-05T12:00:00.000Z", "de")).toHaveLength(0);
  });

  it("с deckId отдаёт повторения только из этой колоды", () => {
    const id1 = createWord(db, { deckId, foreignWord: "cat", nativeWord: "кот" }).id;
    upsertProgress(db, userId, id1, {
      currentType: null,
      learnedAt: "2026-06-01T12:00:00.000Z",
      nextReviewAt: "2026-06-02T12:00:00.000Z",
    });
    const otherDeckId = createDeck(db, "Другая", userId, "en").id;
    const id2 = createWord(db, { deckId: otherDeckId, foreignWord: "dog", nativeWord: "собака" }).id;
    upsertProgress(db, userId, id2, {
      currentType: null,
      learnedAt: "2026-06-01T12:00:00.000Z",
      nextReviewAt: "2026-06-02T12:00:00.000Z",
    });

    const due = listDueReviews(db, userId, "2026-06-05T12:00:00.000Z", "en", otherDeckId);
    expect(due).toHaveLength(1);
    expect(due[0].word.foreign_word).toBe("dog");
  });
});
