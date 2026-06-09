import type { Word } from "../../api/types";

export function shuffle<T>(arr: T[]): T[] {
  const r = [...arr];
  for (let i = r.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export function buildChoices(
  word: Word,
  pool: Word[],
  lang: "ru" | "en",
): { opts: string[]; correct: string } {
  const field = lang === "ru" ? "russian" : "english";
  const correct = word[field] as string;
  const others = [...new Set(pool.filter((w) => w.id !== word.id).map((w) => w[field] as string))];
  const picks: string[] = [];
  const shuffled = shuffle(others);
  for (const o of shuffled) {
    if (picks.length >= 3) break;
    if (o !== correct) picks.push(o);
  }
  while (picks.length < 3) picks.push(["—", "...", "???"][picks.length] ?? "—");
  const opts = shuffle([...picks, correct]);
  return { opts, correct };
}

export function buildQueue(batch: Word[], type: number): string[] {
  return batch.filter((w) => type !== 3 || w.example_sentence != null).map((w) => w.id);
}
