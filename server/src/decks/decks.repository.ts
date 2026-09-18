import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

export interface DeckRow {
  id: string;
  name: string;
  is_builtin: number;
  user_id: string | null;
  language: string;
  created_at: string;
}

export function listDecks(db: Database.Database, userId: string, language: string): DeckRow[] {
  return db
    .prepare(
      "SELECT * FROM decks WHERE (is_builtin = 1 OR user_id = ?) AND language = ? ORDER BY is_builtin DESC, created_at ASC",
    )
    .all(userId, language) as DeckRow[];
}

export function getDeck(db: Database.Database, id: string): DeckRow | undefined {
  return db.prepare("SELECT * FROM decks WHERE id = ?").get(id) as DeckRow | undefined;
}

export function createDeck(
  db: Database.Database,
  name: string,
  userId: string,
  language: string,
): DeckRow {
  const id = randomUUID();
  db.prepare(
    "INSERT INTO decks (id, name, is_builtin, user_id, language) VALUES (?, ?, 0, ?, ?)",
  ).run(id, name, userId, language);
  return getDeck(db, id) as DeckRow;
}

export function canAccessDeck(deck: DeckRow, userId: string): boolean {
  return deck.is_builtin === 1 || deck.user_id === userId;
}

export function renameDeck(db: Database.Database, id: string, name: string): DeckRow | undefined {
  db.prepare("UPDATE decks SET name = ? WHERE id = ?").run(name, id);
  return getDeck(db, id);
}

// Нужен до удаления колоды: файлы озвучки лежат вне БД и каскадом не удаляются
export function listWordIds(db: Database.Database, deckId: string): string[] {
  const rows = db.prepare("SELECT id FROM words WHERE deck_id = ?").all(deckId) as { id: string }[];
  return rows.map((row) => row.id);
}

// Слова и прогресс по ним уходят каскадом (см. схему + PRAGMA foreign_keys)
export function deleteDeckById(db: Database.Database, id: string): void {
  db.prepare("DELETE FROM decks WHERE id = ?").run(id);
}
