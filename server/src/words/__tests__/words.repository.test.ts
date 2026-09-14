/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../../db/connection.js";
import { runMigrations } from "../../db/migrate.js";
import { createUser } from "../../auth/users.repository.js";
import { createDeck } from "../../decks/decks.repository.js";
import {
  listWordsByDeck,
  getWord,
  createWord,
  updateWord,
  deleteWord,
} from "../words.repository.js";

let db: Database.Database;
let userId: string;
let deckId: string;

beforeEach(() => {
  db = createConnection(":memory:");
  runMigrations(db);
  userId = createUser(db, "Тестер", "salt:hash").id;
  deckId = createDeck(db, "Колода", userId, "en").id;
});

describe("createWord", () => {
  it("создаёт слово с guid и null-полями транскрипции/примера по умолчанию", () => {
    const word = createWord(db, { deckId, foreignWord: "cat", nativeWord: "кот" });
    expect(word.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(word.foreign_word).toBe("cat");
    expect(word.native_word).toBe("кот");
    expect(word.transcription).toBeNull();
    expect(word.example_sentence).toBeNull();
    expect(word.image_url).toBeNull();
  });

  it("сохраняет переданные транскрипцию, пример и картинку", () => {
    const word = createWord(db, {
      deckId,
      foreignWord: "dog",
      nativeWord: "собака",
      transcription: "dɒɡ",
      exampleSentence: "The dog barks.",
      imageUrl: "https://img/dog.jpg",
    });
    expect(word.transcription).toBe("dɒɡ");
    expect(word.example_sentence).toBe("The dog barks.");
    expect(word.image_url).toBe("https://img/dog.jpg");
  });
});

describe("listWordsByDeck", () => {
  it("возвращает только слова указанной колоды", () => {
    const other = createDeck(db, "Другая", userId, "en").id;
    createWord(db, { deckId, foreignWord: "cat", nativeWord: "кот" });
    createWord(db, { deckId: other, foreignWord: "dog", nativeWord: "собака" });
    const words = listWordsByDeck(db, deckId);
    expect(words).toHaveLength(1);
    expect(words[0].foreign_word).toBe("cat");
  });
});

describe("updateWord", () => {
  it("обновляет только переданные поля", () => {
    const word = createWord(db, { deckId, foreignWord: "cat", nativeWord: "кот" });
    const updated = updateWord(db, word.id, { nativeWord: "кошка" });
    expect(updated?.native_word).toBe("кошка");
    expect(updated?.foreign_word).toBe("cat");
  });

  it("без полей не меняет запись и возвращает её", () => {
    const word = createWord(db, { deckId, foreignWord: "cat", nativeWord: "кот" });
    const updated = updateWord(db, word.id, {});
    expect(updated?.native_word).toBe("кот");
  });
});

describe("deleteWord", () => {
  it("удаляет слово и возвращает true; повторное удаление — false", () => {
    const word = createWord(db, { deckId, foreignWord: "cat", nativeWord: "кот" });
    expect(deleteWord(db, word.id)).toBe(true);
    expect(getWord(db, word.id)).toBeUndefined();
    expect(deleteWord(db, word.id)).toBe(false);
  });
});

describe("audio_url", () => {
  it("по умолчанию audio_url = null", () => {
    const word = createWord(db, { deckId, foreignWord: "cat", nativeWord: "кот" });
    expect(word.audio_url).toBeNull();
  });

  it("сохраняет переданный audioUrl", () => {
    const word = createWord(db, {
      deckId,
      foreignWord: "cat",
      nativeWord: "кот",
      audioUrl: "/uploads/audio/x.mp3",
    });
    expect(word.audio_url).toBe("/uploads/audio/x.mp3");
  });

  it("updateWord обновляет audioUrl", () => {
    const word = createWord(db, { deckId, foreignWord: "cat", nativeWord: "кот" });
    const updated = updateWord(db, word.id, { audioUrl: "/uploads/audio/y.mp3" });
    expect(updated?.audio_url).toBe("/uploads/audio/y.mp3");
  });
});
