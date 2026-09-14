/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import { runMigrations } from "../migrate.js";
import { seedBuiltins } from "../seedBuiltins.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "wt-seed-"));
  writeFileSync(
    join(dir, "01-test.json"),
    JSON.stringify({
      name: "Тестовая",
      words: [
        { word: "sun", russian: "солнце", transcription: "/sʌn/", example: "The ___ is bright." },
        { word: "moon", russian: "луна", transcription: "/muːn/", example: "The ___ is full tonight." },
      ],
    }),
  );
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("seedBuiltins", () => {
  it("заливает колоду с is_builtin=1 и словами", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    seedBuiltins(db, dir);

    const deck = db.prepare("SELECT * FROM decks WHERE name = ?").get("Тестовая") as
      | { id: string; is_builtin: number; language: string }
      | undefined;
    expect(deck).toBeDefined();
    expect(deck?.is_builtin).toBe(1);
    expect(deck?.language).toBe("en");

    const words = db
      .prepare("SELECT foreign_word, native_word, transcription, example_sentence FROM words WHERE deck_id = ?")
      .all(deck?.id) as { foreign_word: string; example_sentence: string }[];
    expect(words).toHaveLength(2);
    expect(words[0].foreign_word).toBe("sun");
    expect(words[0].example_sentence).toContain("___");
  });

  it("сидирует колоду с явным language: 'de'", () => {
    writeFileSync(
      join(dir, "02-test-de.json"),
      JSON.stringify({
        name: "Немецкая тестовая",
        language: "de",
        words: [{ word: "Sonne", russian: "солнце", transcription: "/ˈzɔnə/", example: "Die ___ scheint." }],
      }),
    );
    const db = new Database(":memory:");
    runMigrations(db);
    seedBuiltins(db, dir);

    const deck = db.prepare("SELECT * FROM decks WHERE name = ?").get("Немецкая тестовая") as
      | { language: string }
      | undefined;
    expect(deck?.language).toBe("de");
  });

  it("колода с тем же именем, но другим языком — отдельная колода, а не backfill", () => {
    writeFileSync(
      join(dir, "02-test-de.json"),
      JSON.stringify({
        name: "Тестовая",
        language: "de",
        words: [{ word: "Sonne", russian: "солнце", transcription: "/ˈzɔnə/", example: "Die ___ scheint." }],
      }),
    );
    const db = new Database(":memory:");
    runMigrations(db);
    seedBuiltins(db, dir);

    const decks = db.prepare("SELECT name, language FROM decks ORDER BY language").all() as {
      name: string;
      language: string;
    }[];
    expect(decks).toEqual([
      { name: "Тестовая", language: "de" },
      { name: "Тестовая", language: "en" },
    ]);
    const words = db.prepare("SELECT COUNT(*) AS c FROM words").get() as { c: number };
    expect(words.c).toBe(3);
  });

  it("идемпотентен — повторный прогон не дублирует", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    seedBuiltins(db, dir);
    seedBuiltins(db, dir);

    const decks = db.prepare("SELECT COUNT(*) AS c FROM decks").get() as { c: number };
    const words = db.prepare("SELECT COUNT(*) AS c FROM words").get() as { c: number };
    expect(decks.c).toBe(1);
    expect(words.c).toBe(2);
  });

  it("не падает если директории нет", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    expect(() => seedBuiltins(db, join(dir, "nope"))).not.toThrow();
  });

  it("пишет image_url из imageUrl при первичном сидинге", () => {
    writeFileSync(
      join(dir, "01-test.json"),
      JSON.stringify({
        name: "Тестовая",
        words: [
          {
            word: "sun",
            russian: "солнце",
            transcription: "/sʌn/",
            example: "The ___ is bright.",
            imageUrl: "https://images.unsplash.com/photo-sun",
          },
          { word: "moon", russian: "луна", transcription: "/muːn/", example: "The ___ is full tonight." },
        ],
      }),
    );

    const db = new Database(":memory:");
    runMigrations(db);
    seedBuiltins(db, dir);

    const rows = db.prepare("SELECT foreign_word, image_url FROM words ORDER BY foreign_word").all() as {
      foreign_word: string;
      image_url: string | null;
    }[];
    expect(rows).toEqual([
      { foreign_word: "moon", image_url: null },
      { foreign_word: "sun", image_url: "https://images.unsplash.com/photo-sun" },
    ]);
  });

  it("дозаполняет image_url у уже засеянной колоды, не трогая занятые", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    seedBuiltins(db, dir);

    db.prepare("UPDATE words SET image_url = ? WHERE foreign_word = ?").run(
      "https://example.com/custom-moon",
      "moon",
    );

    writeFileSync(
      join(dir, "01-test.json"),
      JSON.stringify({
        name: "Тестовая",
        words: [
          {
            word: "sun",
            russian: "солнце",
            transcription: "/sʌn/",
            example: "The ___ is bright.",
            imageUrl: "https://images.unsplash.com/photo-sun",
          },
          {
            word: "moon",
            russian: "луна",
            transcription: "/muːn/",
            example: "The ___ is full tonight.",
            imageUrl: "https://images.unsplash.com/photo-moon",
          },
        ],
      }),
    );
    seedBuiltins(db, dir);

    const rows = db.prepare("SELECT foreign_word, image_url FROM words ORDER BY foreign_word").all() as {
      foreign_word: string;
      image_url: string | null;
    }[];
    expect(rows).toEqual([
      { foreign_word: "moon", image_url: "https://example.com/custom-moon" },
      { foreign_word: "sun", image_url: "https://images.unsplash.com/photo-sun" },
    ]);

    const words = db.prepare("SELECT COUNT(*) AS c FROM words").get() as { c: number };
    expect(words.c).toBe(2);
  });
});
