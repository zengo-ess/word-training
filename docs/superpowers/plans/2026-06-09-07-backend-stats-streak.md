# Backend: Stats, Deck Progress & Streak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать бэкенду данные, которые требует дизайн: слова колоды вместе с прогрессом, статистика по колодам (X/Y выучено), `GET /api/stats` (выучено / в процессе / на сегодня / стрик) и отслеживание стрика (дни занятий).

**Architecture:** Новая миграция `003` + таблица `study_days` (день в формате `YYYY-MM-DD`). Модуль `stats/studyDays.ts` пишет день и считает стрик (чистые функции на БД). `decks/deckStats.repository.ts` — джойны: колоды со счётчиками total/learned и слова с прогрессом (LEFT JOIN). `stats/stats.service.ts` собирает сводку. `GET /api/stats` за авторизацией. Существующие маршруты `GET /api/decks` и `GET /api/decks/:id/words` отдают расширенные данные. День занятия фиксируется в `POST /api/training/result`.

**Tech Stack:** Express, better-sqlite3, vitest.

---

## File Structure

```
server/src/
  db/migrations/003_study_days.sql      # НОВЫЙ: study_days(day)
  stats/
    studyDays.ts                        # recordStudyDay, isoDay, computeStreak
    stats.service.ts                    # getStats
    stats.routes.ts                     # GET /api/stats
    __tests__/studyDays.test.ts
    __tests__/stats.service.test.ts
  decks/
    deckStats.repository.ts             # listDecksWithStats, listWordsWithProgress
    __tests__/deckStats.repository.test.ts
    decks.routes.ts                     # МОДИФИЦ.: stats-варианты в GET / и GET /:id/words
  training/training.routes.ts           # МОДИФИЦ.: фиксировать день занятия
  app.ts                                # МОДИФИЦ.: монтировать /api/stats
```

**Конвенции:** только `import`; никогда `required`; id — guid; тест-файлы с двумя eslint-disable строками; НЕ интеграционные тесты (репозитории/сервис — in-memory SQLite); коммит в `main`.

---

### Task 1: Стрик (миграция 003 + studyDays)

**Files:**
- Create: `server/src/db/migrations/003_study_days.sql`
- Create: `server/src/stats/studyDays.ts`
- Test: `server/src/stats/__tests__/studyDays.test.ts`

- [ ] **Step 1: `server/src/db/migrations/003_study_days.sql`**

```sql
CREATE TABLE IF NOT EXISTS study_days (
  day TEXT PRIMARY KEY
);
```

- [ ] **Step 2: Тест `server/src/stats/__tests__/studyDays.test.ts`**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../../db/connection.js";
import { runMigrations } from "../../db/migrate.js";
import { recordStudyDay, isoDay, computeStreak } from "../studyDays.js";

const NOW = new Date("2026-06-09T12:00:00.000Z");
let db: Database.Database;

beforeEach(() => {
  db = createConnection(":memory:");
  runMigrations(db);
});

describe("isoDay", () => {
  it("форматирует дату как YYYY-MM-DD (UTC)", () => {
    expect(isoDay(NOW)).toBe("2026-06-09");
  });
});

describe("recordStudyDay", () => {
  it("идемпотентен — повтор того же дня не плодит строки", () => {
    recordStudyDay(db, "2026-06-09");
    recordStudyDay(db, "2026-06-09");
    const row = db.prepare("SELECT COUNT(*) AS c FROM study_days").get() as { c: number };
    expect(row.c).toBe(1);
  });
});

describe("computeStreak", () => {
  it("0 без записей", () => {
    expect(computeStreak(db, NOW)).toBe(0);
  });

  it("1 если занимались только сегодня", () => {
    recordStudyDay(db, "2026-06-09");
    expect(computeStreak(db, NOW)).toBe(1);
  });

  it("2 за сегодня и вчера подряд", () => {
    recordStudyDay(db, "2026-06-09");
    recordStudyDay(db, "2026-06-08");
    expect(computeStreak(db, NOW)).toBe(2);
  });

  it("считает до вчера, если сегодня ещё не занимались", () => {
    recordStudyDay(db, "2026-06-08");
    recordStudyDay(db, "2026-06-07");
    expect(computeStreak(db, NOW)).toBe(2);
  });

  it("разрыв обнуляет хвост (только сегодня при пропуске вчера)", () => {
    recordStudyDay(db, "2026-06-09");
    recordStudyDay(db, "2026-06-07");
    expect(computeStreak(db, NOW)).toBe(1);
  });
});
```

- [ ] **Step 3: Запустить — FAIL (нет модуля). Реализовать `server/src/stats/studyDays.ts`**

```ts
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
```

- [ ] **Step 4: Запустить тест — PASS (8). Затем `npm test` (полный).**

Run: `cd server && npx vitest run src/stats/__tests__/studyDays.test.ts`

- [ ] **Step 5: Commit**

```bash
git add server/src/db/migrations/003_study_days.sql server/src/stats/studyDays.ts server/src/stats/__tests__/studyDays.test.ts
git commit -m "Добавить отслеживание стрика (study_days)"
```

---

### Task 2: Статистика колод (deckStats.repository — колоды со счётчиками)

**Files:**
- Create: `server/src/decks/deckStats.repository.ts`
- Test: `server/src/decks/__tests__/deckStats.repository.test.ts`

- [ ] **Step 1: Тест `server/src/decks/__tests__/deckStats.repository.test.ts`**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../../db/connection.js";
import { runMigrations } from "../../db/migrate.js";
import { createDeck } from "../decks.repository.js";
import { createWord } from "../../words/words.repository.js";
import { upsertProgress } from "../../training/progress.repository.js";
import { listDecksWithStats, listWordsWithProgress } from "../deckStats.repository.js";

let db: Database.Database;
let deckId: string;

beforeEach(() => {
  db = createConnection(":memory:");
  runMigrations(db);
  deckId = createDeck(db, "Еда").id;
});

describe("listDecksWithStats", () => {
  it("считает total и learned по колоде", () => {
    const w1 = createWord(db, { deckId, english: "apple", russian: "яблоко" }).id;
    createWord(db, { deckId, english: "bread", russian: "хлеб" });
    upsertProgress(db, w1, { currentType: null, learnedAt: "2026-06-01T00:00:00.000Z" });

    const decks = listDecksWithStats(db);
    const food = decks.find((d) => d.id === deckId);
    expect(food?.total).toBe(2);
    expect(food?.learned).toBe(1);
  });

  it("новая пустая колода имеет total 0 / learned 0", () => {
    const decks = listDecksWithStats(db);
    expect(decks[0].total).toBe(0);
    expect(decks[0].learned).toBe(0);
  });
});

describe("listWordsWithProgress", () => {
  it("слово без прогресса — progress null", () => {
    createWord(db, { deckId, english: "apple", russian: "яблоко" });
    const words = listWordsWithProgress(db, deckId);
    expect(words).toHaveLength(1);
    expect(words[0].english).toBe("apple");
    expect(words[0].progress).toBeNull();
  });

  it("слово с прогрессом несёт его данные", () => {
    const id = createWord(db, { deckId, english: "dog", russian: "собака" }).id;
    upsertProgress(db, id, { currentType: 3 });
    const words = listWordsWithProgress(db, deckId);
    expect(words[0].progress?.current_type).toBe(3);
    expect(words[0].progress?.learned_at).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить — FAIL. Реализовать `server/src/decks/deckStats.repository.ts`**

```ts
import type Database from "better-sqlite3";
import type { WordRow } from "../words/words.repository.js";
import type { ProgressRow } from "../training/progress.repository.js";

export interface DeckWithStats {
  id: string;
  name: string;
  is_builtin: number;
  created_at: string;
  total: number;
  learned: number;
}

export function listDecksWithStats(db: Database.Database): DeckWithStats[] {
  return db
    .prepare(
      `SELECT d.id, d.name, d.is_builtin, d.created_at,
         (SELECT COUNT(*) FROM words w WHERE w.deck_id = d.id) AS total,
         (SELECT COUNT(*) FROM words w
            JOIN progress p ON p.word_id = w.id
            WHERE w.deck_id = d.id AND p.learned_at IS NOT NULL) AS learned
       FROM decks d
       ORDER BY d.is_builtin DESC, d.created_at ASC`,
    )
    .all() as DeckWithStats[];
}

export interface WordWithProgress extends WordRow {
  progress: ProgressRow | null;
}

interface JoinedRow extends WordRow {
  p_id: string | null;
  p_current_type: number | null;
  p_learned_at: string | null;
  p_ease_factor: number | null;
  p_interval_days: number | null;
  p_next_review_at: string | null;
  p_total_reviews: number | null;
  p_correct_reviews: number | null;
}

export function listWordsWithProgress(db: Database.Database, deckId: string): WordWithProgress[] {
  const rows = db
    .prepare(
      `SELECT w.*,
         p.id AS p_id, p.current_type AS p_current_type, p.learned_at AS p_learned_at,
         p.ease_factor AS p_ease_factor, p.interval_days AS p_interval_days,
         p.next_review_at AS p_next_review_at, p.total_reviews AS p_total_reviews,
         p.correct_reviews AS p_correct_reviews
       FROM words w
       LEFT JOIN progress p ON p.word_id = w.id
       WHERE w.deck_id = ?
       ORDER BY w.created_at ASC`,
    )
    .all(deckId) as JoinedRow[];

  return rows.map((r) => {
    const {
      p_id,
      p_current_type,
      p_learned_at,
      p_ease_factor,
      p_interval_days,
      p_next_review_at,
      p_total_reviews,
      p_correct_reviews,
      ...word
    } = r;
    const progress: ProgressRow | null =
      p_id === null
        ? null
        : {
            id: p_id,
            word_id: word.id,
            current_type: p_current_type,
            learned_at: p_learned_at,
            ease_factor: p_ease_factor as number,
            interval_days: p_interval_days as number,
            next_review_at: p_next_review_at,
            total_reviews: p_total_reviews as number,
            correct_reviews: p_correct_reviews as number,
          };
    return { ...word, progress };
  });
}
```

- [ ] **Step 3: Запустить тест — PASS (4). Затем `npm test`.**

- [ ] **Step 4: Commit**

```bash
git add server/src/decks/deckStats.repository.ts server/src/decks/__tests__/deckStats.repository.test.ts
git commit -m "Добавить репозиторий статистики колод и слов с прогрессом"
```

---

### Task 3: Расширить маршруты колод

**Files:**
- Modify: `server/src/decks/decks.routes.ts`

- [ ] **Step 1:** В `server/src/decks/decks.routes.ts` поменять импорты и два хендлера. Заменить импорт `listWordsByDeck` на новые функции и использовать их:

Импорты — добавить:
```ts
import { listDecksWithStats, listWordsWithProgress } from "./deckStats.repository.js";
```
(оставь `listDecks`, `getDeck`, `createDeck` из `./decks.repository.js`; импорт `listWordsByDeck` из `../words/words.repository.js` удали, если он больше не используется.)

`GET /` хендлер — заменить тело на:
```ts
  router.get("/", (_req, res) => {
    res.json({ decks: listDecksWithStats(db) });
  });
```

`GET /:id/words` — заменить `listWordsByDeck` на `listWordsWithProgress`:
```ts
  router.get("/:id/words", (req, res) => {
    const deck = getDeck(db, req.params.id);
    if (!deck) {
      res.status(404).json({ error: "Колода не найдена" });
      return;
    }
    res.json({ words: listWordsWithProgress(db, req.params.id) });
  });
```

`POST /` — без изменений (по-прежнему `createDeck`).

- [ ] **Step 2:** `cd server && npx tsc --noEmit && npm test` — типы чисто, все тесты PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/decks/decks.routes.ts
git commit -m "Отдавать статистику колод и прогресс слов в маршрутах колод"
```

---

### Task 4: Сервис статистики + /api/stats + фиксация дня

**Files:**
- Create: `server/src/stats/stats.service.ts`
- Create: `server/src/stats/stats.routes.ts`
- Test: `server/src/stats/__tests__/stats.service.test.ts`
- Modify: `server/src/training/training.routes.ts` (фиксировать день занятия)
- Modify: `server/src/app.ts` (монтировать /api/stats)

- [ ] **Step 1: Тест `server/src/stats/__tests__/stats.service.test.ts`**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../../db/connection.js";
import { runMigrations } from "../../db/migrate.js";
import { createDeck } from "../../decks/decks.repository.js";
import { createWord } from "../../words/words.repository.js";
import { upsertProgress } from "../../training/progress.repository.js";
import { recordStudyDay } from "../studyDays.js";
import { getStats } from "../stats.service.js";

const NOW = new Date("2026-06-09T12:00:00.000Z");
let db: Database.Database;
let deckId: string;

beforeEach(() => {
  db = createConnection(":memory:");
  runMigrations(db);
  deckId = createDeck(db, "Еда").id;
});

describe("getStats", () => {
  it("считает learned / inProgress / dueToday / стрик", () => {
    const learnedId = createWord(db, { deckId, english: "apple", russian: "яблоко" }).id;
    const dueId = createWord(db, { deckId, english: "bread", russian: "хлеб" }).id;
    const inProgressId = createWord(db, { deckId, english: "milk", russian: "молоко" }).id;

    upsertProgress(db, learnedId, {
      currentType: null,
      learnedAt: "2026-06-09T08:00:00.000Z",
      nextReviewAt: "2026-06-20T00:00:00.000Z",
    });
    upsertProgress(db, dueId, {
      currentType: null,
      learnedAt: "2026-06-01T00:00:00.000Z",
      nextReviewAt: "2026-06-02T00:00:00.000Z",
    });
    upsertProgress(db, inProgressId, { currentType: 2 });
    recordStudyDay(db, "2026-06-09");

    const stats = getStats(db, NOW);
    expect(stats.learned).toBe(2); // learnedId + dueId оба выучены
    expect(stats.inProgress).toBe(1);
    expect(stats.dueToday).toBe(1); // только dueId со сроком в прошлом
    expect(stats.learnedToday).toBe(1); // learnedId выучен сегодня
    expect(stats.streak).toBe(1);
    expect(stats.dailyGoal).toBe(20);
    expect(stats.decks.find((d) => d.id === deckId)?.total).toBe(3);
  });
});
```

- [ ] **Step 2: Запустить — FAIL. Реализовать `server/src/stats/stats.service.ts`**

```ts
import type Database from "better-sqlite3";
import { listDecksWithStats, type DeckWithStats } from "../decks/deckStats.repository.js";
import { computeStreak, isoDay } from "./studyDays.js";

export const DAILY_GOAL = 20;

export interface Stats {
  learned: number;
  inProgress: number;
  dueToday: number;
  learnedToday: number;
  dailyGoal: number;
  streak: number;
  decks: DeckWithStats[];
}

export function getStats(db: Database.Database, now: Date): Stats {
  const nowIso = now.toISOString();
  const today = isoDay(now);

  const learned = (
    db.prepare("SELECT COUNT(*) AS c FROM progress WHERE learned_at IS NOT NULL").get() as { c: number }
  ).c;
  const inProgress = (
    db.prepare("SELECT COUNT(*) AS c FROM progress WHERE learned_at IS NULL").get() as { c: number }
  ).c;
  const dueToday = (
    db
      .prepare("SELECT COUNT(*) AS c FROM progress WHERE learned_at IS NOT NULL AND next_review_at <= ?")
      .get(nowIso) as { c: number }
  ).c;
  const learnedToday = (
    db
      .prepare("SELECT COUNT(*) AS c FROM progress WHERE learned_at IS NOT NULL AND substr(learned_at, 1, 10) = ?")
      .get(today) as { c: number }
  ).c;

  return {
    learned,
    inProgress,
    dueToday,
    learnedToday,
    dailyGoal: DAILY_GOAL,
    streak: computeStreak(db, now),
    decks: listDecksWithStats(db),
  };
}
```

- [ ] **Step 3: Реализовать `server/src/stats/stats.routes.ts`**

```ts
import { Router } from "express";
import type Database from "better-sqlite3";
import { getStats } from "./stats.service.js";

export function createStatsRouter(db: Database.Database): Router {
  const router = Router();
  router.get("/", (_req, res) => {
    res.json(getStats(db, new Date()));
  });
  return router;
}
```

- [ ] **Step 4: Фиксировать день занятия в `server/src/training/training.routes.ts`** — добавить импорт и вызвать `recordStudyDay` при каждом успешном результате (step/learned/review).

Импорт сверху:
```ts
import { recordStudyDay, isoDay } from "../stats/studyDays.js";
```

Внутри `POST /result`, после проверки `getWord` (слово найдено), но удобнее — в каждой успешной ветке перед ответом. Проще: сразу после успешной валидации слова зафиксировать день один раз:

Замени строку проверки слова и добавь фиксацию дня сразу после неё:
```ts
    if (!getWord(db, wordId)) {
      res.status(404).json({ error: "Слово не найдено" });
      return;
    }
    recordStudyDay(db, isoDay(new Date()));
```
(День фиксируется на любом валидном результате — это нормально: пользователь занимался.)

- [ ] **Step 5: Смонтировать `/api/stats` в `server/src/app.ts`** — добавить импорт и строку за `requireAuth` (рядом с `/api/training`):

```ts
import { createStatsRouter } from "./stats/stats.routes.js";
```
```ts
  app.use("/api/stats", requireAuth, createStatsRouter(db));
```

- [ ] **Step 6: Запустить тест stats + полный прогон + типы**

Run: `cd server && npx vitest run src/stats/__tests__/stats.service.test.ts && npx tsc --noEmit && npm test`
Expected: stats 1 PASS; типы чисто; все тесты PASS.

- [ ] **Step 7: Ручная проверка `/api/stats` и расширенных колод**

```bash
cd server
mkdir -p data
rm -f data/p7.sqlite
DB_FILE=data/p7.sqlite APP_PASSWORD=secret JWT_SECRET=dev npx tsx src/index.ts &
SERVER_PID=$!
sleep 1
TOKEN=$(curl -s -X POST localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"password":"secret"}' | sed 's/.*"token":"//;s/".*//')
AUTH="Authorization: Bearer $TOKEN"
DECK=$(curl -s -X POST localhost:3001/api/decks -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Еда"}')
DECK_ID=$(echo "$DECK" | sed 's/.*"id":"//;s/".*//')
WORD=$(curl -s -X POST localhost:3001/api/words -H "$AUTH" -H 'Content-Type: application/json' -d "{\"deckId\":\"$DECK_ID\",\"english\":\"apple\",\"russian\":\"яблоко\"}")
WORD_ID=$(echo "$WORD" | sed 's/.*"id":"//;s/".*//')
echo "--- decks (total/learned) ---"; curl -s localhost:3001/api/decks -H "$AUTH"; echo
echo "--- words (progress null) ---"; curl -s "localhost:3001/api/decks/$DECK_ID/words" -H "$AUTH"; echo
curl -s -X POST localhost:3001/api/training/result -H "$AUTH" -H 'Content-Type: application/json' -d "{\"wordId\":\"$WORD_ID\",\"mode\":\"learned\"}" >/dev/null
echo "--- stats (после learned: streak 1, learned 1) ---"; curl -s localhost:3001/api/stats -H "$AUTH"; echo
kill $SERVER_PID; rm -f data/p7.sqlite*
```
Expected: decks с `"total":1,"learned":0`; words с `"progress":null`; stats с `"learned":1`, `"streak":1`, `"dailyGoal":20`, `decks[].total:1`.

- [ ] **Step 8: Commit**

```bash
git add server/src/stats/stats.service.ts server/src/stats/stats.routes.ts server/src/stats/__tests__/stats.service.test.ts server/src/training/training.routes.ts server/src/app.ts
git commit -m "Добавить /api/stats, сводку статистики и фиксацию дня занятия"
```

---

## Self-Review

**Покрытие потребностей дизайна:**
- Слова колоды с прогрессом (деталь/шит) — Task 2/3 (`listWordsWithProgress`) ✓
- Счётчики X/Y по колодам (карточки/дашборд) — Task 2/3 (`listDecksWithStats`) ✓
- `GET /api/stats` (learned/inProgress/dueToday/learnedToday/streak/dailyGoal/decks) — Task 4 ✓
- Стрик (фиксация дней + расчёт) — Task 1 + Task 4 (запись в `POST /result`) ✓

**Решения:** `dailyGoal` пока константа 20 (настройка профиля — позже); `inProgress` = строки прогресса с `learned_at IS NULL` (слово начато, но не выучено); день занятия пишется на любом валидном `POST /result`.

**Placeholder scan:** нет.

**Type consistency:** `DeckWithStats`, `WordWithProgress` (Task 2) → маршруты (Task 3) и `Stats.decks` (Task 4). `ProgressRow` переиспользуется из `training/progress.repository`. `recordStudyDay/computeStreak/isoDay` (Task 1) → stats.service + training.routes (Task 4). `getStats(db, now)` → `createStatsRouter` → app.ts.
