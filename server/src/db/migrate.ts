import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export function runMigrations(db: Database.Database): void {
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    db.exec(sql);
  }
}
