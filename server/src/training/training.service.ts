import type Database from "better-sqlite3";
import { getProgress, upsertProgress, type ProgressRow } from "./progress.repository.js";
import {
  listLearnableWords,
  listDueReviews,
  type LearnableWord,
  type DueReview,
} from "./training.repository.js";
import { initialSchedule, reviewSchedule } from "./sm2.js";

export interface TrainingToday {
  newWords: LearnableWord[];
  reviewWords: DueReview[];
}

export function getTodayTraining(
  db: Database.Database,
  userId: string,
  now: Date,
  language: string,
  batchSize = 20,
  deckId?: string,
): TrainingToday {
  return {
    newWords: listLearnableWords(db, userId, batchSize, language, deckId),
    reviewWords: listDueReviews(db, userId, now.toISOString(), language, deckId),
  };
}

export function recordLearningStep(
  db: Database.Database,
  userId: string,
  wordId: string,
  currentType: number,
): ProgressRow {
  return upsertProgress(db, userId, wordId, { currentType });
}

export function markLearned(
  db: Database.Database,
  userId: string,
  wordId: string,
  now: Date,
): ProgressRow {
  const schedule = initialSchedule(now);
  return upsertProgress(db, userId, wordId, {
    currentType: null,
    learnedAt: now.toISOString(),
    easeFactor: schedule.easeFactor,
    intervalDays: schedule.intervalDays,
    nextReviewAt: schedule.nextReviewAt,
  });
}

export function recordReview(
  db: Database.Database,
  userId: string,
  wordId: string,
  correct: boolean,
  now: Date,
): ProgressRow | undefined {
  const progress = getProgress(db, userId, wordId);
  if (!progress || progress.learned_at === null) {
    return undefined;
  }
  const schedule = reviewSchedule(
    { intervalDays: progress.interval_days, easeFactor: progress.ease_factor },
    correct,
    now,
  );
  return upsertProgress(db, userId, wordId, {
    easeFactor: schedule.easeFactor,
    intervalDays: schedule.intervalDays,
    nextReviewAt: schedule.nextReviewAt,
    totalReviews: progress.total_reviews + 1,
    correctReviews: progress.correct_reviews + (correct ? 1 : 0),
  });
}
