/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "../migrate.js";

function tableNames(db: Database.Database): string[] {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((row) => (row as { name: string }).name);
}

describe("runMigrations", () => {
  it("создаёт таблицы decks, words, progress на чистой БД", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const tables = tableNames(db);
    expect(tables).toContain("decks");
    expect(tables).toContain("words");
    expect(tables).toContain("progress");
  });

  it("идемпотентен — повторный прогон не падает", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
  });
});

describe("отслеживание применённых миграций", () => {
  it("повторный прогон не применяет миграции дважды", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const first = db.prepare("SELECT COUNT(*) AS c FROM _migrations").get() as { c: number };
    runMigrations(db);
    const second = db.prepare("SELECT COUNT(*) AS c FROM _migrations").get() as { c: number };
    expect(first.c).toBeGreaterThan(0);
    expect(second.c).toBe(first.c);
  });
});
