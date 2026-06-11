import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

export interface DeckRow {
  id: string;
  name: string;
  is_builtin: number;
  user_id: string | null;
  created_at: string;
}

export function listDecks(db: Database.Database, userId: string): DeckRow[] {
  return db
    .prepare(
      "SELECT * FROM decks WHERE is_builtin = 1 OR user_id = ? ORDER BY is_builtin DESC, created_at ASC",
    )
    .all(userId) as DeckRow[];
}

export function getDeck(db: Database.Database, id: string): DeckRow | undefined {
  return db.prepare("SELECT * FROM decks WHERE id = ?").get(id) as DeckRow | undefined;
}

export function createDeck(db: Database.Database, name: string, userId: string): DeckRow {
  const id = randomUUID();
  db.prepare("INSERT INTO decks (id, name, is_builtin, user_id) VALUES (?, ?, 0, ?)").run(
    id,
    name,
    userId,
  );
  return getDeck(db, id) as DeckRow;
}

export function canAccessDeck(deck: DeckRow, userId: string): boolean {
  return deck.is_builtin === 1 || deck.user_id === userId;
}
