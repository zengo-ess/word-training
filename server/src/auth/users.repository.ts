import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

export interface UserRow {
  id: string;
  name: string;
  password_hash: string;
  created_at: string;
}

export interface PublicUser {
  id: string;
  name: string;
}

export function createUser(db: Database.Database, name: string, passwordHash: string): UserRow {
  const id = randomUUID();
  db.prepare("INSERT INTO users (id, name, password_hash) VALUES (?, ?, ?)").run(id, name, passwordHash);
  return getUser(db, id) as UserRow;
}

export function getUser(db: Database.Database, id: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export function getUserByName(db: Database.Database, name: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE name = ?").get(name) as UserRow | undefined;
}

export function listUsers(db: Database.Database): PublicUser[] {
  return db.prepare("SELECT id, name FROM users ORDER BY created_at ASC").all() as PublicUser[];
}
