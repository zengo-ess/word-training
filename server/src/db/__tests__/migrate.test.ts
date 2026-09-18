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

describe("миграция 006 — настройки пользователя", () => {
  it("добавляет колонки настроек с дефолтами существующим пользователям", () => {
    const db = new Database(":memory:");
    // Состояние до 006: применяем только первые пять миграций и заводим юзера
    db.exec(
      `CREATE TABLE _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    );
    db.prepare("INSERT INTO _migrations (name) VALUES (?)").run("006_user_settings.sql");
    runMigrations(db);
    db.prepare("DELETE FROM _migrations WHERE name = ?").run("006_user_settings.sql");
    db.prepare("INSERT INTO users (id, name, password_hash) VALUES (?, ?, ?)").run(
      "11111111-1111-4111-8111-111111111111",
      "Старый",
      "salt:hash",
    );

    runMigrations(db);

    const user = db
      .prepare("SELECT daily_goal, tts_enabled, review_direction FROM users WHERE name = ?")
      .get("Старый");
    expect(user).toEqual({ daily_goal: 20, tts_enabled: 1, review_direction: "both" });
  });

  it("не даёт сохранить недопустимое направление повторов", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    db.prepare("INSERT INTO users (id, name, password_hash) VALUES (?, ?, ?)").run(
      "22222222-2222-4222-8222-222222222222",
      "Женя",
      "salt:hash",
    );
    expect(() =>
      db.prepare("UPDATE users SET review_direction = ? WHERE name = ?").run("enru", "Женя"),
    ).toThrow();
  });
});
