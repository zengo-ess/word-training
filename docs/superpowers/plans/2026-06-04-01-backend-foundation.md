# Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Поднять монорепо, сервер на Express + TypeScript с SQLite (better-sqlite3), системой миграций и авторизацией по одному паролю с выдачей JWT.

**Architecture:** Монорепо с отдельными `client/` и `server/`. Сервер на Express + TS. БД — SQLite через `better-sqlite3` (синхронный), миграции — `.sql`-файлы, прогоняемые на старте идемпотентно. Авторизация: один пароль из env (`APP_PASSWORD`), constant-time сравнение, при успехе выдаётся JWT (`jsonwebtoken`), защищённые маршруты проверяются middleware. Логика тестируется как чистые функции (без поднятия сервера — интеграционные тесты не пишем).

**Tech Stack:** Node.js, Express 4, TypeScript, better-sqlite3, jsonwebtoken, vitest, tsx.

---

## File Structure

```
/server
  package.json
  tsconfig.json
  vitest.config.ts
  .env.example
  /src
    index.ts                  # Express bootstrap (запуск)
    app.ts                    # сборка Express app (без listen) — для будущих тестов/переиспользования
    config.ts                 # чтение и валидация env
    /db
      connection.ts           # создание better-sqlite3 connection
      migrate.ts              # прогон .sql миграций
      /migrations
        001_init.sql          # decks, words, progress
    /auth
      auth.service.ts         # checkPassword, signToken, verifyToken (чистые функции)
      auth.middleware.ts      # requireAuth (Express middleware)
      auth.routes.ts          # POST /api/auth/login
    /auth/__tests__
      auth.service.test.ts
    /db/__tests__
      migrate.test.ts
```

**Конвенции из глобальных правил пользователя:**
- Только `import` (никогда `require`).
- Никаких `required` в коде.
- Для `id`/`key`/`testId` использовать guid, не `"1"`/`"test"`.
- Тесты: НЕ интеграционные. Тестируем чистые функции.

---

### Task 1: Инициализация монорепо и server package

**Files:**
- Create: `.gitignore`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env.example`

- [ ] **Step 1: Создать `.gitignore` в корне**

```gitignore
node_modules/
dist/
*.log
.env
server/data/*.sqlite
server/data/*.sqlite-journal
.DS_Store
```

- [ ] **Step 2: Создать `server/package.json`**

```json
{
  "name": "word-training-server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "better-sqlite3": "^11.3.0",
    "express": "^4.21.0",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.7.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 3: Создать `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Создать `server/.env.example`**

```
APP_PASSWORD=change-me
JWT_SECRET=change-me-too
UNSPLASH_ACCESS_KEY=
PORT=3001
```

- [ ] **Step 5: Установить зависимости**

Run: `cd server && npm install`
Expected: `node_modules` создан, `package-lock.json` появился, без ошибок.

- [ ] **Step 6: Commit**

```bash
git add .gitignore server/package.json server/tsconfig.json server/.env.example server/package-lock.json
git commit -m "Инициализировать server package и tooling"
```

---

### Task 2: Конфиг из env с валидацией

**Files:**
- Create: `server/src/config.ts`
- Test: `server/src/__tests__/config.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
import { describe, it, expect } from "vitest";
import { loadConfig } from "../config.js";

describe("loadConfig", () => {
  it("читает значения из переданного окружения", () => {
    const config = loadConfig({
      APP_PASSWORD: "secret",
      JWT_SECRET: "jwt-secret",
      UNSPLASH_ACCESS_KEY: "unsplash",
      PORT: "4000",
    });
    expect(config.appPassword).toBe("secret");
    expect(config.jwtSecret).toBe("jwt-secret");
    expect(config.unsplashAccessKey).toBe("unsplash");
    expect(config.port).toBe(4000);
  });

  it("использует порт 3001 по умолчанию", () => {
    const config = loadConfig({ APP_PASSWORD: "p", JWT_SECRET: "j" });
    expect(config.port).toBe(3001);
  });

  it("бросает ошибку, если нет APP_PASSWORD или JWT_SECRET", () => {
    expect(() => loadConfig({ JWT_SECRET: "j" })).toThrow(/APP_PASSWORD/);
    expect(() => loadConfig({ APP_PASSWORD: "p" })).toThrow(/JWT_SECRET/);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd server && npx vitest run src/__tests__/config.test.ts`
Expected: FAIL — `loadConfig` не найден.

- [ ] **Step 3: Реализовать `server/src/config.ts`**

```ts
export interface AppConfig {
  appPassword: string;
  jwtSecret: string;
  unsplashAccessKey: string;
  port: number;
}

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const appPassword = env.APP_PASSWORD;
  const jwtSecret = env.JWT_SECRET;

  if (!appPassword) {
    throw new Error("Отсутствует переменная окружения APP_PASSWORD");
  }
  if (!jwtSecret) {
    throw new Error("Отсутствует переменная окружения JWT_SECRET");
  }

  return {
    appPassword,
    jwtSecret,
    unsplashAccessKey: env.UNSPLASH_ACCESS_KEY ?? "",
    port: env.PORT ? Number(env.PORT) : 3001,
  };
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd server && npx vitest run src/__tests__/config.test.ts`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add server/src/config.ts server/src/__tests__/config.test.ts
git commit -m "Добавить загрузку конфига из env с валидацией"
```

---

### Task 3: SQLite-соединение и схема (миграция 001)

**Files:**
- Create: `server/src/db/connection.ts`
- Create: `server/src/db/migrations/001_init.sql`

- [ ] **Step 1: Создать `server/src/db/migrations/001_init.sql`**

```sql
CREATE TABLE IF NOT EXISTS decks (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  is_builtin  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS words (
  id                TEXT PRIMARY KEY,
  deck_id           TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  english           TEXT NOT NULL,
  russian           TEXT NOT NULL,
  transcription     TEXT,
  example_sentence  TEXT,
  image_url         TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS progress (
  id               TEXT PRIMARY KEY,
  word_id          TEXT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  current_type     INTEGER,
  learned_at       TEXT,
  ease_factor      REAL NOT NULL DEFAULT 2.5,
  interval_days    INTEGER NOT NULL DEFAULT 0,
  next_review_at   TEXT,
  total_reviews    INTEGER NOT NULL DEFAULT 0,
  correct_reviews  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_words_deck ON words(deck_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_progress_word ON progress(word_id);
CREATE INDEX IF NOT EXISTS idx_progress_review ON progress(next_review_at);
```

- [ ] **Step 2: Реализовать `server/src/db/connection.ts`**

```ts
import Database from "better-sqlite3";

export function createConnection(filename: string): Database.Database {
  const db = new Database(filename);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/db/connection.ts server/src/db/migrations/001_init.sql
git commit -m "Добавить SQLite-соединение и начальную схему"
```

---

### Task 4: Прогон миграций

**Files:**
- Create: `server/src/db/migrate.ts`
- Test: `server/src/db/__tests__/migrate.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { runMigrations } from "../migrate.js";

function tableNames(db: Database.Database): string[] {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((row) => (row as { name: string }).name);
}

describe("runMigrations", () => {
  it("создаёт таблицы decks, words, progress на чистой БД", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const tables = tableNames(db);
    expect(tables).toContain("decks");
    expect(tables).toContain("words");
    expect(tables).toContain("progress");
  });

  it("идемпотентен — повторный прогон не падает", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    expect(() => runMigrations(db)).not.toThrow();
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd server && npx vitest run src/db/__tests__/migrate.test.ts`
Expected: FAIL — `runMigrations` не найден.

- [ ] **Step 3: Реализовать `server/src/db/migrate.ts`**

```ts
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
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd server && npx vitest run src/db/__tests__/migrate.test.ts`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add server/src/db/migrate.ts server/src/db/__tests__/migrate.test.ts
git commit -m "Добавить идемпотентный прогон SQL-миграций"
```

---

### Task 5: Auth-сервис (чистые функции)

**Files:**
- Create: `server/src/auth/auth.service.ts`
- Test: `server/src/auth/__tests__/auth.service.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
import { describe, it, expect } from "vitest";
import { checkPassword, signToken, verifyToken } from "../auth.service.js";

const SECRET = "test-secret";

describe("checkPassword", () => {
  it("возвращает true при совпадении", () => {
    expect(checkPassword("hunter2", "hunter2")).toBe(true);
  });

  it("возвращает false при несовпадении", () => {
    expect(checkPassword("wrong", "hunter2")).toBe(false);
  });

  it("возвращает false при разной длине", () => {
    expect(checkPassword("short", "muchlongerpassword")).toBe(false);
  });
});

describe("signToken / verifyToken", () => {
  it("подписанный токен успешно проверяется", () => {
    const token = signToken(SECRET);
    expect(verifyToken(token, SECRET)).toBe(true);
  });

  it("токен с неверным секретом не проходит проверку", () => {
    const token = signToken(SECRET);
    expect(verifyToken(token, "other-secret")).toBe(false);
  });

  it("мусорный токен не проходит проверку", () => {
    expect(verifyToken("not-a-token", SECRET)).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd server && npx vitest run src/auth/__tests__/auth.service.test.ts`
Expected: FAIL — функции не найдены.

- [ ] **Step 3: Реализовать `server/src/auth/auth.service.ts`**

```ts
import { timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";

export function checkPassword(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function signToken(secret: string): string {
  return jwt.sign({ sub: "owner" }, secret, { expiresIn: "30d" });
}

export function verifyToken(token: string, secret: string): boolean {
  try {
    jwt.verify(token, secret);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd server && npx vitest run src/auth/__tests__/auth.service.test.ts`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add server/src/auth/auth.service.ts server/src/auth/__tests__/auth.service.test.ts
git commit -m "Добавить auth-сервис: проверка пароля и JWT"
```

---

### Task 6: Auth middleware и роут логина

**Files:**
- Create: `server/src/auth/auth.middleware.ts`
- Create: `server/src/auth/auth.routes.ts`

- [ ] **Step 1: Реализовать `server/src/auth/auth.middleware.ts`**

```ts
import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "./auth.service.js";

export function createAuthMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!token || !verifyToken(token, secret)) {
      res.status(401).json({ error: "Не авторизован" });
      return;
    }
    next();
  };
}
```

- [ ] **Step 2: Реализовать `server/src/auth/auth.routes.ts`**

```ts
import { Router } from "express";
import type { AppConfig } from "../config.js";
import { checkPassword, signToken } from "./auth.service.js";

export function createAuthRouter(config: AppConfig): Router {
  const router = Router();

  router.post("/login", (req, res) => {
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!checkPassword(password, config.appPassword)) {
      res.status(401).json({ error: "Неверный пароль" });
      return;
    }

    res.json({ token: signToken(config.jwtSecret) });
  });

  return router;
}
```

- [ ] **Step 3: Проверить типы**

Run: `cd server && npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add server/src/auth/auth.middleware.ts server/src/auth/auth.routes.ts
git commit -m "Добавить middleware авторизации и роут логина"
```

---

### Task 7: Сборка Express app и точка входа

**Files:**
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`

- [ ] **Step 1: Реализовать `server/src/app.ts`**

```ts
import express, { type Express } from "express";
import type Database from "better-sqlite3";
import type { AppConfig } from "./config.js";
import { createAuthRouter } from "./auth/auth.routes.js";

export function createApp(config: AppConfig, _db: Database.Database): Express {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", createAuthRouter(config));

  return app;
}
```

- [ ] **Step 2: Реализовать `server/src/index.ts`**

```ts
import { loadConfig } from "./config.js";
import { createConnection } from "./db/connection.js";
import { runMigrations } from "./db/migrate.js";
import { createApp } from "./app.js";

const config = loadConfig(process.env);

const dbFile = process.env.DB_FILE ?? "data/word-training.sqlite";
const db = createConnection(dbFile);
runMigrations(db);

const app = createApp(config, db);
app.listen(config.port, () => {
  console.log(`Сервер запущен на порту ${config.port}`);
});
```

- [ ] **Step 3: Проверить типы**

Run: `cd server && npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Запустить сервер вручную и проверить health + login**

Run:
```bash
cd server
mkdir -p data
APP_PASSWORD=hunter2 JWT_SECRET=dev-secret npx tsx src/index.ts &
sleep 1
curl -s localhost:3001/api/health
curl -s -X POST localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"password":"hunter2"}'
curl -s -X POST localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"password":"wrong"}'
kill %1
```
Expected:
- health → `{"status":"ok"}`
- верный пароль → `{"token":"<jwt>"}`
- неверный пароль → `{"error":"Неверный пароль"}` (HTTP 401)

- [ ] **Step 5: Прогнать весь тест-сьют**

Run: `cd server && npm test`
Expected: все тесты PASS (config, migrate, auth.service).

- [ ] **Step 6: Commit**

```bash
git add server/src/app.ts server/src/index.ts
git commit -m "Собрать Express app и точку входа с миграциями на старте"
```

---

## Self-Review

**Spec coverage (для этого плана — фундамент бэкенда):**
- Монорепо `server/` со своим package.json — Task 1 ✓
- SQLite + better-sqlite3 — Task 3 ✓
- Миграции `.sql`, прогон на старте — Task 4 + Task 7 ✓
- Модели `decks`, `words`, `progress` без `user_id`, без `users` — Task 3 ✓ (поля `current_type`, `learned_at`, SM-2 включены)
- Вход по одному паролю → JWT — Tasks 5, 6 ✓
- Env `APP_PASSWORD`, `JWT_SECRET`, `UNSPLASH_ACCESS_KEY`, `PORT` — Task 1 (.env.example), Task 2 (loadConfig) ✓
- Защита маршрутов middleware (для следующих планов) — Task 6 ✓ (`createAuthMiddleware` готов к использованию)

**Вне scope этого плана (последующие планы):** колоды/слова API, MyMemory, Unsplash, тренажёр, SM-2-расчёт, фронтенд, генератор колод, Docker. `client/` создаётся в плане фронтенда.

**Placeholder scan:** плейсхолдеров нет — весь код приведён целиком.

**Type consistency:** `AppConfig` (config.ts) используется в auth.routes и app с одинаковыми полями; `createAuthRouter(config)`, `createAuthMiddleware(secret)`, `createApp(config, db)`, `runMigrations(db)`, `createConnection(filename)` — сигнатуры согласованы между задачами.

**Примечание по ESLint:** в Task 1 ESLint ещё не сконфигурирован (`lint` скрипт есть, конфиг добавим вместе с фронтендом/общим тулингом в отдельном шаге). Глобальное правило пользователя про авто-проверку линтера применяется по мере появления конфига.
