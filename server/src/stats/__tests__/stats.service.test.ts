/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../../db/connection.js";
import { runMigrations } from "../../db/migrate.js";
import { createUser } from "../../auth/users.repository.js";
import { createDeck } from "../../decks/decks.repository.js";
import { createWord } from "../../words/words.repository.js";
import { upsertProgress } from "../../training/progress.repository.js";
import { recordStudyDay } from "../studyDays.js";
import { getStats } from "../stats.service.js";

const NOW = new Date("2026-06-09T12:00:00.000Z");
let db: Database.Database;
let userId: string;
let deckId: string;

beforeEach(() => {
  db = createConnection(":memory:");
  runMigrations(db);
  userId = createUser(db, "Тестер", "salt:hash").id;
  deckId = createDeck(db, "Еда", userId, "en").id;
});

describe("getStats", () => {
  it("считает learned / inProgress / dueToday / стрик", () => {
    const learnedId = createWord(db, { deckId, foreignWord: "apple", nativeWord: "яблоко" }).id;
    const dueId = createWord(db, { deckId, foreignWord: "bread", nativeWord: "хлеб" }).id;
    const inProgressId = createWord(db, { deckId, foreignWord: "milk", nativeWord: "молоко" }).id;

    upsertProgress(db, userId, learnedId, {
      currentType: null,
      learnedAt: "2026-06-09T08:00:00.000Z",
      nextReviewAt: "2026-06-20T00:00:00.000Z",
    });
    upsertProgress(db, userId, dueId, {
      currentType: null,
      learnedAt: "2026-06-01T00:00:00.000Z",
      nextReviewAt: "2026-06-02T00:00:00.000Z",
    });
    upsertProgress(db, userId, inProgressId, { currentType: 2 });
    recordStudyDay(db, userId, "2026-06-09");

    const stats = getStats(db, userId, NOW, "en");
    expect(stats.learned).toBe(2);
    expect(stats.inProgress).toBe(1);
    expect(stats.dueToday).toBe(1);
    expect(stats.learnedToday).toBe(1);
    expect(stats.streak).toBe(1);
    expect(stats.dailyGoal).toBe(20);
    expect(stats.decks.find((d) => d.id === deckId)?.total).toBe(3);
  });
});
