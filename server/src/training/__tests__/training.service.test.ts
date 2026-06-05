/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../../db/connection.js";
import { runMigrations } from "../../db/migrate.js";
import { createDeck } from "../../decks/decks.repository.js";
import { createWord } from "../../words/words.repository.js";
import { getProgress, upsertProgress } from "../progress.repository.js";
import {
  getTodayTraining,
  recordLearningStep,
  markLearned,
  recordReview,
} from "../training.service.js";

const NOW = new Date("2026-06-05T12:00:00.000Z");
let db: Database.Database;
let deckId: string;

beforeEach(() => {
  db = createConnection(":memory:");
  runMigrations(db);
  deckId = createDeck(db, "Колода").id;
});

describe("getTodayTraining", () => {
  it("разделяет новые слова и повторения", () => {
    createWord(db, { deckId, english: "cat", russian: "кот" });
    const reviewId = createWord(db, { deckId, english: "dog", russian: "собака" }).id;
    upsertProgress(db, reviewId, {
      currentType: null,
      learnedAt: "2026-06-01T12:00:00.000Z",
      nextReviewAt: "2026-06-02T12:00:00.000Z",
    });
    const today = getTodayTraining(db, NOW);
    expect(today.newWords).toHaveLength(1);
    expect(today.newWords[0].word.english).toBe("cat");
    expect(today.reviewWords).toHaveLength(1);
    expect(today.reviewWords[0].word.english).toBe("dog");
  });
});

describe("recordLearningStep", () => {
  it("сохраняет текущий тип упражнения", () => {
    const id = createWord(db, { deckId, english: "cat", russian: "кот" }).id;
    const progress = recordLearningStep(db, id, 4);
    expect(progress.current_type).toBe(4);
    expect(progress.learned_at).toBeNull();
  });
});

describe("markLearned", () => {
  it("переводит слово в SR: learned_at + первый повтор через 1 день", () => {
    const id = createWord(db, { deckId, english: "cat", russian: "кот" }).id;
    recordLearningStep(db, id, 5);
    const progress = markLearned(db, id, NOW);
    expect(progress.current_type).toBeNull();
    expect(progress.learned_at).toBe("2026-06-05T12:00:00.000Z");
    expect(progress.interval_days).toBe(1);
    expect(progress.next_review_at).toBe("2026-06-06T12:00:00.000Z");
  });
});

describe("recordReview", () => {
  it("верный повтор двигает интервал и счётчики", () => {
    const id = createWord(db, { deckId, english: "cat", russian: "кот" }).id;
    markLearned(db, id, NOW);
    const progress = recordReview(db, id, true, NOW);
    expect(progress?.interval_days).toBe(3);
    expect(progress?.total_reviews).toBe(1);
    expect(progress?.correct_reviews).toBe(1);
    expect(progress?.next_review_at).toBe("2026-06-08T12:00:00.000Z");
  });

  it("неверный повтор сбрасывает интервал, correct_reviews не растёт", () => {
    const id = createWord(db, { deckId, english: "cat", russian: "кот" }).id;
    markLearned(db, id, NOW);
    recordReview(db, id, true, NOW);
    const progress = recordReview(db, id, false, NOW);
    expect(progress?.interval_days).toBe(1);
    expect(progress?.total_reviews).toBe(2);
    expect(progress?.correct_reviews).toBe(1);
  });

  it("возвращает undefined, если слово ещё не выучено", () => {
    const id = createWord(db, { deckId, english: "cat", russian: "кот" }).id;
    recordLearningStep(db, id, 2);
    expect(recordReview(db, id, true, NOW)).toBeUndefined();
    expect(getProgress(db, id)?.learned_at).toBeNull();
  });
});
