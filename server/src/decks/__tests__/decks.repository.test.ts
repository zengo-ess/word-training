/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../../db/connection.js";
import { runMigrations } from "../../db/migrate.js";
import { createUser } from "../../auth/users.repository.js";
import { createWord } from "../../words/words.repository.js";
import { upsertProgress } from "../../training/progress.repository.js";
import {
  listDecks,
  getDeck,
  createDeck,
  renameDeck,
  deleteDeckById,
  listWordIds,
} from "../decks.repository.js";

let db: Database.Database;
let userId: string;

beforeEach(() => {
  db = createConnection(":memory:");
  runMigrations(db);
  userId = createUser(db, "Тестер", "salt:hash").id;
});

describe("createDeck / getDeck", () => {
  it("создаёт пользовательскую колоду (is_builtin = 0) с guid-идентификатором", () => {
    const deck = createDeck(db, "Мои слова", userId, "en");
    expect(deck.name).toBe("Мои слова");
    expect(deck.is_builtin).toBe(0);
    expect(deck.language).toBe("en");
    expect(deck.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(getDeck(db, deck.id)?.name).toBe("Мои слова");
  });

  it("getDeck возвращает undefined для неизвестного id", () => {
    expect(getDeck(db, "00000000-0000-0000-0000-000000000000")).toBeUndefined();
  });
});

describe("listDecks", () => {
  it("возвращает встроенные колоды раньше пользовательских", () => {
    db.prepare("INSERT INTO decks (id, name, is_builtin, language) VALUES (?, ?, 1, 'en')").run(
      "11111111-1111-1111-1111-111111111111",
      "Встроенная",
    );
    createDeck(db, "Пользовательская", userId, "en");
    const decks = listDecks(db, userId, "en");
    expect(decks).toHaveLength(2);
    expect(decks[0].is_builtin).toBe(1);
    expect(decks[1].is_builtin).toBe(0);
  });

  it("колода одного пользователя не видна другому", () => {
    const userA = createUser(db, "Юзер А", "salt:hash-a");
    const userB = createUser(db, "Юзер Б", "salt:hash-b");
    const deck = createDeck(db, "Колода А", userA.id, "en");

    const decksOfA = listDecks(db, userA.id, "en");
    expect(decksOfA.some((d) => d.id === deck.id)).toBe(true);

    const decksOfB = listDecks(db, userB.id, "en");
    expect(decksOfB.some((d) => d.id === deck.id)).toBe(false);
  });

  it("не показывает колоду, если язык не совпадает", () => {
    const deck = createDeck(db, "Немецкая", userId, "de");
    const decksEn = listDecks(db, userId, "en");
    expect(decksEn.some((d) => d.id === deck.id)).toBe(false);
    const decksDe = listDecks(db, userId, "de");
    expect(decksDe.some((d) => d.id === deck.id)).toBe(true);
  });
});

describe("renameDeck", () => {
  it("меняет название колоды", () => {
    const deck = createDeck(db, "Мои слова", userId, "en");
    expect(renameDeck(db, deck.id, "Работа")?.name).toBe("Работа");
    expect(getDeck(db, deck.id)?.name).toBe("Работа");
  });
});

describe("listWordIds / deleteDeckById", () => {
  it("listWordIds отдаёт id всех слов колоды", () => {
    const deck = createDeck(db, "Еда", userId, "en");
    const apple = createWord(db, { deckId: deck.id, foreignWord: "apple", nativeWord: "яблоко" });
    const bread = createWord(db, { deckId: deck.id, foreignWord: "bread", nativeWord: "хлеб" });
    expect(listWordIds(db, deck.id).sort()).toEqual([apple.id, bread.id].sort());
  });

  it("удаляет колоду вместе со словами и прогрессом по ним", () => {
    const deck = createDeck(db, "Еда", userId, "en");
    const word = createWord(db, { deckId: deck.id, foreignWord: "apple", nativeWord: "яблоко" });
    upsertProgress(db, userId, word.id, { currentType: 2 });

    deleteDeckById(db, deck.id);

    expect(getDeck(db, deck.id)).toBeUndefined();
    expect(db.prepare("SELECT COUNT(*) AS c FROM words WHERE id = ?").get(word.id)).toEqual({ c: 0 });
    expect(
      db.prepare("SELECT COUNT(*) AS c FROM progress WHERE word_id = ?").get(word.id),
    ).toEqual({ c: 0 });
  });

  it("не трогает слова соседней колоды", () => {
    const target = createDeck(db, "Еда", userId, "en");
    const other = createDeck(db, "Работа", userId, "en");
    createWord(db, { deckId: target.id, foreignWord: "apple", nativeWord: "яблоко" });
    const kept = createWord(db, { deckId: other.id, foreignWord: "office", nativeWord: "офис" });

    deleteDeckById(db, target.id);

    expect(listWordIds(db, other.id)).toEqual([kept.id]);
  });
});
