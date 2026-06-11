/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../../db/connection.js";
import { runMigrations } from "../../db/migrate.js";
import { createUser } from "../../auth/users.repository.js";
import { recordStudyDay, isoDay, computeStreak } from "../studyDays.js";

const NOW = new Date("2026-06-09T12:00:00.000Z");
let db: Database.Database;
let userId: string;

beforeEach(() => {
  db = createConnection(":memory:");
  runMigrations(db);
  userId = createUser(db, "Тестер", "salt:hash").id;
});

describe("isoDay", () => {
  it("форматирует дату как YYYY-MM-DD (UTC)", () => {
    expect(isoDay(NOW)).toBe("2026-06-09");
  });
});

describe("recordStudyDay", () => {
  it("идемпотентен — повтор того же дня не плодит строки", () => {
    recordStudyDay(db, userId, "2026-06-09");
    recordStudyDay(db, userId, "2026-06-09");
    const row = db.prepare("SELECT COUNT(*) AS c FROM study_days").get() as { c: number };
    expect(row.c).toBe(1);
  });
});

describe("computeStreak", () => {
  it("0 без записей", () => {
    expect(computeStreak(db, userId, NOW)).toBe(0);
  });

  it("1 если занимались только сегодня", () => {
    recordStudyDay(db, userId, "2026-06-09");
    expect(computeStreak(db, userId, NOW)).toBe(1);
  });

  it("2 за сегодня и вчера подряд", () => {
    recordStudyDay(db, userId, "2026-06-09");
    recordStudyDay(db, userId, "2026-06-08");
    expect(computeStreak(db, userId, NOW)).toBe(2);
  });

  it("считает до вчера, если сегодня ещё не занимались", () => {
    recordStudyDay(db, userId, "2026-06-08");
    recordStudyDay(db, userId, "2026-06-07");
    expect(computeStreak(db, userId, NOW)).toBe(2);
  });

  it("разрыв обнуляет хвост (только сегодня при пропуске вчера)", () => {
    recordStudyDay(db, userId, "2026-06-09");
    recordStudyDay(db, userId, "2026-06-07");
    expect(computeStreak(db, userId, NOW)).toBe(1);
  });
});
