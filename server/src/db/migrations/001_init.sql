CREATE TABLE IF NOT EXISTS decks (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  is_builtin  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS words (
  id                TEXT PRIMARY KEY,
  deck_id           TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  english           TEXT NOT NULL,
  russian           TEXT NOT NULL,
  transcription     TEXT,
  example_sentence  TEXT,
  image_url         TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS progress (
  id               TEXT PRIMARY KEY,
  word_id          TEXT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  current_type     INTEGER,
  learned_at       TEXT,
  ease_factor      REAL NOT NULL DEFAULT 2.5,
  interval_days    INTEGER NOT NULL DEFAULT 0,
  next_review_at   TEXT,
  total_reviews    INTEGER NOT NULL DEFAULT 0,
  correct_reviews  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_words_deck ON words(deck_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_word ON progress(word_id);
CREATE INDEX IF NOT EXISTS idx_progress_review ON progress(next_review_at);
