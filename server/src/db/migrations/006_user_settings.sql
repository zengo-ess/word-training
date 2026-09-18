ALTER TABLE users ADD COLUMN daily_goal INTEGER NOT NULL DEFAULT 20
  CHECK (daily_goal > 0);
ALTER TABLE users ADD COLUMN tts_enabled INTEGER NOT NULL DEFAULT 1
  CHECK (tts_enabled IN (0, 1));
ALTER TABLE users ADD COLUMN review_direction TEXT NOT NULL DEFAULT 'both'
  CHECK (review_direction IN ('toNative', 'toForeign', 'both'));
