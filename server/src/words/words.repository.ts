import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

export interface WordRow {
  id: string;
  deck_id: string;
  english: string;
  russian: string;
  transcription: string | null;
  example_sentence: string | null;
  image_url: string | null;
  created_at: string;
}

export interface NewWord {
  deckId: string;
  english: string;
  russian: string;
  transcription?: string | null;
  exampleSentence?: string | null;
  imageUrl?: string | null;
}

export interface WordUpdate {
  english?: string;
  russian?: string;
  transcription?: string | null;
  exampleSentence?: string | null;
  imageUrl?: string | null;
}

export function getWord(db: Database.Database, id: string): WordRow | undefined {
  return db.prepare("SELECT * FROM words WHERE id = ?").get(id) as WordRow | undefined;
}

export function listWordsByDeck(db: Database.Database, deckId: string): WordRow[] {
  return db
    .prepare("SELECT * FROM words WHERE deck_id = ? ORDER BY created_at ASC")
    .all(deckId) as WordRow[];
}

export function createWord(db: Database.Database, word: NewWord): WordRow {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO words (id, deck_id, english, russian, transcription, example_sentence, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    word.deckId,
    word.english,
    word.russian,
    word.transcription ?? null,
    word.exampleSentence ?? null,
    word.imageUrl ?? null,
  );
  return getWord(db, id) as WordRow;
}

export function updateWord(
  db: Database.Database,
  id: string,
  update: WordUpdate,
): WordRow | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (update.english !== undefined) {
    fields.push("english = ?");
    values.push(update.english);
  }
  if (update.russian !== undefined) {
    fields.push("russian = ?");
    values.push(update.russian);
  }
  if (update.transcription !== undefined) {
    fields.push("transcription = ?");
    values.push(update.transcription);
  }
  if (update.exampleSentence !== undefined) {
    fields.push("example_sentence = ?");
    values.push(update.exampleSentence);
  }
  if (update.imageUrl !== undefined) {
    fields.push("image_url = ?");
    values.push(update.imageUrl);
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE words SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }
  return getWord(db, id);
}

export function deleteWord(db: Database.Database, id: string): boolean {
  const result = db.prepare("DELETE FROM words WHERE id = ?").run(id);
  return result.changes > 0;
}
