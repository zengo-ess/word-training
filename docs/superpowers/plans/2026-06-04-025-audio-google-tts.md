# Audio (Google TTS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Генерировать MP3-озвучку слова через Google Text-to-Speech один раз при добавлении, сохранять файл на диск, отдавать статикой и хранить путь в `words.audio_url`.

**Architecture:** Сначала апгрейдим прогон миграций до отслеживания применённых (чтобы `ALTER TABLE` был идемпотентным между перезапусками). Затем миграция `002` добавляет колонку `audio_url`, репозиторий слов её поддерживает. Сервис `googleTts` (как `mymemory`/`unsplash`: чистые build/parse + async с инъекцией `fetch`) возвращает MP3-байты. Модуль `audioStorage` пишет файл в `{uploadsDir}/audio/{word_id}.mp3` и отдаёт публичный путь. В роуте создания слова после вставки строки генерируем и сохраняем озвучку (опционально — при ошибке/без ключа слово сохраняется без аудио). Express раздаёт `/uploads` статикой. При удалении слова чистим его файл.

**Tech Stack:** Express, better-sqlite3, vitest, нативный `fetch` (Node 22), Google Cloud Text-to-Speech REST API.

---

## File Structure

```
server/src/
  db/
    migrate.ts                       # МОДИФИЦИРУЕТСЯ: отслеживание применённых миграций (_migrations)
    migrations/002_add_audio_url.sql # НОВЫЙ: ALTER TABLE words ADD COLUMN audio_url
  words/
    words.repository.ts              # МОДИФИЦИРУЕТСЯ: audio_url в WordRow/NewWord/WordUpdate/create/update
    words.routes.ts                  # МОДИФИЦИРУЕТСЯ: генерация аудио при создании, чистка при удалении, копирование audio_url
  services/
    googleTts.ts                     # НОВЫЙ: синтез MP3 через Google TTS
    audioStorage.ts                  # НОВЫЙ: сохранение/удаление аудио-файлов
    __tests__/googleTts.test.ts
    __tests__/audioStorage.test.ts
  config.ts                          # МОДИФИЦИРУЕТСЯ: googleTtsApiKey, uploadsDir
  app.ts                             # МОДИФИЦИРУЕТСЯ: раздача /uploads статикой, deps для words-роутера
  index.ts                           # МОДИФИЦИРУЕТСЯ: создание папки uploads/audio на старте
```

**Конвенции (глобальные правила пользователя):**
- Только `import`, никогда `require`. Никогда слово `required` в коде.
- Все `id` — guid. Тест-файлы начинаются с двух eslint-disable строк.
- НЕ интеграционные тесты. Репозиторий/хранилище тестируем на in-memory SQLite и tmp-папке; сервис — с замоканным `fetch`.
- Коммитим прямо в `main` (без feature-веток).

**Замечание про битрейт:** Google TTS REST не принимает битрейт параметром; задаём `audioEncoding: "MP3"`. Файлы коротких слов и так ~единицы КБ, что соответствует целевым ~2–4 КБ из спеки.

---

### Task 1: Отслеживание применённых миграций

**Files:**
- Modify: `server/src/db/migrate.ts`
- Modify (расширить тест): `server/src/db/__tests__/migrate.test.ts`

- [ ] **Step 1: Дописать тест в `server/src/db/__tests__/migrate.test.ts`**

Добавь внутрь файла (после существующих тестов, перед закрытием) новый блок:

```ts
describe("отслеживание применённых миграций", () => {
  it("повторный прогон не применяет миграции дважды", () => {
    const db = new Database(":memory:");
    runMigrations(db);
    const first = db.prepare("SELECT COUNT(*) AS c FROM _migrations").get() as { c: number };
    runMigrations(db);
    const second = db.prepare("SELECT COUNT(*) AS c FROM _migrations").get() as { c: number };
    expect(first.c).toBeGreaterThan(0);
    expect(second.c).toBe(first.c);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd server && npx vitest run src/db/__tests__/migrate.test.ts`
Expected: FAIL — таблицы `_migrations` ещё нет.

- [ ] **Step 3: Заменить содержимое `server/src/db/migrate.ts`**

```ts
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export function runMigrations(db: Database.Database): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS _migrations (
       name TEXT PRIMARY KEY,
       applied_at TEXT NOT NULL DEFAULT (datetime('now'))
     )`,
  );

  const appliedRows = db.prepare("SELECT name FROM _migrations").all() as { name: string }[];
  const applied = new Set(appliedRows.map((row) => row.name));

  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    const apply = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
    });
    apply();
  }
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd server && npx vitest run src/db/__tests__/migrate.test.ts`
Expected: PASS (3 теста — два прежних + новый).

- [ ] **Step 5: Commit**

```bash
git add server/src/db/migrate.ts server/src/db/__tests__/migrate.test.ts
git commit -m "Отслеживать применённые миграции для идемпотентности ALTER"
```

---

### Task 2: Миграция 002 (audio_url) + поддержка в репозитории слов

**Files:**
- Create: `server/src/db/migrations/002_add_audio_url.sql`
- Modify: `server/src/words/words.repository.ts`
- Modify (расширить тест): `server/src/words/__tests__/words.repository.test.ts`

- [ ] **Step 1: Создать `server/src/db/migrations/002_add_audio_url.sql`**

```sql
ALTER TABLE words ADD COLUMN audio_url TEXT;
```

- [ ] **Step 2: Дописать тесты в `server/src/words/__tests__/words.repository.test.ts`**

Добавь новый блок (после существующих):

```ts
describe("audio_url", () => {
  it("по умолчанию audio_url = null", () => {
    const word = createWord(db, { deckId, english: "cat", russian: "кот" });
    expect(word.audio_url).toBeNull();
  });

  it("сохраняет переданный audioUrl", () => {
    const word = createWord(db, {
      deckId,
      english: "cat",
      russian: "кот",
      audioUrl: "/uploads/audio/x.mp3",
    });
    expect(word.audio_url).toBe("/uploads/audio/x.mp3");
  });

  it("updateWord обновляет audioUrl", () => {
    const word = createWord(db, { deckId, english: "cat", russian: "кот" });
    const updated = updateWord(db, word.id, { audioUrl: "/uploads/audio/y.mp3" });
    expect(updated?.audio_url).toBe("/uploads/audio/y.mp3");
  });
});
```

- [ ] **Step 3: Запустить тест — убедиться, что падает**

Run: `cd server && npx vitest run src/words/__tests__/words.repository.test.ts`
Expected: FAIL — `audio_url` отсутствует / тип `NewWord` не знает `audioUrl`.

- [ ] **Step 4: Изменить `server/src/words/words.repository.ts`**

В интерфейсе `WordRow` добавить поле (после `image_url`):

```ts
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
```

В интерфейсе `NewWord` добавить (после `imageUrl`):

```ts
  imageUrl?: string | null;
  audioUrl?: string | null;
```

В интерфейсе `WordUpdate` добавить (после `imageUrl`):

```ts
  imageUrl?: string | null;
  audioUrl?: string | null;
```

В `createWord` заменить INSERT, добавив `audio_url`:

```ts
export function createWord(db: Database.Database, word: NewWord): WordRow {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO words (id, deck_id, english, russian, transcription, example_sentence, image_url, audio_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    word.deckId,
    word.english,
    word.russian,
    word.transcription ?? null,
    word.exampleSentence ?? null,
    word.imageUrl ?? null,
    word.audioUrl ?? null,
  );
  return getWord(db, id) as WordRow;
}
```

В `updateWord` добавить ветку для `audioUrl` (после ветки `imageUrl`):

```ts
  if (update.imageUrl !== undefined) {
    fields.push("image_url = ?");
    values.push(update.imageUrl);
  }
  if (update.audioUrl !== undefined) {
    fields.push("audio_url = ?");
    values.push(update.audioUrl);
  }
```

- [ ] **Step 5: Запустить тест — убедиться, что проходит**

Run: `cd server && npx vitest run src/words/__tests__/words.repository.test.ts`
Expected: PASS (9 тестов — 6 прежних + 3 новых).

- [ ] **Step 6: Commit**

```bash
git add server/src/db/migrations/002_add_audio_url.sql server/src/words/words.repository.ts server/src/words/__tests__/words.repository.test.ts
git commit -m "Добавить колонку audio_url и поддержку в репозитории слов"
```

---

### Task 3: Сервис Google TTS

**Files:**
- Create: `server/src/services/googleTts.ts`
- Test: `server/src/services/__tests__/googleTts.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { buildTtsUrl, buildTtsBody, parseTtsAudio, synthesizeMp3 } from "../googleTts.js";

function mockFetch(payload: { ok: boolean; body?: unknown }): typeof fetch {
  return (async () => ({
    ok: payload.ok,
    json: async () => payload.body,
  })) as unknown as typeof fetch;
}

describe("buildTtsUrl", () => {
  it("содержит endpoint синтеза и ключ", () => {
    const url = buildTtsUrl("KEY123");
    expect(url).toContain("https://texttospeech.googleapis.com/v1/text:synthesize");
    expect(url).toContain("key=KEY123");
  });
});

describe("buildTtsBody", () => {
  it("задаёт текст, английский голос и MP3", () => {
    const body = buildTtsBody("cat");
    expect(body.input.text).toBe("cat");
    expect(body.voice.languageCode).toBe("en-US");
    expect(body.audioConfig.audioEncoding).toBe("MP3");
  });
});

describe("parseTtsAudio", () => {
  it("декодирует base64 audioContent в Buffer", () => {
    const b64 = Buffer.from("hi").toString("base64");
    expect(parseTtsAudio({ audioContent: b64 })?.toString()).toBe("hi");
  });

  it("возвращает null при отсутствии audioContent", () => {
    expect(parseTtsAudio({})).toBeNull();
    expect(parseTtsAudio(null)).toBeNull();
  });
});

describe("synthesizeMp3", () => {
  it("возвращает Buffer при успешном ответе", async () => {
    const b64 = Buffer.from("mp3bytes").toString("base64");
    const fetchFn = mockFetch({ ok: true, body: { audioContent: b64 } });
    const result = await synthesizeMp3("cat", "KEY", fetchFn);
    expect(result?.toString()).toBe("mp3bytes");
  });

  it("возвращает null без ключа (fetch не вызывается)", async () => {
    let called = false;
    const fetchFn = (async () => {
      called = true;
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof fetch;
    expect(await synthesizeMp3("cat", "", fetchFn)).toBeNull();
    expect(called).toBe(false);
  });

  it("возвращает null при не-ok ответе", async () => {
    const fetchFn = mockFetch({ ok: false });
    expect(await synthesizeMp3("cat", "KEY", fetchFn)).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd server && npx vitest run src/services/__tests__/googleTts.test.ts`
Expected: FAIL — модуль `googleTts.js` не найден.

- [ ] **Step 3: Реализовать `server/src/services/googleTts.ts`**

```ts
export function buildTtsUrl(apiKey: string): string {
  return `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`;
}

export interface TtsBody {
  input: { text: string };
  voice: { languageCode: string; ssmlGender: string };
  audioConfig: { audioEncoding: string };
}

export function buildTtsBody(text: string): TtsBody {
  return {
    input: { text },
    voice: { languageCode: "en-US", ssmlGender: "NEUTRAL" },
    audioConfig: { audioEncoding: "MP3" },
  };
}

interface TtsResponse {
  audioContent?: string;
}

export function parseTtsAudio(json: unknown): Buffer | null {
  const data = (json ?? {}) as TtsResponse;
  if (typeof data.audioContent !== "string" || data.audioContent.length === 0) {
    return null;
  }
  return Buffer.from(data.audioContent, "base64");
}

export async function synthesizeMp3(
  text: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<Buffer | null> {
  if (!apiKey) {
    return null;
  }
  const response = await fetchFn(buildTtsUrl(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildTtsBody(text)),
  });
  if (!response.ok) {
    return null;
  }
  const json: unknown = await response.json();
  return parseTtsAudio(json);
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd server && npx vitest run src/services/__tests__/googleTts.test.ts`
Expected: PASS (7 тестов).

- [ ] **Step 5: Commit**

```bash
git add server/src/services/googleTts.ts server/src/services/__tests__/googleTts.test.ts
git commit -m "Добавить сервис синтеза речи Google TTS"
```

---

### Task 4: Хранилище аудио-файлов

**Files:**
- Create: `server/src/services/audioStorage.ts`
- Test: `server/src/services/__tests__/audioStorage.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { audioPublicUrl, saveAudioFile, deleteAudioFile } from "../audioStorage.js";

let uploadsDir: string;

beforeEach(() => {
  uploadsDir = mkdtempSync(join(tmpdir(), "wt-audio-"));
});

afterEach(() => {
  rmSync(uploadsDir, { recursive: true, force: true });
});

describe("audioPublicUrl", () => {
  it("строит публичный путь по id слова", () => {
    expect(audioPublicUrl("abc")).toBe("/uploads/audio/abc.mp3");
  });
});

describe("saveAudioFile", () => {
  it("пишет файл в audio/ и возвращает публичный путь", () => {
    const url = saveAudioFile(uploadsDir, "abc", Buffer.from("mp3"));
    expect(url).toBe("/uploads/audio/abc.mp3");
    const file = join(uploadsDir, "audio", "abc.mp3");
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file).toString()).toBe("mp3");
  });
});

describe("deleteAudioFile", () => {
  it("удаляет файл; на отсутствующем не падает", () => {
    saveAudioFile(uploadsDir, "abc", Buffer.from("mp3"));
    deleteAudioFile(uploadsDir, "abc");
    expect(existsSync(join(uploadsDir, "audio", "abc.mp3"))).toBe(false);
    expect(() => deleteAudioFile(uploadsDir, "missing")).not.toThrow();
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd server && npx vitest run src/services/__tests__/audioStorage.test.ts`
Expected: FAIL — модуль `audioStorage.js` не найден.

- [ ] **Step 3: Реализовать `server/src/services/audioStorage.ts`**

```ts
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function audioPublicUrl(wordId: string): string {
  return `/uploads/audio/${wordId}.mp3`;
}

export function saveAudioFile(uploadsDir: string, wordId: string, data: Buffer): string {
  const dir = join(uploadsDir, "audio");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${wordId}.mp3`), data);
  return audioPublicUrl(wordId);
}

export function deleteAudioFile(uploadsDir: string, wordId: string): void {
  const file = join(uploadsDir, "audio", `${wordId}.mp3`);
  if (existsSync(file)) {
    rmSync(file);
  }
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd server && npx vitest run src/services/__tests__/audioStorage.test.ts`
Expected: PASS (4 теста).

- [ ] **Step 5: Commit**

```bash
git add server/src/services/audioStorage.ts server/src/services/__tests__/audioStorage.test.ts
git commit -m "Добавить хранилище аудио-файлов"
```

---

### Task 5: Конфиг (googleTtsApiKey, uploadsDir) + создание папки на старте

**Files:**
- Modify: `server/src/config.ts`
- Modify (расширить тест): `server/src/__tests__/config.test.ts`
- Modify: `server/src/index.ts`
- Modify: `server/.env.example`

- [ ] **Step 1: Дописать тесты в `server/src/__tests__/config.test.ts`**

В первом тесте («читает значения из переданного окружения») добавь в передаваемый объект `GOOGLE_TTS_API_KEY` и `UPLOADS_DIR`, и проверь их:

```ts
    const config = loadConfig({
      APP_PASSWORD: "secret",
      JWT_SECRET: "jwt-secret",
      UNSPLASH_ACCESS_KEY: "unsplash",
      GOOGLE_TTS_API_KEY: "tts-key",
      UPLOADS_DIR: "/data/uploads",
      PORT: "4000",
    });
    expect(config.appPassword).toBe("secret");
    expect(config.jwtSecret).toBe("jwt-secret");
    expect(config.unsplashAccessKey).toBe("unsplash");
    expect(config.googleTtsApiKey).toBe("tts-key");
    expect(config.uploadsDir).toBe("/data/uploads");
    expect(config.port).toBe(4000);
```

И добавь отдельный тест дефолтов:

```ts
  it("использует пустой TTS-ключ и uploads по умолчанию", () => {
    const config = loadConfig({ APP_PASSWORD: "p", JWT_SECRET: "j" });
    expect(config.googleTtsApiKey).toBe("");
    expect(config.uploadsDir).toBe("uploads");
  });
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd server && npx vitest run src/__tests__/config.test.ts`
Expected: FAIL — `googleTtsApiKey` / `uploadsDir` отсутствуют в типе/результате.

- [ ] **Step 3: Изменить `server/src/config.ts`**

В интерфейс `AppConfig` добавить поля:

```ts
export interface AppConfig {
  appPassword: string;
  jwtSecret: string;
  unsplashAccessKey: string;
  googleTtsApiKey: string;
  uploadsDir: string;
  port: number;
}
```

В возвращаемый объект `loadConfig` добавить (после `unsplashAccessKey`):

```ts
    unsplashAccessKey: env.UNSPLASH_ACCESS_KEY ?? "",
    googleTtsApiKey: env.GOOGLE_TTS_API_KEY ?? "",
    uploadsDir: env.UPLOADS_DIR ?? "uploads",
    port: env.PORT ? Number(env.PORT) : 3001,
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd server && npx vitest run src/__tests__/config.test.ts`
Expected: PASS.

- [ ] **Step 5: Обновить `server/src/index.ts` — создавать папку uploads/audio на старте**

Текущий файл:

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

Заменить на (добавлены импорт `node:fs`/`node:path` и создание папки):

```ts
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "./config.js";
import { createConnection } from "./db/connection.js";
import { runMigrations } from "./db/migrate.js";
import { createApp } from "./app.js";

const config = loadConfig(process.env);

mkdirSync(join(config.uploadsDir, "audio"), { recursive: true });

const dbFile = process.env.DB_FILE ?? "data/word-training.sqlite";
const db = createConnection(dbFile);
runMigrations(db);

const app = createApp(config, db);
app.listen(config.port, () => {
  console.log(`Сервер запущен на порту ${config.port}`);
});
```

- [ ] **Step 6: Обновить `server/.env.example`** — добавить строку `GOOGLE_TTS_API_KEY=` после `UNSPLASH_ACCESS_KEY=`:

```
APP_PASSWORD=change-me
JWT_SECRET=change-me-too
UNSPLASH_ACCESS_KEY=
GOOGLE_TTS_API_KEY=
PORT=3001
```

- [ ] **Step 7: Проверить типы**

Run: `cd server && npx tsc --noEmit`
Expected: типов-ошибок нет (хотя `createApp`/`createWordsRouter` ещё со старой сигнатурой — это нормально, они компилируются; полную правку app.ts делает Task 6).

- [ ] **Step 8: Commit**

```bash
git add server/src/config.ts server/src/__tests__/config.test.ts server/src/index.ts server/.env.example
git commit -m "Добавить в конфиг googleTtsApiKey и uploadsDir, создавать папку uploads на старте"
```

---

### Task 6: Генерация озвучки в роуте слов + раздача статики

**Files:**
- Modify: `server/src/words/words.routes.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Заменить содержимое `server/src/words/words.routes.ts`**

```ts
import { Router } from "express";
import type Database from "better-sqlite3";
import { getDeck } from "../decks/decks.repository.js";
import { createWord, getWord, updateWord, deleteWord } from "./words.repository.js";
import { translateToRussian } from "../services/mymemory.js";
import { searchImages } from "../services/unsplash.js";
import { synthesizeMp3 } from "../services/googleTts.js";
import { saveAudioFile, deleteAudioFile } from "../services/audioStorage.js";

const BUILTIN_READONLY = "Встроенная колода доступна только для чтения";

export interface WordsRouterDeps {
  unsplashAccessKey: string;
  googleTtsApiKey: string;
  uploadsDir: string;
}

export function createWordsRouter(db: Database.Database, deps: WordsRouterDeps): Router {
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
      searchImages(english, deps.unsplashAccessKey),
    ]);
    res.json({
      english,
      russian,
      imageUrl: images[0] ?? null,
      imageCandidates: images,
    });
  });

  router.post("/", async (req, res) => {
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

    const word = createWord(db, { deckId, english, russian, imageUrl });

    // Озвучка опциональна: при отсутствии ключа/ошибке слово остаётся без аудио
    let finalWord = word;
    try {
      const mp3 = await synthesizeMp3(english, deps.googleTtsApiKey);
      if (mp3) {
        const audioUrl = saveAudioFile(deps.uploadsDir, word.id, mp3);
        finalWord = updateWord(db, word.id, { audioUrl }) ?? word;
      }
    } catch {
      // молча оставляем слово без озвучки
    }

    res.status(201).json({ word: finalWord });
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
    deleteAudioFile(deps.uploadsDir, req.params.id);
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
      audioUrl: source.audio_url,
    });
    res.status(201).json({ word });
  });

  return router;
}
```

Примечание: при копировании `audio_url` ссылается на исходный файл (общий). Для персонального single-user это допустимо; удаление копии удалит файл `{copyId}.mp3` (которого нет), исходник не затрагивается.

- [ ] **Step 2: Заменить содержимое `server/src/app.ts`**

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

  // Статика озвучки (публично — браузерный <audio> не шлёт заголовок авторизации)
  app.use("/uploads", express.static(config.uploadsDir));

  app.use("/api/auth", createAuthRouter(config));

  const requireAuth = createAuthMiddleware(config.jwtSecret);
  app.use("/api/decks", requireAuth, createDecksRouter(db));
  app.use(
    "/api/words",
    requireAuth,
    createWordsRouter(db, {
      unsplashAccessKey: config.unsplashAccessKey,
      googleTtsApiKey: config.googleTtsApiKey,
      uploadsDir: config.uploadsDir,
    }),
  );
  app.use("/api/unsplash", requireAuth, createUnsplashRouter(config.unsplashAccessKey));

  return app;
}
```

- [ ] **Step 3: Проверить типы и весь тест-сьют**

Run: `cd server && npx tsc --noEmit && npm test`
Expected: типы без ошибок; все тесты PASS.

- [ ] **Step 4: Ручная проверка (без реального ключа TTS)**

Run:
```bash
cd server
mkdir -p data
rm -f data/manual-check.sqlite
rm -rf uploads-manual
DB_FILE=data/manual-check.sqlite UPLOADS_DIR=uploads-manual APP_PASSWORD=hunter2 JWT_SECRET=dev-secret npx tsx src/index.ts &
SERVER_PID=$!
sleep 1

TOKEN=$(curl -s -X POST localhost:3001/api/auth/login -H 'Content-Type: application/json' -d '{"password":"hunter2"}' | sed 's/.*"token":"//;s/".*//')

echo "--- создать колоду ---"
DECK=$(curl -s -X POST localhost:3001/api/decks -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"name":"Колода"}')
DECK_ID=$(echo "$DECK" | sed 's/.*"id":"//;s/".*//')

echo "--- добавить слово (без TTS-ключа → audio_url должен быть null, статус 201) ---"
curl -s -X POST localhost:3001/api/words -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"deckId\":\"$DECK_ID\",\"english\":\"cat\",\"russian\":\"кот\"}"
echo

echo "--- статика отдаётся: кладём тестовый файл и запрашиваем ---"
mkdir -p uploads-manual/audio
echo "fake-mp3" > uploads-manual/audio/test.mp3
curl -s -o /dev/null -w "static %{http_code}\n" localhost:3001/uploads/audio/test.mp3

kill $SERVER_PID
rm -f data/manual-check.sqlite
rm -rf uploads-manual
```
Expected:
- добавление слова → `{"word":{...,"english":"cat","audio_url":null}}` (HTTP 201, озвучка пропущена без ключа)
- статика → `static 200`

- [ ] **Step 5: Commit**

```bash
git add server/src/words/words.routes.ts server/src/app.ts
git commit -m "Генерировать озвучку при создании слова и раздавать статику uploads"
```

---

## Self-Review

**Spec coverage (раздел «Аудио для карточек»):**
- Поле `words.audio_url` — Task 2 ✓
- Сервис Google TTS, формат MP3 — Task 3 ✓ (битрейт не параметризуется в REST; файлы малы)
- Генерация один раз при добавлении слова — Task 6 (`POST /api/words` после вставки) ✓
- Файл в `/uploads/audio/{word_id}.mp3`, путь в `audio_url` — Task 4 + Task 6 ✓
- Раздача статикой — Task 6 (`express.static` на `/uploads`) ✓
- `GOOGLE_TTS_API_KEY` в env — Task 5 ✓
- Fallback: при ошибке/без ключа слово сохраняется без аудио — Task 6 (try/catch, `synthesizeMp3` → null) ✓
- Очистка файла при удалении слова — Task 6 (`deleteAudioFile`) ✓
- Копирование переносит `audio_url` — Task 6 ✓

**Вне scope:** фронтовая кнопка 🔊 и автоплей в Типе 5 (Планы 5-6, фронтенд); генерация аудио для встроенных слов в разовом скрипте (План 7).

**Placeholder scan:** плейсхолдеров нет.

**Type consistency:** `WordRow.audio_url`, `NewWord.audioUrl`, `WordUpdate.audioUrl` согласованы (Task 2) и используются в Task 6 (`source.audio_url`, `updateWord(..., { audioUrl })`). `WordsRouterDeps { unsplashAccessKey, googleTtsApiKey, uploadsDir }` — новая сигнатура `createWordsRouter(db, deps)` согласована с `app.ts` (Task 6). `AppConfig` расширен полями `googleTtsApiKey`, `uploadsDir` (Task 5) и используется в `app.ts`. `synthesizeMp3(text, apiKey, fetchFn?) → Buffer | null`, `saveAudioFile(uploadsDir, wordId, Buffer) → string`, `deleteAudioFile(uploadsDir, wordId) → void` — согласованы между Task 3/4 и Task 6.
