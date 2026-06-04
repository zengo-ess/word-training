# Decks, Words & Integrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать на бэкенде CRUD колод и слов, копирование слов между колодами, и интеграции MyMemory (перевод EN→RU) + Unsplash (картинки), с защитой всех маршрутов авторизацией.

**Architecture:** Слой данных — функции-репозитории, принимающие `Database` (тестируются на in-memory SQLite, как `migrate.ts`). Внешние интеграции — модули в `services/` с чистыми функциями построения URL и парсинга ответа + асинхронной обёрткой с инъекцией `fetch` для тестов. Маршруты — фабрики `createXRouter(...)`, монтируются в `app.ts` за middleware авторизации. Встроенные колоды (`is_builtin = 1`) — только для чтения: запись/правка/удаление их слов запрещены (403). Все `id` — guid через `crypto.randomUUID()`.

**Tech Stack:** Express, better-sqlite3, vitest, нативный `fetch` (Node 22).

---

## File Structure

```
server/src/
  decks/
    decks.repository.ts          # listDecks, getDeck, createDeck
    decks.routes.ts              # GET /, POST /, GET /:id/words
    __tests__/decks.repository.test.ts
  words/
    words.repository.ts          # list/get/create/update/delete
    words.routes.ts              # POST /lookup, POST /, PUT /:id, DELETE /:id, POST /:id/copy
    __tests__/words.repository.test.ts
  services/
    mymemory.ts                  # перевод EN→RU
    unsplash.ts                  # поиск картинок
    __tests__/mymemory.test.ts
    __tests__/unsplash.test.ts
  unsplash.routes.ts             # GET /search  (монтируется на /api/unsplash)
  app.ts                         # МОДИФИЦИРУЕТСЯ: подключение новых роутеров за авторизацией
```

**Конвенции (глобальные правила пользователя):**
- Только `import`, никогда `require`. Никогда слово `required` в коде.
- Все `id`/`key` — guid (`crypto.randomUUID()`), не `"1"`/`"test"`.
- Тест-файлы начинаются с двух строк:
  ```
  /* eslint-disable @typescript-eslint/no-unsafe-call */
  /* eslint-disable sonarjs/no-duplicate-string */
  ```
- НЕ писать интеграционные тесты (HTTP/полный сервер). Репозитории тестируем на in-memory SQLite (как уже принято для `migrate.ts`) — это юнит-тесты слоя данных. Сервисы тестируем с замоканным `fetch`.
- Ветка не нужна — коммитим прямо в `main`.

**Решение по флоу добавления слова (из брейншторма, вариант «черновик»):**
`POST /api/words/lookup` берёт английское слово, дёргает MyMemory + Unsplash и возвращает черновик (`russian`, `imageUrl`, список кандидатов) БЕЗ сохранения. Пользователь правит и затем сохраняет через `POST /api/words`. Для пользовательских слов транскрипция и пример не заполняются (остаются `null`).

---

### Task 1: Репозиторий колод

**Files:**
- Create: `server/src/decks/decks.repository.ts`
- Test: `server/src/decks/__tests__/decks.repository.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../../db/connection.js";
import { runMigrations } from "../../db/migrate.js";
import { listDecks, getDeck, createDeck } from "../decks.repository.js";

let db: Database.Database;

beforeEach(() => {
  db = createConnection(":memory:");
  runMigrations(db);
});

describe("createDeck / getDeck", () => {
  it("создаёт пользовательскую колоду (is_builtin = 0) с guid-идентификатором", () => {
    const deck = createDeck(db, "Мои слова");
    expect(deck.name).toBe("Мои слова");
    expect(deck.is_builtin).toBe(0);
    expect(deck.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(getDeck(db, deck.id)?.name).toBe("Мои слова");
  });

  it("getDeck возвращает undefined для неизвестного id", () => {
    expect(getDeck(db, "00000000-0000-0000-0000-000000000000")).toBeUndefined();
  });
});

describe("listDecks", () => {
  it("возвращает встроенные колоды раньше пользовательских", () => {
    db.prepare("INSERT INTO decks (id, name, is_builtin) VALUES (?, ?, 1)").run(
      "11111111-1111-1111-1111-111111111111",
      "Встроенная",
    );
    createDeck(db, "Пользовательская");
    const decks = listDecks(db);
    expect(decks).toHaveLength(2);
    expect(decks[0].is_builtin).toBe(1);
    expect(decks[1].is_builtin).toBe(0);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd server && npx vitest run src/decks/__tests__/decks.repository.test.ts`
Expected: FAIL — модуль `decks.repository.js` не найден.

- [ ] **Step 3: Реализовать `server/src/decks/decks.repository.ts`**

```ts
import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

export interface DeckRow {
  id: string;
  name: string;
  is_builtin: number;
  created_at: string;
}

export function listDecks(db: Database.Database): DeckRow[] {
  return db
    .prepare("SELECT * FROM decks ORDER BY is_builtin DESC, created_at ASC")
    .all() as DeckRow[];
}

export function getDeck(db: Database.Database, id: string): DeckRow | undefined {
  return db.prepare("SELECT * FROM decks WHERE id = ?").get(id) as DeckRow | undefined;
}

export function createDeck(db: Database.Database, name: string): DeckRow {
  const id = randomUUID();
  db.prepare("INSERT INTO decks (id, name, is_builtin) VALUES (?, ?, 0)").run(id, name);
  return getDeck(db, id) as DeckRow;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd server && npx vitest run src/decks/__tests__/decks.repository.test.ts`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add server/src/decks/decks.repository.ts server/src/decks/__tests__/decks.repository.test.ts
git commit -m "Добавить репозиторий колод"
```

---

### Task 2: Репозиторий слов

**Files:**
- Create: `server/src/words/words.repository.ts`
- Test: `server/src/words/__tests__/words.repository.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { createConnection } from "../../db/connection.js";
import { runMigrations } from "../../db/migrate.js";
import { createDeck } from "../../decks/decks.repository.js";
import {
  listWordsByDeck,
  getWord,
  createWord,
  updateWord,
  deleteWord,
} from "../words.repository.js";

let db: Database.Database;
let deckId: string;

beforeEach(() => {
  db = createConnection(":memory:");
  runMigrations(db);
  deckId = createDeck(db, "Колода").id;
});

describe("createWord", () => {
  it("создаёт слово с guid и null-полями транскрипции/примера по умолчанию", () => {
    const word = createWord(db, { deckId, english: "cat", russian: "кот" });
    expect(word.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(word.english).toBe("cat");
    expect(word.russian).toBe("кот");
    expect(word.transcription).toBeNull();
    expect(word.example_sentence).toBeNull();
    expect(word.image_url).toBeNull();
  });

  it("сохраняет переданные транскрипцию, пример и картинку", () => {
    const word = createWord(db, {
      deckId,
      english: "dog",
      russian: "собака",
      transcription: "dɒɡ",
      exampleSentence: "The dog barks.",
      imageUrl: "https://img/dog.jpg",
    });
    expect(word.transcription).toBe("dɒɡ");
    expect(word.example_sentence).toBe("The dog barks.");
    expect(word.image_url).toBe("https://img/dog.jpg");
  });
});

describe("listWordsByDeck", () => {
  it("возвращает только слова указанной колоды", () => {
    const other = createDeck(db, "Другая").id;
    createWord(db, { deckId, english: "cat", russian: "кот" });
    createWord(db, { deckId: other, english: "dog", russian: "собака" });
    const words = listWordsByDeck(db, deckId);
    expect(words).toHaveLength(1);
    expect(words[0].english).toBe("cat");
  });
});

describe("updateWord", () => {
  it("обновляет только переданные поля", () => {
    const word = createWord(db, { deckId, english: "cat", russian: "кот" });
    const updated = updateWord(db, word.id, { russian: "кошка" });
    expect(updated?.russian).toBe("кошка");
    expect(updated?.english).toBe("cat");
  });

  it("без полей не меняет запись и возвращает её", () => {
    const word = createWord(db, { deckId, english: "cat", russian: "кот" });
    const updated = updateWord(db, word.id, {});
    expect(updated?.russian).toBe("кот");
  });
});

describe("deleteWord", () => {
  it("удаляет слово и возвращает true; повторное удаление — false", () => {
    const word = createWord(db, { deckId, english: "cat", russian: "кот" });
    expect(deleteWord(db, word.id)).toBe(true);
    expect(getWord(db, word.id)).toBeUndefined();
    expect(deleteWord(db, word.id)).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd server && npx vitest run src/words/__tests__/words.repository.test.ts`
Expected: FAIL — модуль `words.repository.js` не найден.

- [ ] **Step 3: Реализовать `server/src/words/words.repository.ts`**

```ts
import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

export interface WordRow {
  id: string;
  deck_id: string;
  english: string;
  russian: string;
  transcription: string | null;
  example_sentence: string | null;
  image_url: string | null;
  created_at: string;
}

export interface NewWord {
  deckId: string;
  english: string;
  russian: string;
  transcription?: string | null;
  exampleSentence?: string | null;
  imageUrl?: string | null;
}

export interface WordUpdate {
  english?: string;
  russian?: string;
  transcription?: string | null;
  exampleSentence?: string | null;
  imageUrl?: string | null;
}

export function getWord(db: Database.Database, id: string): WordRow | undefined {
  return db.prepare("SELECT * FROM words WHERE id = ?").get(id) as WordRow | undefined;
}

export function listWordsByDeck(db: Database.Database, deckId: string): WordRow[] {
  return db
    .prepare("SELECT * FROM words WHERE deck_id = ? ORDER BY created_at ASC")
    .all(deckId) as WordRow[];
}

export function createWord(db: Database.Database, word: NewWord): WordRow {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO words (id, deck_id, english, russian, transcription, example_sentence, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    word.deckId,
    word.english,
    word.russian,
    word.transcription ?? null,
    word.exampleSentence ?? null,
    word.imageUrl ?? null,
  );
  return getWord(db, id) as WordRow;
}

export function updateWord(
  db: Database.Database,
  id: string,
  update: WordUpdate,
): WordRow | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (update.english !== undefined) {
    fields.push("english = ?");
    values.push(update.english);
  }
  if (update.russian !== undefined) {
    fields.push("russian = ?");
    values.push(update.russian);
  }
  if (update.transcription !== undefined) {
    fields.push("transcription = ?");
    values.push(update.transcription);
  }
  if (update.exampleSentence !== undefined) {
    fields.push("example_sentence = ?");
    values.push(update.exampleSentence);
  }
  if (update.imageUrl !== undefined) {
    fields.push("image_url = ?");
    values.push(update.imageUrl);
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE words SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }
  return getWord(db, id);
}

export function deleteWord(db: Database.Database, id: string): boolean {
  const result = db.prepare("DELETE FROM words WHERE id = ?").run(id);
  return result.changes > 0;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd server && npx vitest run src/words/__tests__/words.repository.test.ts`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add server/src/words/words.repository.ts server/src/words/__tests__/words.repository.test.ts
git commit -m "Добавить репозиторий слов"
```

---

### Task 3: Сервис перевода MyMemory

**Files:**
- Create: `server/src/services/mymemory.ts`
- Test: `server/src/services/__tests__/mymemory.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import {
  buildTranslateUrl,
  parseTranslation,
  translateToRussian,
} from "../mymemory.js";

function mockFetch(payload: { ok: boolean; body?: unknown }): typeof fetch {
  return (async () => ({
    ok: payload.ok,
    json: async () => payload.body,
  })) as unknown as typeof fetch;
}

describe("buildTranslateUrl", () => {
  it("строит URL с langpair en|ru и закодированным словом", () => {
    const url = buildTranslateUrl("good morning");
    expect(url).toContain("https://api.mymemory.translated.net/get?");
    expect(url).toContain("q=good+morning");
    expect(url).toContain("langpair=en%7Cru");
  });
});

describe("parseTranslation", () => {
  it("извлекает translatedText", () => {
    expect(parseTranslation({ responseData: { translatedText: "кот" } })).toBe("кот");
  });

  it("возвращает пустую строку при отсутствии данных", () => {
    expect(parseTranslation({})).toBe("");
    expect(parseTranslation(null)).toBe("");
  });
});

describe("translateToRussian", () => {
  it("возвращает перевод при успешном ответе", async () => {
    const fetchFn = mockFetch({ ok: true, body: { responseData: { translatedText: "кот" } } });
    expect(await translateToRussian("cat", fetchFn)).toBe("кот");
  });

  it("возвращает пустую строку при не-ok ответе", async () => {
    const fetchFn = mockFetch({ ok: false });
    expect(await translateToRussian("cat", fetchFn)).toBe("");
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd server && npx vitest run src/services/__tests__/mymemory.test.ts`
Expected: FAIL — модуль `mymemory.js` не найден.

- [ ] **Step 3: Реализовать `server/src/services/mymemory.ts`**

```ts
export function buildTranslateUrl(text: string): string {
  const params = new URLSearchParams({ q: text, langpair: "en|ru" });
  return `https://api.mymemory.translated.net/get?${params.toString()}`;
}

interface MyMemoryResponse {
  responseData?: { translatedText?: string };
}

export function parseTranslation(json: unknown): string {
  const data = (json ?? {}) as MyMemoryResponse;
  return data.responseData?.translatedText ?? "";
}

export async function translateToRussian(
  text: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchFn(buildTranslateUrl(text));
  if (!response.ok) {
    return "";
  }
  const json: unknown = await response.json();
  return parseTranslation(json);
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd server && npx vitest run src/services/__tests__/mymemory.test.ts`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add server/src/services/mymemory.ts server/src/services/__tests__/mymemory.test.ts
git commit -m "Добавить сервис перевода MyMemory"
```

---

### Task 4: Сервис картинок Unsplash

**Files:**
- Create: `server/src/services/unsplash.ts`
- Test: `server/src/services/__tests__/unsplash.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import {
  buildUnsplashSearchUrl,
  parseUnsplashResults,
  searchImages,
} from "../unsplash.js";

function mockFetch(payload: { ok: boolean; body?: unknown }): typeof fetch {
  return (async () => ({
    ok: payload.ok,
    json: async () => payload.body,
  })) as unknown as typeof fetch;
}

describe("buildUnsplashSearchUrl", () => {
  it("строит URL поиска с query и per_page", () => {
    const url = buildUnsplashSearchUrl("cat");
    expect(url).toContain("https://api.unsplash.com/search/photos?");
    expect(url).toContain("query=cat");
    expect(url).toContain("per_page=12");
  });
});

describe("parseUnsplashResults", () => {
  it("возвращает массив regular-ссылок", () => {
    const urls = parseUnsplashResults({
      results: [{ urls: { regular: "https://img/1" } }, { urls: { regular: "https://img/2" } }],
    });
    expect(urls).toEqual(["https://img/1", "https://img/2"]);
  });

  it("отфильтровывает элементы без ссылки и пустой ответ", () => {
    expect(parseUnsplashResults({ results: [{ urls: {} }] })).toEqual([]);
    expect(parseUnsplashResults({})).toEqual([]);
  });
});

describe("searchImages", () => {
  it("возвращает пустой массив без ключа доступа (fetch не вызывается)", async () => {
    let called = false;
    const fetchFn = (async () => {
      called = true;
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof fetch;
    expect(await searchImages("cat", "", fetchFn)).toEqual([]);
    expect(called).toBe(false);
  });

  it("возвращает ссылки при успешном ответе", async () => {
    const fetchFn = mockFetch({ ok: true, body: { results: [{ urls: { regular: "https://img/1" } }] } });
    expect(await searchImages("cat", "key", fetchFn)).toEqual(["https://img/1"]);
  });

  it("возвращает пустой массив при не-ok ответе", async () => {
    const fetchFn = mockFetch({ ok: false });
    expect(await searchImages("cat", "key", fetchFn)).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd server && npx vitest run src/services/__tests__/unsplash.test.ts`
Expected: FAIL — модуль `unsplash.js` не найден.

- [ ] **Step 3: Реализовать `server/src/services/unsplash.ts`**

```ts
export function buildUnsplashSearchUrl(query: string, perPage = 12): string {
  const params = new URLSearchParams({ query, per_page: String(perPage) });
  return `https://api.unsplash.com/search/photos?${params.toString()}`;
}

interface UnsplashResponse {
  results?: Array<{ urls?: { regular?: string } }>;
}

export function parseUnsplashResults(json: unknown): string[] {
  const data = (json ?? {}) as UnsplashResponse;
  return (data.results ?? [])
    .map((item) => item.urls?.regular)
    .filter((url): url is string => typeof url === "string");
}

export async function searchImages(
  query: string,
  accessKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<string[]> {
  if (!accessKey) {
    return [];
  }
  const response = await fetchFn(buildUnsplashSearchUrl(query), {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });
  if (!response.ok) {
    return [];
  }
  const json: unknown = await response.json();
  return parseUnsplashResults(json);
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd server && npx vitest run src/services/__tests__/unsplash.test.ts`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add server/src/services/unsplash.ts server/src/services/__tests__/unsplash.test.ts
git commit -m "Добавить сервис картинок Unsplash"
```

---

### Task 5: Маршруты колод

**Files:**
- Create: `server/src/decks/decks.routes.ts`

- [ ] **Step 1: Реализовать `server/src/decks/decks.routes.ts`**

```ts
import { Router } from "express";
import type Database from "better-sqlite3";
import { listDecks, getDeck, createDeck } from "./decks.repository.js";
import { listWordsByDeck } from "../words/words.repository.js";

export function createDecksRouter(db: Database.Database): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ decks: listDecks(db) });
  });

  router.post("/", (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      res.status(400).json({ error: "Не указано название колоды" });
      return;
    }
    res.status(201).json({ deck: createDeck(db, name) });
  });

  router.get("/:id/words", (req, res) => {
    const deck = getDeck(db, req.params.id);
    if (!deck) {
      res.status(404).json({ error: "Колода не найдена" });
      return;
    }
    res.json({ words: listWordsByDeck(db, req.params.id) });
  });

  return router;
}
```

- [ ] **Step 2: Проверить типы**

Run: `cd server && npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 3: Commit**

```bash
git add server/src/decks/decks.routes.ts
git commit -m "Добавить маршруты колод"
```

---

### Task 6: Маршруты слов и поиска картинок

**Files:**
- Create: `server/src/words/words.routes.ts`
- Create: `server/src/unsplash.routes.ts`

- [ ] **Step 1: Реализовать `server/src/words/words.routes.ts`**

```ts
import { Router } from "express";
import type Database from "better-sqlite3";
import { getDeck } from "../decks/decks.repository.js";
import { createWord, getWord, updateWord, deleteWord } from "./words.repository.js";
import { translateToRussian } from "../services/mymemory.js";
import { searchImages } from "../services/unsplash.js";

const BUILTIN_READONLY = "Встроенная колода доступна только для чтения";

export function createWordsRouter(db: Database.Database, unsplashAccessKey: string): Router {
  const router = Router();

  // Авто-черновик: перевод + картинки, без сохранения
  router.post("/lookup", async (req, res) => {
    const english = typeof req.body?.english === "string" ? req.body.english.trim() : "";
    if (!english) {
      res.status(400).json({ error: "Не указано слово" });
      return;
    }
    const [russian, images] = await Promise.all([
      translateToRussian(english),
      searchImages(english, unsplashAccessKey),
    ]);
    res.json({
      english,
      russian,
      imageUrl: images[0] ?? null,
      imageCandidates: images,
    });
  });

  router.post("/", (req, res) => {
    const body = req.body ?? {};
    const deckId = typeof body.deckId === "string" ? body.deckId : "";
    const english = typeof body.english === "string" ? body.english.trim() : "";
    const russian = typeof body.russian === "string" ? body.russian.trim() : "";
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;

    const deck = getDeck(db, deckId);
    if (!deck) {
      res.status(404).json({ error: "Колода не найдена" });
      return;
    }
    if (deck.is_builtin) {
      res.status(403).json({ error: BUILTIN_READONLY });
      return;
    }
    if (!english || !russian) {
      res.status(400).json({ error: "Нужны английское слово и перевод" });
      return;
    }

    res.status(201).json({ word: createWord(db, { deckId, english, russian, imageUrl }) });
  });

  router.put("/:id", (req, res) => {
    const word = getWord(db, req.params.id);
    if (!word) {
      res.status(404).json({ error: "Слово не найдено" });
      return;
    }
    const deck = getDeck(db, word.deck_id);
    if (deck?.is_builtin) {
      res.status(403).json({ error: BUILTIN_READONLY });
      return;
    }
    const body = req.body ?? {};
    const updated = updateWord(db, req.params.id, {
      english: typeof body.english === "string" ? body.english.trim() : undefined,
      russian: typeof body.russian === "string" ? body.russian.trim() : undefined,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
    });
    res.json({ word: updated });
  });

  router.delete("/:id", (req, res) => {
    const word = getWord(db, req.params.id);
    if (!word) {
      res.status(404).json({ error: "Слово не найдено" });
      return;
    }
    const deck = getDeck(db, word.deck_id);
    if (deck?.is_builtin) {
      res.status(403).json({ error: BUILTIN_READONLY });
      return;
    }
    deleteWord(db, req.params.id);
    res.status(204).end();
  });

  // Скопировать слово из встроенной (или любой) колоды в свою
  router.post("/:id/copy", (req, res) => {
    const source = getWord(db, req.params.id);
    if (!source) {
      res.status(404).json({ error: "Слово не найдено" });
      return;
    }
    const targetDeckId =
      typeof req.body?.targetDeckId === "string" ? req.body.targetDeckId : "";
    const target = getDeck(db, targetDeckId);
    if (!target) {
      res.status(404).json({ error: "Целевая колода не найдена" });
      return;
    }
    if (target.is_builtin) {
      res.status(403).json({ error: BUILTIN_READONLY });
      return;
    }
    const word = createWord(db, {
      deckId: targetDeckId,
      english: source.english,
      russian: source.russian,
      transcription: source.transcription,
      exampleSentence: source.example_sentence,
      imageUrl: source.image_url,
    });
    res.status(201).json({ word });
  });

  return router;
}
```

- [ ] **Step 2: Реализовать `server/src/unsplash.routes.ts`**

```ts
import { Router } from "express";
import { searchImages } from "./services/unsplash.js";

export function createUnsplashRouter(unsplashAccessKey: string): Router {
  const router = Router();

  router.get("/search", async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    if (!query) {
      res.status(400).json({ error: "Не указан поисковый запрос" });
      return;
    }
    res.json({ images: await searchImages(query, unsplashAccessKey) });
  });

  return router;
}
```

- [ ] **Step 3: Проверить типы**

Run: `cd server && npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 4: Commit**

```bash
git add server/src/words/words.routes.ts server/src/unsplash.routes.ts
git commit -m "Добавить маршруты слов и поиска картинок"
```

---

### Task 7: Подключить роутеры в app.ts за авторизацией

**Files:**
- Modify: `server/src/app.ts`

- [ ] **Step 1: Заменить содержимое `server/src/app.ts`**

Текущий файл:

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

Заменить на:

```ts
import express, { type Express } from "express";
import type Database from "better-sqlite3";
import type { AppConfig } from "./config.js";
import { createAuthRouter } from "./auth/auth.routes.js";
import { createAuthMiddleware } from "./auth/auth.middleware.js";
import { createDecksRouter } from "./decks/decks.routes.js";
import { createWordsRouter } from "./words/words.routes.js";
import { createUnsplashRouter } from "./unsplash.routes.js";

export function createApp(config: AppConfig, db: Database.Database): Express {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", createAuthRouter(config));

  const requireAuth = createAuthMiddleware(config.jwtSecret);
  app.use("/api/decks", requireAuth, createDecksRouter(db));
  app.use("/api/words", requireAuth, createWordsRouter(db, config.unsplashAccessKey));
  app.use("/api/unsplash", requireAuth, createUnsplashRouter(config.unsplashAccessKey));

  return app;
}
```

- [ ] **Step 2: Проверить типы и весь тест-сьют**

Run: `cd server && npx tsc --noEmit && npm test`
Expected: типы без ошибок; все тесты PASS (config, migrate, auth.service, decks.repository, words.repository, mymemory, unsplash).

- [ ] **Step 3: Ручная проверка защиты и CRUD**

Run:
```bash
cd server
mkdir -p data
rm -f data/manual-check.sqlite
DB_FILE=data/manual-check.sqlite APP_PASSWORD=hunter2 JWT_SECRET=dev-secret npx tsx src/index.ts &
SERVER_PID=$!
sleep 1

echo "--- без токена должно быть 401 ---"
curl -s -o /dev/null -w "%{http_code}\n" localhost:3001/api/decks

TOKEN=$(curl -s -X POST localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"password":"hunter2"}' | sed 's/.*"token":"//;s/".*//')

echo "--- список колод (пусто) ---"
curl -s localhost:3001/api/decks -H "Authorization: Bearer $TOKEN"

echo "--- создать колоду ---"
DECK=$(curl -s -X POST localhost:3001/api/decks -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"name":"Моя колода"}')
echo "$DECK"
DECK_ID=$(echo "$DECK" | sed 's/.*"id":"//;s/".*//')

echo "--- добавить слово ---"
curl -s -X POST localhost:3001/api/words -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"deckId\":\"$DECK_ID\",\"english\":\"cat\",\"russian\":\"кот\"}"
echo

echo "--- слова колоды ---"
curl -s "localhost:3001/api/decks/$DECK_ID/words" -H "Authorization: Bearer $TOKEN"
echo

kill $SERVER_PID
rm -f data/manual-check.sqlite
```
Expected:
- без токена → `401`
- список колод → `{"decks":[]}` сначала
- создание колоды → `{"deck":{...,"name":"Моя колода","is_builtin":0}}` (HTTP 201)
- добавление слова → `{"word":{...,"english":"cat","russian":"кот","transcription":null}}` (HTTP 201)
- слова колоды → `{"words":[{...,"english":"cat"}]}`

(Заметка: `/lookup` и `/api/unsplash/search` дёргают внешние API — в ручной проверке их не вызываем, чтобы не зависеть от сети; их парсинг покрыт юнит-тестами.)

- [ ] **Step 4: Commit**

```bash
git add server/src/app.ts
git commit -m "Подключить маршруты колод, слов и картинок за авторизацией"
```

---

## Self-Review

**Spec coverage (для этого плана):**
- `GET /api/decks` (встроенные + пользовательские) — Task 5 ✓ (`listDecks`, сортировка builtin первыми)
- `POST /api/decks` (создать свою колоду) — Task 5 ✓
- `GET /api/decks/:id/words` — Task 5 ✓
- `POST /api/words` (добавить слово) — Task 6 ✓ (без транскрипции/примера для пользовательских — `null`)
- `PUT /api/words/:id`, `DELETE /api/words/:id` — Task 6 ✓
- Копирование слова из встроенной колоды к себе — Task 6 ✓ (`POST /api/words/:id/copy`)
- Авто-заполнение при добавлении: MyMemory перевод + Unsplash картинка — Task 3, 4, 6 (`POST /api/words/lookup`) ✓
- Ручная замена картинки (поиск по Unsplash) — Task 6 (`GET /api/unsplash/search`) ✓
- Встроенные колоды только для чтения — Task 6 ✓ (403 на запись/правку/удаление/копирование-в-builtin)
- Все маршруты под авторизацией — Task 7 ✓ (`requireAuth`)
- Кеширование `image_url` в БД — обеспечено тем, что ссылка сохраняется в `words.image_url` и при показе карточек повторно Unsplash не дёргается ✓

**Вне scope (последующие планы):** тренажёр и `progress` (План 3), spaced repetition (План 3), статистика (План 6), фронтенд (Планы 4-6), генератор встроенных колод (План 7). Поэтому здесь `progress` НЕ трогаем — слово создаётся без записи прогресса; инициализацию прогресса спроектируем в Плане 3.

**Placeholder scan:** плейсхолдеров нет, весь код приведён целиком.

**Type consistency:** `DeckRow`/`WordRow` поля (`is_builtin`, `deck_id`, `example_sentence`, `image_url`) единообразно используются в репозиториях и маршрутах. Сигнатуры: `createDecksRouter(db)`, `createWordsRouter(db, unsplashAccessKey)`, `createUnsplashRouter(unsplashAccessKey)`, `createWord(db, NewWord)`, `updateWord(db, id, WordUpdate)`, `translateToRussian(text, fetchFn?)`, `searchImages(query, accessKey, fetchFn?)` — согласованы между задачами и с `app.ts` (Task 7). `createApp(config, db)` теперь использует `db` (убран префикс `_`).
