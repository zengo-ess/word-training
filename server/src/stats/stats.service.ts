import type Database from "better-sqlite3";
import { listDecksWithStats, type DeckWithStats } from "../decks/deckStats.repository.js";
import { computeStreak, isoDay } from "./studyDays.js";

export const DAILY_GOAL = 20;

export interface Stats {
  learned: number;
  inProgress: number;
  dueToday: number;
  learnedToday: number;
  dailyGoal: number;
  streak: number;
  week: boolean[];
  decks: DeckWithStats[];
}

export function getStats(db: Database.Database, now: Date): Stats {
  const nowIso = now.toISOString();
  const today = isoDay(now);

  const learned = (
    db.prepare("SELECT COUNT(*) AS c FROM progress WHERE learned_at IS NOT NULL").get() as { c: number }
  ).c;
  const inProgress = (
    db.prepare("SELECT COUNT(*) AS c FROM progress WHERE learned_at IS NULL").get() as { c: number }
  ).c;
  const dueToday = (
    db
      .prepare("SELECT COUNT(*) AS c FROM progress WHERE learned_at IS NOT NULL AND next_review_at <= ?")
      .get(nowIso) as { c: number }
  ).c;
  const learnedToday = (
    db
      .prepare("SELECT COUNT(*) AS c FROM progress WHERE learned_at IS NOT NULL AND substr(learned_at, 1, 10) = ?")
      .get(today) as { c: number }
  ).c;

  const studyRows = db.prepare("SELECT day FROM study_days").all() as { day: string }[];
  const studyDays = new Set(studyRows.map((r) => r.day));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - (6 - i));
    return studyDays.has(isoDay(d));
  });

  return {
    learned,
    inProgress,
    dueToday,
    learnedToday,
    dailyGoal: DAILY_GOAL,
    streak: computeStreak(db, now),
    week,
    decks: listDecksWithStats(db),
  };
}
