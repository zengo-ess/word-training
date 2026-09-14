ALTER TABLE words RENAME COLUMN english TO foreign_word;
ALTER TABLE words RENAME COLUMN russian TO native_word;

ALTER TABLE decks ADD COLUMN language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'de'));
ALTER TABLE users ADD COLUMN language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'de'));
