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
        { english: "sun", russian: "солнце", transcription: "/sʌn/", example: "The ___ is bright." },
        { english: "moon", russian: "луна", transcription: "/muːn/", example: "The ___ is full tonight." },
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
      | { id: string; is_builtin: number }
      | undefined;
    expect(deck).toBeDefined();
    expect(deck?.is_builtin).toBe(1);

    const words = db
      .prepare("SELECT english, russian, transcription, example_sentence FROM words WHERE deck_id = ?")
      .all(deck?.id) as { english: string; example_sentence: string }[];
    expect(words).toHaveLength(2);
    expect(words[0].english).toBe("sun");
    expect(words[0].example_sentence).toContain("___");
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
});
