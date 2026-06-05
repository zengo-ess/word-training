import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

export interface ProgressRow {
  id: string;
  word_id: string;
  current_type: number | null;
  learned_at: string | null;
  ease_factor: number;
  interval_days: number;
  next_review_at: string | null;
  total_reviews: number;
  correct_reviews: number;
}

export interface ProgressFields {
  currentType?: number | null;
  learnedAt?: string | null;
  easeFactor?: number;
  intervalDays?: number;
  nextReviewAt?: string | null;
  totalReviews?: number;
  correctReviews?: number;
}

const COLUMN_BY_FIELD: Record<keyof ProgressFields, string> = {
  currentType: "current_type",
  learnedAt: "learned_at",
  easeFactor: "ease_factor",
  intervalDays: "interval_days",
  nextReviewAt: "next_review_at",
  totalReviews: "total_reviews",
  correctReviews: "correct_reviews",
};

export function getProgress(db: Database.Database, wordId: string): ProgressRow | undefined {
  return db.prepare("SELECT * FROM progress WHERE word_id = ?").get(wordId) as ProgressRow | undefined;
}

export function upsertProgress(
  db: Database.Database,
  wordId: string,
  fields: ProgressFields,
): ProgressRow {
  const existing = getProgress(db, wordId);

  if (existing) {
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const key of Object.keys(fields) as (keyof ProgressFields)[]) {
      if (fields[key] !== undefined) {
        sets.push(`${COLUMN_BY_FIELD[key]} = ?`);
        values.push(fields[key]);
      }
    }
    if (sets.length > 0) {
      values.push(wordId);
      db.prepare(`UPDATE progress SET ${sets.join(", ")} WHERE word_id = ?`).run(...values);
    }
    return getProgress(db, wordId) as ProgressRow;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO progress
       (id, word_id, current_type, learned_at, ease_factor, interval_days, next_review_at, total_reviews, correct_reviews)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    wordId,
    fields.currentType ?? null,
    fields.learnedAt ?? null,
    fields.easeFactor ?? 2.5,
    fields.intervalDays ?? 0,
    fields.nextReviewAt ?? null,
    fields.totalReviews ?? 0,
    fields.correctReviews ?? 0,
  );
  return getProgress(db, wordId) as ProgressRow;
}
