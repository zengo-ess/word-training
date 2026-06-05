# Training Engine & Spaced Repetition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Бэкенд тренажёра: хранить прогресс по словам, отдавать «слова на сегодня» (новые + повторения), фиксировать результаты обучения и применять spaced repetition по SM-2.

**Architecture:** Чистый модуль `sm2` считает расписание повторений (без БД). `progress.repository` — апсерт/чтение строки прогресса по `word_id`. `training.repository` — два запроса с джойном (изучаемые слова и слова к повторению). `training.service` объединяет их и применяет SM-2. `training.routes` отдаёт `GET /api/training/today` и `POST /api/training/result`, монтируется за авторизацией. Послойную логику сессии (батч/очередь/ошибки) выполняет фронтенд (План 5-6) — бэкенд хранит только состояние прогресса каждого слова.

**Tech Stack:** Express, better-sqlite3, vitest.

---

## Состояния прогресса слова

Таблица `progress` уже создана (миграция 001). Жизненный цикл по `word_id`:

- **нет строки** → слово новое, ни разу не тронуто (для тренировки считается `current_type = 1`).
- **строка, `learned_at IS NULL`** → слово в фазе изучения; `current_type` (1..5) — где оно сейчас (для возобновления сессии).
- **строка, `learned_at IS NOT NULL`** → слово выучено и в фазе повторений (SR); `current_type = null`, заполнены SM-2 поля; повторяется когда `next_review_at <= сейчас`.

Даты `learned_at` / `next_review_at` храним как ISO-строки UTC (`Date.toISOString()`) — лексикографически сравнимы.

## SM-2 (по спеке)

- После изучения: 1-й повтор через **1 день** (`interval_days = 1`, `ease_factor = 2.5`).
- Верный повтор: `1 → 3 → 7 → round(interval × ease_factor)` дней; `ease += 0.1` (потолок 2.5).
- Неверный повтор: сброс — `interval_days = 1`, повтор завтра; `ease -= 0.2` (пол 1.3).

---

## File Structure

```
server/src/training/
  sm2.ts                       # чистая математика расписания
  progress.repository.ts       # getProgress, upsertProgress
  training.repository.ts       # listLearnableWords, listDueReviews
  training.service.ts          # getTodayTraining, recordLearningStep, markLearned, recordReview
  training.routes.ts           # GET /today, POST /result
  __tests__/sm2.test.ts
  __tests__/progress.repository.test.ts
  __tests__/training.repository.test.ts
  __tests__/training.service.test.ts
server/src/app.ts              # МОДИФИЦИРУЕТСЯ: монтирование /api/training за авторизацией
```

**Конвенции (глобальные правила):** только `import`; никогда слова `required`; id — guid; тест-файлы начинаются с двух eslint-disable строк; НЕ интеграционные тесты (репозитории/сервис — на in-memory SQLite, sm2 — чистый); коммит прямо в `main`.

---

### Task 1: Модуль SM-2 (чистая математика)

**Files:**
- Create: `server/src/training/sm2.ts`
- Test: `server/src/training/__tests__/sm2.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { addDays, initialSchedule, nextReviewInterval, reviewSchedule } from "../sm2.js";

const NOW = new Date("2026-06-05T12:00:00.000Z");

describe("addDays", () => {
  it("прибавляет дни в UTC", () => {
    expect(addDays(NOW, 3).toISOString()).toBe("2026-06-08T12:00:00.000Z");
  });
});

describe("initialSchedule", () => {
  it("первый повтор через 1 день, ease 2.5", () => {
    const s = initialSchedule(NOW);
    expect(s.intervalDays).toBe(1);
    expect(s.easeFactor).toBe(2.5);
    expect(s.nextReviewAt).toBe("2026-06-06T12:00:00.000Z");
  });
});

describe("nextReviewInterval", () => {
  it("1 → 3, 3 → 7, далее × ease", () => {
    expect(nextReviewInterval(1, 2.5)).toBe(3);
    expect(nextReviewInterval(3, 2.5)).toBe(7);
    expect(nextReviewInterval(7, 2.5)).toBe(18);
  });
});

describe("reviewSchedule", () => {
  it("верный ответ двигает интервал вперёд и повышает ease", () => {
    const s = reviewSchedule({ intervalDays: 1, easeFactor: 2.4 }, true, NOW);
    expect(s.intervalDays).toBe(3);
    expect(s.easeFactor).toBeCloseTo(2.5);
    expect(s.nextReviewAt).toBe("2026-06-08T12:00:00.000Z");
  });

  it("ease не превышает 2.5", () => {
    expect(reviewSchedule({ intervalDays: 7, easeFactor: 2.5 }, true, NOW).easeFactor).toBeCloseTo(2.5);
  });

  it("неверный ответ сбрасывает интервал в 1 и снижает ease", () => {
    const s = reviewSchedule({ intervalDays: 7, easeFactor: 2.5 }, false, NOW);
    expect(s.intervalDays).toBe(1);
    expect(s.easeFactor).toBeCloseTo(2.3);
    expect(s.nextReviewAt).toBe("2026-06-06T12:00:00.000Z");
  });

  it("ease не опускается ниже 1.3", () => {
    expect(reviewSchedule({ intervalDays: 1, easeFactor: 1.3 }, false, NOW).easeFactor).toBeCloseTo(1.3);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd server && npx vitest run src/training/__tests__/sm2.test.ts`
Expected: FAIL — модуль `sm2.js` не найден.

- [ ] **Step 3: Реализовать `server/src/training/sm2.ts`**

```ts
export interface Schedule {
  intervalDays: number;
  easeFactor: number;
  nextReviewAt: string;
}

const MIN_EASE = 1.3;
const MAX_EASE = 2.5;

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function initialSchedule(now: Date): Schedule {
  return {
    intervalDays: 1,
    easeFactor: MAX_EASE,
    nextReviewAt: addDays(now, 1).toISOString(),
  };
}

export function nextReviewInterval(intervalDays: number, easeFactor: number): number {
  if (intervalDays <= 1) {
    return 3;
  }
  if (intervalDays <= 3) {
    return 7;
  }
  return Math.round(intervalDays * easeFactor);
}

export function reviewSchedule(
  current: { intervalDays: number; easeFactor: number },
  correct: boolean,
  now: Date,
): Schedule {
  if (!correct) {
    return {
      intervalDays: 1,
      easeFactor: Math.max(MIN_EASE, current.easeFactor - 0.2),
      nextReviewAt: addDays(now, 1).toISOString(),
    };
  }
  const intervalDays = nextReviewInterval(current.intervalDays, current.easeFactor);
  return {
    intervalDays,
    easeFactor: Math.min(MAX_EASE, current.easeFactor + 0.1),
    nextReviewAt: addDays(now, intervalDays).toISOString(),
  };
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd server && npx vitest run src/training/__tests__/sm2.test.ts`
Expected: PASS (7 тестов).

- [ ] **Step 5: Commit**

```bash
git add server/src/training/sm2.ts server/src/training/__tests__/sm2.test.ts
git commit -m "Добавить модуль SM-2 расписания повторений"
```

---

### Task 2: Репозиторий прогресса

**Files:**
- Create: `server/src/training/progress.repository.ts`
- Test: `server/src/training/__tests__/progress.repository.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../../db/connection.js";
import { runMigrations } from "../../db/migrate.js";
import { createDeck } from "../../decks/decks.repository.js";
import { createWord } from "../../words/words.repository.js";
import { getProgress, upsertProgress } from "../progress.repository.js";

let db: Database.Database;
let wordId: string;

beforeEach(() => {
  db = createConnection(":memory:");
  runMigrations(db);
  const deckId = createDeck(db, "Колода").id;
  wordId = createWord(db, { deckId, english: "cat", russian: "кот" }).id;
});

describe("upsertProgress / getProgress", () => {
  it("создаёт строку прогресса с guid и дефолтами", () => {
    const progress = upsertProgress(db, wordId, { currentType: 1 });
    expect(progress.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(progress.word_id).toBe(wordId);
    expect(progress.current_type).toBe(1);
    expect(progress.learned_at).toBeNull();
    expect(progress.ease_factor).toBe(2.5);
    expect(progress.interval_days).toBe(0);
    expect(progress.total_reviews).toBe(0);
  });

  it("обновляет существующую строку, не плодит новую", () => {
    upsertProgress(db, wordId, { currentType: 1 });
    const updated = upsertProgress(db, wordId, {
      currentType: null,
      learnedAt: "2026-06-05T12:00:00.000Z",
      intervalDays: 1,
      nextReviewAt: "2026-06-06T12:00:00.000Z",
    });
    expect(updated.current_type).toBeNull();
    expect(updated.learned_at).toBe("2026-06-05T12:00:00.000Z");
    expect(updated.interval_days).toBe(1);
    const all = db.prepare("SELECT COUNT(*) AS c FROM progress WHERE word_id = ?").get(wordId) as { c: number };
    expect(all.c).toBe(1);
  });

  it("getProgress возвращает undefined без строки", () => {
    expect(getProgress(db, wordId)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd server && npx vitest run src/training/__tests__/progress.repository.test.ts`
Expected: FAIL — модуль `progress.repository.js` не найден.

- [ ] **Step 3: Реализовать `server/src/training/progress.repository.ts`**

```ts
import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

export interface ProgressRow {
  id: string;
  word_id: string;
  current_type: number | null;
  learned_at: string | null;
  ease_factor: number;
  interval_days: number;
  next_review_at: string | null;
  total_reviews: number;
  correct_reviews: number;
}

export interface ProgressFields {
  currentType?: number | null;
  learnedAt?: string | null;
  easeFactor?: number;
  intervalDays?: number;
  nextReviewAt?: string | null;
  totalReviews?: number;
  correctReviews?: number;
}

const COLUMN_BY_FIELD: Record<keyof ProgressFields, string> = {
  currentType: "current_type",
  learnedAt: "learned_at",
  easeFactor: "ease_factor",
  intervalDays: "interval_days",
  nextReviewAt: "next_review_at",
  totalReviews: "total_reviews",
  correctReviews: "correct_reviews",
};

export function getProgress(db: Database.Database, wordId: string): ProgressRow | undefined {
  return db.prepare("SELECT * FROM progress WHERE word_id = ?").get(wordId) as ProgressRow | undefined;
}

export function upsertProgress(
  db: Database.Database,
  wordId: string,
  fields: ProgressFields,
): ProgressRow {
  const existing = getProgress(db, wordId);

  if (existing) {
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const key of Object.keys(fields) as (keyof ProgressFields)[]) {
      if (fields[key] !== undefined) {
        sets.push(`${COLUMN_BY_FIELD[key]} = ?`);
        values.push(fields[key]);
      }
    }
    if (sets.length > 0) {
      values.push(wordId);
      db.prepare(`UPDATE progress SET ${sets.join(", ")} WHERE word_id = ?`).run(...values);
    }
    return getProgress(db, wordId) as ProgressRow;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO progress
       (id, word_id, current_type, learned_at, ease_factor, interval_days, next_review_at, total_reviews, correct_reviews)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    wordId,
    fields.currentType ?? null,
    fields.learnedAt ?? null,
    fields.easeFactor ?? 2.5,
    fields.intervalDays ?? 0,
    fields.nextReviewAt ?? null,
    fields.totalReviews ?? 0,
    fields.correctReviews ?? 0,
  );
  return getProgress(db, wordId) as ProgressRow;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd server && npx vitest run src/training/__tests__/progress.repository.test.ts`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add server/src/training/progress.repository.ts server/src/training/__tests__/progress.repository.test.ts
git commit -m "Добавить репозиторий прогресса"
```

---

### Task 3: Репозиторий выборок тренировки

**Files:**
- Create: `server/src/training/training.repository.ts`
- Test: `server/src/training/__tests__/training.repository.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../../db/connection.js";
import { runMigrations } from "../../db/migrate.js";
import { createDeck } from "../../decks/decks.repository.js";
import { createWord } from "../../words/words.repository.js";
import { upsertProgress } from "../progress.repository.js";
import { listLearnableWords, listDueReviews } from "../training.repository.js";

let db: Database.Database;
let deckId: string;

beforeEach(() => {
  db = createConnection(":memory:");
  runMigrations(db);
  deckId = createDeck(db, "Колода").id;
});

describe("listLearnableWords", () => {
  it("слово без прогресса считается новым с currentType 1", () => {
    createWord(db, { deckId, english: "cat", russian: "кот" });
    const list = listLearnableWords(db, 20);
    expect(list).toHaveLength(1);
    expect(list[0].word.english).toBe("cat");
    expect(list[0].currentType).toBe(1);
  });

  it("слово в процессе изучения сохраняет currentType", () => {
    const id = createWord(db, { deckId, english: "dog", russian: "собака" }).id;
    upsertProgress(db, id, { currentType: 3 });
    expect(listLearnableWords(db, 20)[0].currentType).toBe(3);
  });

  it("выученное слово исключается из новых", () => {
    const id = createWord(db, { deckId, english: "fish", russian: "рыба" }).id;
    upsertProgress(db, id, { currentType: null, learnedAt: "2026-06-05T12:00:00.000Z" });
    expect(listLearnableWords(db, 20)).toHaveLength(0);
  });

  it("уважает лимит батча", () => {
    for (let i = 0; i < 5; i += 1) {
      createWord(db, { deckId, english: `w${i}`, russian: `с${i}` });
    }
    expect(listLearnableWords(db, 3)).toHaveLength(3);
  });
});

describe("listDueReviews", () => {
  it("возвращает выученные слова со сроком в прошлом", () => {
    const id = createWord(db, { deckId, english: "cat", russian: "кот" }).id;
    upsertProgress(db, id, {
      currentType: null,
      learnedAt: "2026-06-01T12:00:00.000Z",
      intervalDays: 1,
      nextReviewAt: "2026-06-02T12:00:00.000Z",
    });
    const due = listDueReviews(db, "2026-06-05T12:00:00.000Z");
    expect(due).toHaveLength(1);
    expect(due[0].word.english).toBe("cat");
    expect(due[0].progress.interval_days).toBe(1);
  });

  it("не возвращает слова со сроком в будущем", () => {
    const id = createWord(db, { deckId, english: "dog", russian: "собака" }).id;
    upsertProgress(db, id, {
      currentType: null,
      learnedAt: "2026-06-01T12:00:00.000Z",
      nextReviewAt: "2026-06-09T12:00:00.000Z",
    });
    expect(listDueReviews(db, "2026-06-05T12:00:00.000Z")).toHaveLength(0);
  });

  it("не возвращает ещё не выученные слова", () => {
    const id = createWord(db, { deckId, english: "fish", russian: "рыба" }).id;
    upsertProgress(db, id, { currentType: 2 });
    expect(listDueReviews(db, "2026-06-05T12:00:00.000Z")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd server && npx vitest run src/training/__tests__/training.repository.test.ts`
Expected: FAIL — модуль `training.repository.js` не найден.

- [ ] **Step 3: Реализовать `server/src/training/training.repository.ts`**

```ts
import type Database from "better-sqlite3";
import type { WordRow } from "../words/words.repository.js";
import type { ProgressRow } from "./progress.repository.js";

export interface LearnableWord {
  word: WordRow;
  currentType: number;
}

export interface DueReview {
  word: WordRow;
  progress: ProgressRow;
}

interface LearnableRow extends WordRow {
  p_current_type: number | null;
}

export function listLearnableWords(db: Database.Database, limit: number): LearnableWord[] {
  const rows = db
    .prepare(
      `SELECT w.*, p.current_type AS p_current_type
       FROM words w
       LEFT JOIN progress p ON p.word_id = w.id
       WHERE p.id IS NULL OR p.learned_at IS NULL
       ORDER BY w.created_at ASC
       LIMIT ?`,
    )
    .all(limit) as LearnableRow[];

  return rows.map((row) => {
    const { p_current_type, ...word } = row;
    return { word, currentType: p_current_type ?? 1 };
  });
}

interface DueRow {
  w_id: string;
  deck_id: string;
  english: string;
  russian: string;
  transcription: string | null;
  example_sentence: string | null;
  image_url: string | null;
  audio_url: string | null;
  w_created_at: string;
  p_id: string;
  current_type: number | null;
  learned_at: string | null;
  ease_factor: number;
  interval_days: number;
  next_review_at: string | null;
  total_reviews: number;
  correct_reviews: number;
}

export function listDueReviews(db: Database.Database, nowIso: string): DueReview[] {
  const rows = db
    .prepare(
      `SELECT
         w.id AS w_id, w.deck_id, w.english, w.russian, w.transcription,
         w.example_sentence, w.image_url, w.audio_url, w.created_at AS w_created_at,
         p.id AS p_id, p.current_type, p.learned_at, p.ease_factor, p.interval_days,
         p.next_review_at, p.total_reviews, p.correct_reviews
       FROM progress p
       JOIN words w ON w.id = p.word_id
       WHERE p.learned_at IS NOT NULL AND p.next_review_at <= ?
       ORDER BY p.next_review_at ASC`,
    )
    .all(nowIso) as DueRow[];

  return rows.map((r) => ({
    word: {
      id: r.w_id,
      deck_id: r.deck_id,
      english: r.english,
      russian: r.russian,
      transcription: r.transcription,
      example_sentence: r.example_sentence,
      image_url: r.image_url,
      audio_url: r.audio_url,
      created_at: r.w_created_at,
    },
    progress: {
      id: r.p_id,
      word_id: r.w_id,
      current_type: r.current_type,
      learned_at: r.learned_at,
      ease_factor: r.ease_factor,
      interval_days: r.interval_days,
      next_review_at: r.next_review_at,
      total_reviews: r.total_reviews,
      correct_reviews: r.correct_reviews,
    },
  }));
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd server && npx vitest run src/training/__tests__/training.repository.test.ts`
Expected: PASS (7 тестов).

- [ ] **Step 5: Commit**

```bash
git add server/src/training/training.repository.ts server/src/training/__tests__/training.repository.test.ts
git commit -m "Добавить репозиторий выборок тренировки"
```

---

### Task 4: Сервис тренировки

**Files:**
- Create: `server/src/training/training.service.ts`
- Test: `server/src/training/__tests__/training.service.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../../db/connection.js";
import { runMigrations } from "../../db/migrate.js";
import { createDeck } from "../../decks/decks.repository.js";
import { createWord } from "../../words/words.repository.js";
import { getProgress, upsertProgress } from "../progress.repository.js";
import {
  getTodayTraining,
  recordLearningStep,
  markLearned,
  recordReview,
} from "../training.service.js";

const NOW = new Date("2026-06-05T12:00:00.000Z");
let db: Database.Database;
let deckId: string;

beforeEach(() => {
  db = createConnection(":memory:");
  runMigrations(db);
  deckId = createDeck(db, "Колода").id;
});

describe("getTodayTraining", () => {
  it("разделяет новые слова и повторения", () => {
    createWord(db, { deckId, english: "cat", russian: "кот" });
    const reviewId = createWord(db, { deckId, english: "dog", russian: "собака" }).id;
    upsertProgress(db, reviewId, {
      currentType: null,
      learnedAt: "2026-06-01T12:00:00.000Z",
      nextReviewAt: "2026-06-02T12:00:00.000Z",
    });
    const today = getTodayTraining(db, NOW);
    expect(today.newWords).toHaveLength(1);
    expect(today.newWords[0].word.english).toBe("cat");
    expect(today.reviewWords).toHaveLength(1);
    expect(today.reviewWords[0].word.english).toBe("dog");
  });
});

describe("recordLearningStep", () => {
  it("сохраняет текущий тип упражнения", () => {
    const id = createWord(db, { deckId, english: "cat", russian: "кот" }).id;
    const progress = recordLearningStep(db, id, 4);
    expect(progress.current_type).toBe(4);
    expect(progress.learned_at).toBeNull();
  });
});

describe("markLearned", () => {
  it("переводит слово в SR: learned_at + первый повтор через 1 день", () => {
    const id = createWord(db, { deckId, english: "cat", russian: "кот" }).id;
    recordLearningStep(db, id, 5);
    const progress = markLearned(db, id, NOW);
    expect(progress.current_type).toBeNull();
    expect(progress.learned_at).toBe("2026-06-05T12:00:00.000Z");
    expect(progress.interval_days).toBe(1);
    expect(progress.next_review_at).toBe("2026-06-06T12:00:00.000Z");
  });
});

describe("recordReview", () => {
  it("верный повтор двигает интервал и счётчики", () => {
    const id = createWord(db, { deckId, english: "cat", russian: "кот" }).id;
    markLearned(db, id, NOW);
    const progress = recordReview(db, id, true, NOW);
    expect(progress?.interval_days).toBe(3);
    expect(progress?.total_reviews).toBe(1);
    expect(progress?.correct_reviews).toBe(1);
    expect(progress?.next_review_at).toBe("2026-06-08T12:00:00.000Z");
  });

  it("неверный повтор сбрасывает интервал, correct_reviews не растёт", () => {
    const id = createWord(db, { deckId, english: "cat", russian: "кот" }).id;
    markLearned(db, id, NOW);
    recordReview(db, id, true, NOW);
    const progress = recordReview(db, id, false, NOW);
    expect(progress?.interval_days).toBe(1);
    expect(progress?.total_reviews).toBe(2);
    expect(progress?.correct_reviews).toBe(1);
  });

  it("возвращает undefined, если слово ещё не выучено", () => {
    const id = createWord(db, { deckId, english: "cat", russian: "кот" }).id;
    recordLearningStep(db, id, 2);
    expect(recordReview(db, id, true, NOW)).toBeUndefined();
    expect(getProgress(db, id)?.learned_at).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd server && npx vitest run src/training/__tests__/training.service.test.ts`
Expected: FAIL — модуль `training.service.js` не найден.

- [ ] **Step 3: Реализовать `server/src/training/training.service.ts`**

```ts
import type Database from "better-sqlite3";
import { getProgress, upsertProgress, type ProgressRow } from "./progress.repository.js";
import {
  listLearnableWords,
  listDueReviews,
  type LearnableWord,
  type DueReview,
} from "./training.repository.js";
import { initialSchedule, reviewSchedule } from "./sm2.js";

export interface TrainingToday {
  newWords: LearnableWord[];
  reviewWords: DueReview[];
}

export function getTodayTraining(
  db: Database.Database,
  now: Date,
  batchSize = 20,
): TrainingToday {
  return {
    newWords: listLearnableWords(db, batchSize),
    reviewWords: listDueReviews(db, now.toISOString()),
  };
}

export function recordLearningStep(
  db: Database.Database,
  wordId: string,
  currentType: number,
): ProgressRow {
  return upsertProgress(db, wordId, { currentType });
}

export function markLearned(db: Database.Database, wordId: string, now: Date): ProgressRow {
  const schedule = initialSchedule(now);
  return upsertProgress(db, wordId, {
    currentType: null,
    learnedAt: now.toISOString(),
    easeFactor: schedule.easeFactor,
    intervalDays: schedule.intervalDays,
    nextReviewAt: schedule.nextReviewAt,
  });
}

export function recordReview(
  db: Database.Database,
  wordId: string,
  correct: boolean,
  now: Date,
): ProgressRow | undefined {
  const progress = getProgress(db, wordId);
  if (!progress || progress.learned_at === null) {
    return undefined;
  }
  const schedule = reviewSchedule(
    { intervalDays: progress.interval_days, easeFactor: progress.ease_factor },
    correct,
    now,
  );
  return upsertProgress(db, wordId, {
    easeFactor: schedule.easeFactor,
    intervalDays: schedule.intervalDays,
    nextReviewAt: schedule.nextReviewAt,
    totalReviews: progress.total_reviews + 1,
    correctReviews: progress.correct_reviews + (correct ? 1 : 0),
  });
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd server && npx vitest run src/training/__tests__/training.service.test.ts`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add server/src/training/training.service.ts server/src/training/__tests__/training.service.test.ts
git commit -m "Добавить сервис тренировки (today, прогресс, повторения)"
```

---

### Task 5: Маршруты тренировки + подключение

**Files:**
- Create: `server/src/training/training.routes.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Реализовать `server/src/training/training.routes.ts`**

```ts
import { Router } from "express";
import type Database from "better-sqlite3";
import { getWord } from "../words/words.repository.js";
import {
  getTodayTraining,
  recordLearningStep,
  markLearned,
  recordReview,
} from "./training.service.js";

export function createTrainingRouter(db: Database.Database): Router {
  const router = Router();

  router.get("/today", (_req, res) => {
    res.json(getTodayTraining(db, new Date()));
  });

  router.post("/result", (req, res) => {
    const body = req.body ?? {};
    const wordId = typeof body.wordId === "string" ? body.wordId : "";
    if (!getWord(db, wordId)) {
      res.status(404).json({ error: "Слово не найдено" });
      return;
    }

    const mode = body.mode;

    if (mode === "step") {
      const currentType = Number(body.currentType);
      if (!Number.isInteger(currentType) || currentType < 1 || currentType > 5) {
        res.status(400).json({ error: "Некорректный тип упражнения" });
        return;
      }
      res.json({ progress: recordLearningStep(db, wordId, currentType) });
      return;
    }

    if (mode === "learned") {
      res.json({ progress: markLearned(db, wordId, new Date()) });
      return;
    }

    if (mode === "review") {
      if (typeof body.correct !== "boolean") {
        res.status(400).json({ error: "Нужно поле correct (boolean)" });
        return;
      }
      const progress = recordReview(db, wordId, body.correct, new Date());
      if (!progress) {
        res.status(409).json({ error: "Слово ещё не в режиме повторения" });
        return;
      }
      res.json({ progress });
      return;
    }

    res.status(400).json({ error: "Неизвестный режим" });
  });

  return router;
}
```

- [ ] **Step 2: Подключить роутер в `server/src/app.ts`**

Добавь импорт рядом с остальными роутерами:

```ts
import { createTrainingRouter } from "./training/training.routes.js";
```

И строку монтирования (после `/api/words`, до `/api/unsplash`):

```ts
  app.use("/api/training", requireAuth, createTrainingRouter(db));
```

- [ ] **Step 3: Проверить типы и весь тест-сьют**

Run: `cd server && npx tsc --noEmit && npm test`
Expected: типы без ошибок; все тесты PASS.

- [ ] **Step 4: Ручная проверка полного цикла**

Run:
```bash
cd server
mkdir -p data
rm -f data/manual-check.sqlite
DB_FILE=data/manual-check.sqlite APP_PASSWORD=hunter2 JWT_SECRET=dev-secret npx tsx src/index.ts &
SERVER_PID=$!
sleep 1

TOKEN=$(curl -s -X POST localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"password":"hunter2"}' | sed 's/.*"token":"//;s/".*//')
AUTH="Authorization: Bearer $TOKEN"

DECK=$(curl -s -X POST localhost:3001/api/decks -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Колода"}')
DECK_ID=$(echo "$DECK" | sed 's/.*"id":"//;s/".*//')
WORD=$(curl -s -X POST localhost:3001/api/words -H "$AUTH" -H 'Content-Type: application/json' -d "{\"deckId\":\"$DECK_ID\",\"english\":\"cat\",\"russian\":\"кот\"}")
WORD_ID=$(echo "$WORD" | sed 's/.*"id":"//;s/".*//')

echo "--- today: слово в newWords с currentType 1 ---"
curl -s localhost:3001/api/training/today -H "$AUTH"
echo
echo "--- mark learned ---"
curl -s -X POST localhost:3001/api/training/result -H "$AUTH" -H 'Content-Type: application/json' -d "{\"wordId\":\"$WORD_ID\",\"mode\":\"learned\"}"
echo
echo "--- today снова: newWords пуст, reviewWords пуст (повтор завтра) ---"
curl -s localhost:3001/api/training/today -H "$AUTH"
echo
echo "--- review correct: interval_days должен стать 3 ---"
curl -s -X POST localhost:3001/api/training/result -H "$AUTH" -H 'Content-Type: application/json' -d "{\"wordId\":\"$WORD_ID\",\"mode\":\"review\",\"correct\":true}"
echo

kill $SERVER_PID
rm -f data/manual-check.sqlite
```
Expected:
- первый `today` → `{"newWords":[{"word":{...,"english":"cat"},"currentType":1}],"reviewWords":[]}`
- `learned` → `{"progress":{...,"learned_at":"...","current_type":null,"interval_days":1}}`
- второй `today` → `{"newWords":[],"reviewWords":[]}` (повтор запланирован на завтра)
- `review correct` → `{"progress":{...,"interval_days":3,"total_reviews":1,"correct_reviews":1}}`

- [ ] **Step 5: Commit**

```bash
git add server/src/training/training.routes.ts server/src/app.ts
git commit -m "Добавить маршруты тренировки и подключить за авторизацией"
```

---

## Self-Review

**Spec coverage (для этого плана):**
- Инициализация `progress` для новых слов — Task 2/4 (`upsertProgress`, `recordLearningStep`) ✓ (строка создаётся при первом шаге обучения или при `markLearned`)
- `GET /api/training/today` (новые + повторения) — Task 4/5 ✓ (новые — до 20, `learned_at IS NULL`; повторения — `next_review_at <= now`)
- `POST /api/training/result` — Task 5 ✓ (режимы `step` / `learned` / `review`)
- SM-2: 1→3→7→×ease, ease 1.3–2.5, сброс при ошибке — Task 1 (`sm2`) ✓
- Состояния «новое / в изучении (current_type) / в SR» — отражены в `progress` и выборках ✓

**Где живёт послойная логика батча:** на фронтенде (Планы 5-6). Бэкенд хранит `current_type` для возобновления и фиксирует завершение (`learned`) и повторения (`review`).

**Режим повторения по направлениям (Тип 1/2):** выбор упражнения для повторения — фронтовая логика (План 6). Бэкенд для повторения не зависит от типа: принимает только `correct` и применяет SM-2. Это согласуется со спекой (направления влияют лишь на то, какой из Типов 1/2 показать).

**Placeholder scan:** плейсхолдеров нет.

**Type consistency:** `ProgressRow`/`ProgressFields` (Task 2) используются в `training.repository` (Task 3) и `training.service` (Task 4). `LearnableWord`/`DueReview` (Task 3) → `TrainingToday` (Task 4) → ответ роутера (Task 5). `Schedule` и функции `initialSchedule`/`reviewSchedule` (Task 1) согласованы с `training.service`. `createTrainingRouter(db)` смонтирован в `app.ts` за `requireAuth` (Task 5).
