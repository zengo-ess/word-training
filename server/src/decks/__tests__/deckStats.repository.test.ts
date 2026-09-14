/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../../db/connection.js";
import { runMigrations } from "../../db/migrate.js";
import { createUser } from "../../auth/users.repository.js";
import { createDeck } from "../decks.repository.js";
import { createWord } from "../../words/words.repository.js";
import { upsertProgress } from "../../training/progress.repository.js";
import { listDecksWithStats, listWordsWithProgress } from "../deckStats.repository.js";

let db: Database.Database;
let userId: string;
let deckId: string;

beforeEach(() => {
  db = createConnection(":memory:");
  runMigrations(db);
  userId = createUser(db, "Тестер", "salt:hash").id;
  deckId = createDeck(db, "Еда", userId, "en").id;
});

describe("listDecksWithStats", () => {
  it("считает total и learned по колоде", () => {
    const w1 = createWord(db, { deckId, foreignWord: "apple", nativeWord: "яблоко" }).id;
    createWord(db, { deckId, foreignWord: "bread", nativeWord: "хлеб" });
    upsertProgress(db, userId, w1, { currentType: null, learnedAt: "2026-06-01T00:00:00.000Z" });

    const decks = listDecksWithStats(db, userId, "en");
    const food = decks.find((d) => d.id === deckId);
    expect(food?.total).toBe(2);
    expect(food?.learned).toBe(1);
  });

  it("новая пустая колода имеет total 0 / learned 0", () => {
    const decks = listDecksWithStats(db, userId, "en");
    expect(decks[0].total).toBe(0);
    expect(decks[0].learned).toBe(0);
  });

  it("не показывает колоду другого языка", () => {
    const deDeck = createDeck(db, "Немецкая", userId, "de").id;
    const decks = listDecksWithStats(db, userId, "en");
    expect(decks.some((d) => d.id === deDeck)).toBe(false);
  });
});

describe("listWordsWithProgress", () => {
  it("слово без прогресса — progress null", () => {
    createWord(db, { deckId, foreignWord: "apple", nativeWord: "яблоко" });
    const words = listWordsWithProgress(db, deckId, userId);
    expect(words).toHaveLength(1);
    expect(words[0].foreign_word).toBe("apple");
    expect(words[0].progress).toBeNull();
  });

  it("слово с прогрессом несёт его данные", () => {
    const id = createWord(db, { deckId, foreignWord: "dog", nativeWord: "собака" }).id;
    upsertProgress(db, userId, id, { currentType: 3 });
    const words = listWordsWithProgress(db, deckId, userId);
    expect(words[0].progress?.current_type).toBe(3);
    expect(words[0].progress?.learned_at).toBeNull();
  });
});
