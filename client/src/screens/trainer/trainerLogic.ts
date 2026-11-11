import type { Word } from "../../api/types";

export function shuffle<T>(arr: T[]): T[] {
  const r = [...arr];
  for (let i = r.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

// Даже случайное совпадение с предыдущим этапом убираем, если слов больше одного.
export function shuffleQueue(ids: string[], previous: string[] = []): string[] {
  const next = shuffle(ids);
  if (next.length > 1 && next.length === previous.length && next.every((id, index) => id === previous[index])) {
    const offset = 1 + Math.floor(Math.random() * (next.length - 1));
    return [...next.slice(offset), ...next.slice(0, offset)];
  }
  return next;
}

export function buildChoices(
  word: Word,
  pool: Word[],
  lang: "ru" | "en",
): { opts: string[]; correct: string } {
  const field = lang === "ru" ? "native_word" : "foreign_word";
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

// Пустая очередь означает, что шаг недоступен для этого батча: тип 3 требует
// примера с пропуском, тип 5 — включённой озвучки.
export function buildQueue(batch: Word[], type: number, ttsEnabled = true): string[] {
  if (type === 5 && !ttsEnabled) {
    return [];
  }
  return batch.filter((w) => type !== 3 || w.example_sentence != null).map((w) => w.id);
}

// «Вставь пропуск» временно скрыт; номера типов в данных сохраняем.
export const ALL_TYPES = [1, 2, 4, 5];

// Шаги, которые реально можно пройти на этом батче — по ним считается прогресс
// и определяется момент завершения
export function availableTypes(batch: Word[], ttsEnabled: boolean): number[] {
  return ALL_TYPES.filter((type) => buildQueue(batch, type, ttsEnabled).length > 0);
}
