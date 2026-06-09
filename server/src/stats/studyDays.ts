import type Database from "better-sqlite3";

export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function recordStudyDay(db: Database.Database, day: string): void {
  db.prepare("INSERT OR IGNORE INTO study_days (day) VALUES (?)").run(day);
}

export function computeStreak(db: Database.Database, now: Date): number {
  const rows = db.prepare("SELECT day FROM study_days").all() as { day: string }[];
  const days = new Set(rows.map((r) => r.day));
  if (days.size === 0) {
    return 0;
  }

  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!days.has(isoDay(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!days.has(isoDay(cursor))) {
      return 0;
    }
  }

  let streak = 0;
  while (days.has(isoDay(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
