import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

export interface DeckRow {
  id: string;
  name: string;
  is_builtin: number;
  created_at: string;
}

export function listDecks(db: Database.Database): DeckRow[] {
  return db
    .prepare("SELECT * FROM decks ORDER BY is_builtin DESC, created_at ASC")
    .all() as DeckRow[];
}

export function getDeck(db: Database.Database, id: string): DeckRow | undefined {
  return db.prepare("SELECT * FROM decks WHERE id = ?").get(id) as DeckRow | undefined;
}

export function createDeck(db: Database.Database, name: string): DeckRow {
  const id = randomUUID();
  db.prepare("INSERT INTO decks (id, name, is_builtin) VALUES (?, ?, 0)").run(id, name);
  return getDeck(db, id) as DeckRow;
}
