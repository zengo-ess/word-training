import type Database from "better-sqlite3";
import type { WordRow } from "../words/words.repository.js";
import type { ProgressRow } from "../training/progress.repository.js";

export interface DeckWithStats {
  id: string;
  name: string;
  is_builtin: number;
  created_at: string;
  total: number;
  learned: number;
}

export function listDecksWithStats(db: Database.Database, userId: string): DeckWithStats[] {
  return db
    .prepare(
      `SELECT d.id, d.name, d.is_builtin, d.created_at,
         (SELECT COUNT(*) FROM words w WHERE w.deck_id = d.id) AS total,
         (SELECT COUNT(*) FROM words w
            JOIN progress p ON p.word_id = w.id AND p.user_id = ?
            WHERE w.deck_id = d.id AND p.learned_at IS NOT NULL) AS learned
       FROM decks d
       WHERE d.is_builtin = 1 OR d.user_id = ?
       ORDER BY d.is_builtin DESC, d.created_at ASC`,
    )
    .all(userId, userId) as DeckWithStats[];
}

export interface WordWithProgress extends WordRow {
  progress: ProgressRow | null;
}

interface JoinedRow extends WordRow {
  p_id: string | null;
  p_current_type: number | null;
  p_learned_at: string | null;
  p_ease_factor: number | null;
  p_interval_days: number | null;
  p_next_review_at: string | null;
  p_total_reviews: number | null;
  p_correct_reviews: number | null;
}

export function listWordsWithProgress(
  db: Database.Database,
  deckId: string,
  userId: string,
): WordWithProgress[] {
  const rows = db
    .prepare(
      `SELECT w.*,
         p.id AS p_id, p.current_type AS p_current_type, p.learned_at AS p_learned_at,
         p.ease_factor AS p_ease_factor, p.interval_days AS p_interval_days,
         p.next_review_at AS p_next_review_at, p.total_reviews AS p_total_reviews,
         p.correct_reviews AS p_correct_reviews
       FROM words w
       LEFT JOIN progress p ON p.word_id = w.id AND p.user_id = ?
       WHERE w.deck_id = ?
       ORDER BY w.created_at ASC`,
    )
    .all(userId, deckId) as JoinedRow[];

  return rows.map((r) => {
    const {
      p_id,
      p_current_type,
      p_learned_at,
      p_ease_factor,
      p_interval_days,
      p_next_review_at,
      p_total_reviews,
      p_correct_reviews,
      ...word
    } = r;
    const progress: ProgressRow | null =
      p_id === null
        ? null
        : {
            id: p_id,
            word_id: word.id,
            current_type: p_current_type,
            learned_at: p_learned_at,
            ease_factor: p_ease_factor as number,
            interval_days: p_interval_days as number,
            next_review_at: p_next_review_at,
            total_reviews: p_total_reviews as number,
            correct_reviews: p_correct_reviews as number,
          };
    return { ...word, progress };
  });
}
