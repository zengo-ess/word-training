import type Database from "better-sqlite3";
import type { WordRow } from "../words/words.repository.js";
import type { ProgressRow } from "./progress.repository.js";

export interface LearnableWord {
  word: WordRow;
  currentType: number;
}

export interface DueReview {
  word: WordRow;
  progress: ProgressRow;
}

interface LearnableRow extends WordRow {
  p_current_type: number | null;
}

export function listLearnableWords(
  db: Database.Database,
  userId: string,
  limit: number,
  language: string,
  deckId?: string,
): LearnableWord[] {
  const rows = db
    .prepare(
      `SELECT w.*, p.current_type AS p_current_type
       FROM words w
       JOIN decks d ON d.id = w.deck_id
       LEFT JOIN progress p ON p.word_id = w.id AND p.user_id = ?
       WHERE (d.is_builtin = 1 OR d.user_id = ?) AND d.language = ?
         AND (p.id IS NULL OR p.learned_at IS NULL)
         AND (? IS NULL OR w.deck_id = ?)
       ORDER BY w.created_at ASC
       LIMIT ?`,
    )
    .all(userId, userId, language, deckId ?? null, deckId ?? null, limit) as LearnableRow[];

  return rows.map((row) => {
    const { p_current_type, ...word } = row;
    return { word, currentType: p_current_type ?? 1 };
  });
}

interface DueRow {
  w_id: string;
  deck_id: string;
  foreign_word: string;
  native_word: string;
  transcription: string | null;
  example_sentence: string | null;
  image_url: string | null;
  audio_url: string | null;
  w_created_at: string;
  p_id: string;
  current_type: number | null;
  learned_at: string | null;
  ease_factor: number;
  interval_days: number;
  next_review_at: string | null;
  total_reviews: number;
  correct_reviews: number;
}

export function listDueReviews(
  db: Database.Database,
  userId: string,
  nowIso: string,
  language: string,
  deckId?: string,
): DueReview[] {
  const rows = db
    .prepare(
      `SELECT
         w.id AS w_id, w.deck_id, w.foreign_word, w.native_word, w.transcription,
         w.example_sentence, w.image_url, w.audio_url, w.created_at AS w_created_at,
         p.id AS p_id, p.current_type, p.learned_at, p.ease_factor, p.interval_days,
         p.next_review_at, p.total_reviews, p.correct_reviews
       FROM progress p
       JOIN words w ON w.id = p.word_id
       JOIN decks d ON d.id = w.deck_id
       WHERE p.user_id = ? AND p.learned_at IS NOT NULL AND p.next_review_at <= ? AND d.language = ?
         AND (? IS NULL OR w.deck_id = ?)
       ORDER BY p.next_review_at ASC`,
    )
    .all(userId, nowIso, language, deckId ?? null, deckId ?? null) as DueRow[];

  return rows.map((r) => ({
    word: {
      id: r.w_id,
      deck_id: r.deck_id,
      foreign_word: r.foreign_word,
      native_word: r.native_word,
      transcription: r.transcription,
      example_sentence: r.example_sentence,
      image_url: r.image_url,
      audio_url: r.audio_url,
      created_at: r.w_created_at,
    },
    progress: {
      id: r.p_id,
      word_id: r.w_id,
      current_type: r.current_type,
      learned_at: r.learned_at,
      ease_factor: r.ease_factor,
      interval_days: r.interval_days,
      next_review_at: r.next_review_at,
      total_reviews: r.total_reviews,
      correct_reviews: r.correct_reviews,
    },
  }));
}
