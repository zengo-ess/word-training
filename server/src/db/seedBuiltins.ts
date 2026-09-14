import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type Database from "better-sqlite3";

interface SeedWord {
  word: string;
  russian: string;
  transcription: string;
  example: string;
  imageUrl?: string;
}

interface SeedDeck {
  name: string;
  language?: "en" | "de";
  words: SeedWord[];
}

export function seedBuiltins(db: Database.Database, dataDir: string): void {
  if (!existsSync(dataDir)) {
    return;
  }

  const files = readdirSync(dataDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const deckExists = db.prepare("SELECT id FROM decks WHERE name = ? AND language = ?");
  const insertDeck = db.prepare(
    "INSERT INTO decks (id, name, is_builtin, language) VALUES (?, ?, 1, ?)",
  );
  const insertWord = db.prepare(
    `INSERT INTO words (id, deck_id, foreign_word, native_word, transcription, example_sentence, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const backfillImage = db.prepare(
    "UPDATE words SET image_url = ? WHERE deck_id = ? AND foreign_word = ? AND image_url IS NULL",
  );

  const seedDeck = db.transaction((deck: SeedDeck) => {
    const deckId = randomUUID();
    insertDeck.run(deckId, deck.name, deck.language ?? "en");
    for (const word of deck.words) {
      insertWord.run(
        randomUUID(),
        deckId,
        word.word,
        word.russian,
        word.transcription,
        word.example,
        word.imageUrl ?? null,
      );
    }
  });

  const backfillDeck = db.transaction((deckId: string, deck: SeedDeck) => {
    for (const word of deck.words) {
      if (word.imageUrl) {
        backfillImage.run(word.imageUrl, deckId, word.word);
      }
    }
  });

  for (const file of files) {
    const deck = JSON.parse(readFileSync(join(dataDir, file), "utf8")) as SeedDeck;
    const existing = deckExists.get(deck.name, deck.language ?? "en") as { id: string } | undefined;
    if (existing) {
      backfillDeck(existing.id, deck);
      continue;
    }
    seedDeck(deck);
  }
}
