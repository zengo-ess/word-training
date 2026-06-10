import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type Database from "better-sqlite3";

interface SeedWord {
  english: string;
  russian: string;
  transcription: string;
  example: string;
}

interface SeedDeck {
  name: string;
  words: SeedWord[];
}

export function seedBuiltins(db: Database.Database, dataDir: string): void {
  if (!existsSync(dataDir)) {
    return;
  }

  const files = readdirSync(dataDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const deckExists = db.prepare("SELECT id FROM decks WHERE name = ?");
  const insertDeck = db.prepare("INSERT INTO decks (id, name, is_builtin) VALUES (?, ?, 1)");
  const insertWord = db.prepare(
    `INSERT INTO words (id, deck_id, english, russian, transcription, example_sentence)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  const seedDeck = db.transaction((deck: SeedDeck) => {
    const deckId = randomUUID();
    insertDeck.run(deckId, deck.name);
    for (const word of deck.words) {
      insertWord.run(randomUUID(), deckId, word.english, word.russian, word.transcription, word.example);
    }
  });

  for (const file of files) {
    const deck = JSON.parse(readFileSync(join(dataDir, file), "utf8")) as SeedDeck;
    if (deckExists.get(deck.name)) {
      continue;
    }
    seedDeck(deck);
  }
}
