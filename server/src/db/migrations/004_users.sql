CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Старые личные данные не мигрируем (прода нет): чистим словарь от пользовательских колод
DELETE FROM words WHERE deck_id IN (SELECT id FROM decks WHERE is_builtin = 0);
DELETE FROM decks WHERE is_builtin = 0;
ALTER TABLE decks ADD COLUMN user_id TEXT;

DROP TABLE IF EXISTS progress;
CREATE TABLE progress (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id          TEXT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  current_type     INTEGER,
  learned_at       TEXT,
  ease_factor      REAL NOT NULL DEFAULT 2.5,
  interval_days    INTEGER NOT NULL DEFAULT 0,
  next_review_at   TEXT,
  total_reviews    INTEGER NOT NULL DEFAULT 0,
  correct_reviews  INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_user_word ON progress(user_id, word_id);
CREATE INDEX IF NOT EXISTS idx_progress_review ON progress(next_review_at);

DROP TABLE IF EXISTS study_days;
CREATE TABLE study_days (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day     TEXT NOT NULL,
  PRIMARY KEY (user_id, day)
);
