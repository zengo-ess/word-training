import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

export interface UserRow {
  id: string;
  name: string;
  password_hash: string;
  language: string;
  daily_goal: number;
  tts_enabled: number;
  review_direction: string;
  created_at: string;
}

export interface PublicUser {
  id: string;
  name: string;
  language: string;
  daily_goal: number;
  tts_enabled: number;
  review_direction: string;
}

export interface UserSettingsPatch {
  language?: string;
  dailyGoal?: number;
  ttsEnabled?: boolean;
  reviewDirection?: string;
}

const PUBLIC_COLUMNS = "id, name, language, daily_goal, tts_enabled, review_direction";

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    name: user.name,
    language: user.language,
    daily_goal: user.daily_goal,
    tts_enabled: user.tts_enabled,
    review_direction: user.review_direction,
  };
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
  return db
    .prepare(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY created_at ASC`)
    .all() as PublicUser[];
}

// Частичный патч: не переданные поля остаются как были
export function updateUserSettings(
  db: Database.Database,
  id: string,
  patch: UserSettingsPatch,
): UserRow | undefined {
  const assignments: string[] = [];
  const values: (string | number)[] = [];

  if (patch.language !== undefined) {
    assignments.push("language = ?");
    values.push(patch.language);
  }
  if (patch.dailyGoal !== undefined) {
    assignments.push("daily_goal = ?");
    values.push(patch.dailyGoal);
  }
  if (patch.ttsEnabled !== undefined) {
    assignments.push("tts_enabled = ?");
    values.push(patch.ttsEnabled ? 1 : 0);
  }
  if (patch.reviewDirection !== undefined) {
    assignments.push("review_direction = ?");
    values.push(patch.reviewDirection);
  }

  if (assignments.length > 0) {
    db.prepare(`UPDATE users SET ${assignments.join(", ")} WHERE id = ?`).run(...values, id);
  }
  return getUser(db, id);
}
