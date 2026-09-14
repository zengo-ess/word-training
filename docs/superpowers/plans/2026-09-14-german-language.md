# Изучение немецкого языка — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** добавить немецкий как второй язык изучения, переключаемый глобально в профиле, с полным набором из 9 встроенных немецких колод.

**Architecture:** миграция БД переименовывает колонки `words` и добавляет `language` в `decks`/`users`; сервер фильтрует колоды и генерирует TTS/перевод по языку колоды/пользователя; клиент переименовывает поля вслед за API и добавляет переключатель языка в профиле.

**Tech Stack:** Express + better-sqlite3 (сервер), React + Vite + Vitest (клиент), TypeScript везде.

Спека: `docs/superpowers/specs/2026-09-14-german-language-design.md`.

---

## Task 1: Миграция БД

**Files:**
- Create: `server/src/db/migrations/005_add_language.sql`
- Modify: `server/src/db/__tests__/migrate.test.ts` (если там есть проверка списка миграций — свериться, иначе не трогать)

- [ ] **Шаг 1.** Написать миграцию:

```sql
ALTER TABLE words RENAME COLUMN english TO foreign_word;
ALTER TABLE words RENAME COLUMN russian TO native_word;

ALTER TABLE decks ADD COLUMN language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'de'));
ALTER TABLE users ADD COLUMN language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'de'));
```

- [ ] **Шаг 2.** Прогнать миграции на чистой временной БД, убедиться, что применяется без ошибок:

```bash
cd server && npx tsx -e "
import { createConnection } from './src/db/connection.ts';
import { runMigrations } from './src/db/migrate.ts';
const db = createConnection(':memory:');
runMigrations(db);
console.log(db.prepare('PRAGMA table_info(words)').all());
console.log(db.prepare('PRAGMA table_info(decks)').all());
console.log(db.prepare('PRAGMA table_info(users)').all());
"
```

Ожидается: `words` содержит `foreign_word`/`native_word`, `decks` и `users` — колонку `language`.

- [ ] **Шаг 3.** Коммит:

```bash
git add server/src/db/migrations/005_add_language.sql
git commit -m "Миграция: language у decks/users, переименование колонок words"
```

---

## Task 2: Слой репозиториев — words, decks, users

**Files:**
- Modify: `server/src/words/words.repository.ts`
- Modify: `server/src/decks/decks.repository.ts`
- Modify: `server/src/decks/deckStats.repository.ts`
- Modify: `server/src/training/training.repository.ts`
- Modify: `server/src/auth/users.repository.ts`
- Test: `server/src/words/__tests__/words.repository.test.ts`
- Test: `server/src/decks/__tests__/decks.repository.test.ts`
- Test: `server/src/decks/__tests__/deckStats.repository.test.ts`
- Test: `server/src/training/__tests__/training.repository.test.ts`
- Test: `server/src/auth/__tests__/users.repository.test.ts`

- [ ] **Шаг 1.** В существующих тестах репозиториев переименовать поля `english`/`russian` → `foreignWord`/`nativeWord` (в вызовах фабрик и в ассертах на `.english`/`.russian` → `.foreign_word`/`.native_word`). Прогнать — должны падать (реализация ещё не переименована).

```bash
cd server && npx vitest run src/words/__tests__/words.repository.test.ts src/decks/__tests__ src/training/__tests__/training.repository.test.ts
```

Ожидается: FAIL (свойства не совпадают).

- [ ] **Шаг 2.** `words.repository.ts` — переименовать в интерфейсах и SQL:

```typescript
export interface WordRow {
  id: string;
  deck_id: string;
  foreign_word: string;
  native_word: string;
  transcription: string | null;
  example_sentence: string | null;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
}

export interface NewWord {
  deckId: string;
  foreignWord: string;
  nativeWord: string;
  transcription?: string | null;
  exampleSentence?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
}

export interface WordUpdate {
  foreignWord?: string;
  nativeWord?: string;
  transcription?: string | null;
  exampleSentence?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
}
```

`createWord`: `INSERT INTO words (id, deck_id, foreign_word, native_word, transcription, example_sentence, image_url, audio_url) VALUES (...)`, значения `word.foreignWord, word.nativeWord`.

`updateWord`: блоки `if (update.foreignWord !== undefined) { fields.push("foreign_word = ?"); values.push(update.foreignWord); }` и аналогично `nativeWord → native_word`.

- [ ] **Шаг 3.** `decks.repository.ts` — добавить `language` в `DeckRow`, `listDecks`, `createDeck`:

```typescript
export interface DeckRow {
  id: string;
  name: string;
  is_builtin: number;
  user_id: string | null;
  language: string;
  created_at: string;
}

export function listDecks(db: Database.Database, userId: string, language: string): DeckRow[] {
  return db
    .prepare(
      "SELECT * FROM decks WHERE (is_builtin = 1 OR user_id = ?) AND language = ? ORDER BY is_builtin DESC, created_at ASC",
    )
    .all(userId, language) as DeckRow[];
}

export function createDeck(
  db: Database.Database,
  name: string,
  userId: string,
  language: string,
): DeckRow {
  const id = randomUUID();
  db.prepare(
    "INSERT INTO decks (id, name, is_builtin, user_id, language) VALUES (?, ?, 0, ?, ?)",
  ).run(id, name, userId, language);
  return getDeck(db, id) as DeckRow;
}
```

(`getDeck`, `canAccessDeck` не меняются.)

- [ ] **Шаг 4.** `deckStats.repository.ts` — добавить `language` в `DeckWithStats`, фильтр по языку в `listDecksWithStats` (сигнатура получает `language: string`), переименовать `w.english`/`w.russian` в SQL на `w.foreign_word`/`w.native_word` там, где встречается (в `listWordsWithProgress` через `w.*` переименований не требуется — поля уже придут переименованными из таблицы).

```typescript
export interface DeckWithStats {
  id: string;
  name: string;
  is_builtin: number;
  language: string;
  created_at: string;
  total: number;
  learned: number;
}

export function listDecksWithStats(
  db: Database.Database,
  userId: string,
  language: string,
): DeckWithStats[] {
  return db
    .prepare(
      `SELECT d.id, d.name, d.is_builtin, d.language, d.created_at,
         (SELECT COUNT(*) FROM words w WHERE w.deck_id = d.id) AS total,
         (SELECT COUNT(*) FROM words w
            JOIN progress p ON p.word_id = w.id AND p.user_id = ?
            WHERE w.deck_id = d.id AND p.learned_at IS NOT NULL) AS learned
       FROM decks d
       WHERE (d.is_builtin = 1 OR d.user_id = ?) AND d.language = ?
       ORDER BY d.is_builtin DESC, d.created_at ASC`,
    )
    .all(userId, userId, language) as DeckWithStats[];
}
```

- [ ] **Шаг 5.** `training.repository.ts` — переименовать `DueRow`/`LearnableRow` использование полей: `w.english, w.russian` → `w.foreign_word, w.native_word` в SQL, и в маппинге объектов `english: r.english` → `foreign_word: r.foreign_word` (и `native_word`). Поле `DueRow.english`/`russian` → `foreign_word`/`native_word`.

- [ ] **Шаг 6.** `users.repository.ts` — добавить `language` в `UserRow` и `PublicUser`, и функцию обновления:

```typescript
export interface UserRow {
  id: string;
  name: string;
  password_hash: string;
  language: string;
  created_at: string;
}

export interface PublicUser {
  id: string;
  name: string;
  language: string;
}

export function listUsers(db: Database.Database): PublicUser[] {
  return db.prepare("SELECT id, name, language FROM users ORDER BY created_at ASC").all() as PublicUser[];
}

export function updateUserLanguage(
  db: Database.Database,
  id: string,
  language: string,
): UserRow | undefined {
  db.prepare("UPDATE users SET language = ? WHERE id = ?").run(language, id);
  return getUser(db, id);
}
```

- [ ] **Шаг 7.** Прогнать тесты репозиториев снова, добиться PASS:

```bash
cd server && npx vitest run src/words/__tests__/words.repository.test.ts src/decks/__tests__ src/training/__tests__/training.repository.test.ts src/auth/__tests__/users.repository.test.ts
```

- [ ] **Шаг 8.** Коммит:

```bash
git add server/src/words/words.repository.ts server/src/decks/decks.repository.ts server/src/decks/deckStats.repository.ts server/src/training/training.repository.ts server/src/auth/users.repository.ts server/src/words/__tests__ server/src/decks/__tests__ server/src/training/__tests__/training.repository.test.ts server/src/auth/__tests__/users.repository.test.ts
git commit -m "Репозитории: foreign_word/native_word, фильтр колод по language"
```

---

## Task 3: TTS и перевод по языку

**Files:**
- Modify: `server/src/services/googleTts.ts`
- Modify: `server/src/services/mymemory.ts`
- Test: `server/src/services/__tests__/googleTts.test.ts`
- Test: `server/src/services/__tests__/mymemory.test.ts`

- [ ] **Шаг 1.** Обновить тесты: `buildTtsBody` теперь принимает `languageCode`, `buildTranslateUrl`/`translateToRussian` — `sourceLang`. Прогнать → FAIL.

- [ ] **Шаг 2.** `googleTts.ts`:

```typescript
export function buildTtsBody(text: string, languageCode: string): TtsBody {
  return {
    input: { text },
    voice: { languageCode, ssmlGender: "NEUTRAL" },
    audioConfig: { audioEncoding: "MP3" },
  };
}

export async function synthesizeMp3(
  text: string,
  languageCode: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<Buffer | null> {
  if (!apiKey) {
    return null;
  }
  const response = await fetchFn(buildTtsUrl(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildTtsBody(text, languageCode)),
  });
  if (!response.ok) {
    return null;
  }
  const json: unknown = await response.json();
  return parseTtsAudio(json);
}
```

- [ ] **Шаг 3.** `mymemory.ts`:

```typescript
export function buildTranslateUrl(text: string, sourceLang: string): string {
  const params = new URLSearchParams({ q: text, langpair: `${sourceLang}|ru` });
  return `https://api.mymemory.translated.net/get?${params.toString()}`;
}

export async function translateToRussian(
  text: string,
  sourceLang: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchFn(buildTranslateUrl(text, sourceLang));
  if (!response.ok) {
    return "";
  }
  const json: unknown = await response.json();
  return parseTranslation(json);
}
```

- [ ] **Шаг 4.** Прогнать тесты → PASS.

- [ ] **Шаг 5.** Коммит:

```bash
git add server/src/services/googleTts.ts server/src/services/mymemory.ts server/src/services/__tests__/googleTts.test.ts server/src/services/__tests__/mymemory.test.ts
git commit -m "TTS и перевод: языковой код и langpair параметризованы"
```

---

## Task 4: Роуты — decks, words, auth

**Files:**
- Modify: `server/src/decks/decks.routes.ts`
- Modify: `server/src/words/words.routes.ts`
- Modify: `server/src/auth/auth.routes.ts`
- Test: файлы роутов покрыты интеграционно через `app.test.ts`/аналог, если есть — проверить `server/src/__tests__`; если прямых тестов роутов нет, тесты не создаём (юнит-покрытие уже есть на уровне репозиториев/сервисов)

- [ ] **Шаг 1.** Добавить маппинг кодов языка в `words.routes.ts` (в начале файла):

```typescript
const TTS_LANGUAGE_CODE: Record<string, string> = { en: "en-US", de: "de-DE" };
```

- [ ] **Шаг 2.** `decks.routes.ts` — прокинуть язык пользователя:

```typescript
import { getUser } from "../auth/users.repository.js";
```

```typescript
router.get("/", (req: AuthedRequest, res) => {
  const userId = req.userId as string;
  const user = getUser(db, userId);
  res.json({ decks: listDecksWithStats(db, userId, user?.language ?? "en") });
});

router.post("/", (req: AuthedRequest, res) => {
  const userId = req.userId as string;
  const user = getUser(db, userId);
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    res.status(400).json({ error: "Не указано название колоды" });
    return;
  }
  res.status(201).json({ deck: createDeck(db, name, userId, user?.language ?? "en") });
});
```

- [ ] **Шаг 3.** `words.routes.ts` — переименовать поля запроса/ответа и передать язык в TTS/перевод. `/lookup` получает язык из body (клиент передаёт язык колоды, в которую добавляет слово — см. Task 6) либо из деки, если `deckId` передан; для простоты берём язык из тела запроса `language` (клиент явно укажет активный язык профиля):

```typescript
router.post("/lookup", async (req, res) => {
  const foreignWord = typeof req.body?.foreignWord === "string" ? req.body.foreignWord.trim() : "";
  const language = typeof req.body?.language === "string" ? req.body.language : "en";
  if (!foreignWord) {
    res.status(400).json({ error: "Не указано слово" });
    return;
  }
  const [nativeWord, images] = await Promise.all([
    translateToRussian(foreignWord, language),
    searchImages(foreignWord, deps.unsplashAccessKey),
  ]);
  res.json({
    foreignWord,
    nativeWord,
    imageUrl: images[0] ?? null,
    imageCandidates: images,
  });
});
```

`POST /` (создание слова): переименовать `english`/`russian` → `foreignWord`/`nativeWord` в чтении `body`, в вызове `createWord(db, { deckId, foreignWord, nativeWord, imageUrl })`, и в TTS-вызове взять язык колоды:

```typescript
const mp3 = await synthesizeMp3(
  foreignWord,
  TTS_LANGUAGE_CODE[deck.language] ?? "en-US",
  deps.googleTtsApiKey,
);
```

`PUT /:id`: переименовать поля тела запроса на `foreignWord`/`nativeWord`, передавать в `updateWord`.

`POST /:id/copy`: `source.english`/`source.russian` → `source.foreign_word`/`source.native_word`, `createWord({..., foreignWord: source.foreign_word, nativeWord: source.native_word, ...})`.

- [ ] **Шаг 4.** `auth.routes.ts` — добавить эндпоинт смены языка и вернуть `language` в ответах login/register/users:

```typescript
router.get("/users", (_req, res) => {
  res.json({ users: listUsers(db) });
});
```
(уже вернёт `language`, т.к. `listUsers` теперь его селектит — правка не нужна, только у `register`/`login` добавить поле в объект `user`)

```typescript
res.status(201).json({
  token: signToken(user.id, config.jwtSecret),
  user: { id: user.id, name: user.name, language: user.language },
});
```
(аналогично в `/login`)

Новый роут (требует auth-middleware — подключается в `app.ts`, см. Task 5):

```typescript
router.patch("/me/language", (req: AuthedRequest, res) => {
  const userId = req.userId as string;
  const language = typeof req.body?.language === "string" ? req.body.language : "";
  if (language !== "en" && language !== "de") {
    res.status(400).json({ error: "Недопустимый язык" });
    return;
  }
  const user = updateUserLanguage(db, userId, language);
  res.json({ user: { id: user!.id, name: user!.name, language: user!.language } });
});
```

- [ ] **Шаг 5.** Прогнать полный серверный тест-сьют, типы, линт:

```bash
cd server && npm run typecheck && npm run lint && npm test
```

Ожидается: FAIL там, где ещё не поправлены зависимые тесты (`words.routes` использует поля напрямую — тестов роутов нет по grep, но проверить).

- [ ] **Шаг 6.** Поправить всё, что упадёт (скорее всего только типы в `app.ts`, если там роутер собирается с явными типами — свериться). Добиться PASS по всем трём командам.

- [ ] **Шаг 7.** Коммит:

```bash
git add server/src/decks/decks.routes.ts server/src/words/words.routes.ts server/src/auth/auth.routes.ts
git commit -m "Роуты: язык колоды/пользователя в decks, words, auth/me/language"
```

---

## Task 5: Auth middleware — подключение нового роута

**Files:**
- Modify: `server/src/app.ts`

- [ ] **Шаг 1.** Открыть `server/src/app.ts`, найти, где монтируется `createAuthRouter` — убедиться, что `/api/auth/me/language` пройдёт через `createAuthMiddleware` (публичные `/users`, `/register`, `/login` — без миддлвари, остальное — с). Если auth-роутер сейчас монтируется целиком без миддлвари (вероятно, так и есть, раз внутри него есть публичные пути), обернуть новый под-роут отдельно:

```typescript
app.use("/api/auth", authRouter);
app.patch("/api/auth/me/language", authMiddleware, /* handler вынесен либо роут добавлен через router.patch с middleware inline */);
```

Практически: раз `createAuthRouter` не принимает middleware как параметр, проще всего внутри `auth.routes.ts` применить middleware точечно к одному роуту:

```typescript
import { createAuthMiddleware } from "./auth.middleware.js";
```

и при регистрации роута передать `config`/`db` в `createAuthRouter`, чтобы создать `authMiddleware` внутри:

```typescript
export function createAuthRouter(config: AppConfig, db: Database.Database): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(config.jwtSecret, db);
  // ...существующие публичные роуты...
  router.patch("/me/language", authMiddleware, (req: AuthedRequest, res) => { /* см. Task 4 шаг 4 */ });
  return router;
}
```

- [ ] **Шаг 2.** Прогнать `npm run typecheck` и `npm test` в `server` — PASS.

- [ ] **Шаг 3.** Коммит:

```bash
git add server/src/app.ts server/src/auth/auth.routes.ts
git commit -m "auth: защитить PATCH /me/language миддлварой авторизации"
```

---

## Task 6: seedBuiltins — язык колоды и переименование поля слова

**Files:**
- Modify: `server/src/db/seedBuiltins.ts`
- Test: `server/src/db/__tests__/seedBuiltins.test.ts`

- [ ] **Шаг 1.** Обновить тест: фикстуры JSON теперь имеют `word` вместо `english`, опционально `language`. Прогнать → FAIL.

- [ ] **Шаг 2.** Переписать `seedBuiltins.ts`:

```typescript
interface SeedWord {
  word: string;
  russian: string;
  transcription: string;
  example: string;
  imageUrl?: string;
}

interface SeedDeck {
  name: string;
  language?: "en" | "de";
  words: SeedWord[];
}

export function seedBuiltins(db: Database.Database, dataDir: string): void {
  if (!existsSync(dataDir)) {
    return;
  }

  const files = readdirSync(dataDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const deckExists = db.prepare("SELECT id FROM decks WHERE name = ?");
  const insertDeck = db.prepare(
    "INSERT INTO decks (id, name, is_builtin, language) VALUES (?, ?, 1, ?)",
  );
  const insertWord = db.prepare(
    `INSERT INTO words (id, deck_id, foreign_word, native_word, transcription, example_sentence, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const backfillImage = db.prepare(
    "UPDATE words SET image_url = ? WHERE deck_id = ? AND foreign_word = ? AND image_url IS NULL",
  );

  const seedDeck = db.transaction((deck: SeedDeck) => {
    const deckId = randomUUID();
    insertDeck.run(deckId, deck.name, deck.language ?? "en");
    for (const word of deck.words) {
      insertWord.run(
        randomUUID(),
        deckId,
        word.word,
        word.russian,
        word.transcription,
        word.example,
        word.imageUrl ?? null,
      );
    }
  });

  const backfillDeck = db.transaction((deckId: string, deck: SeedDeck) => {
    for (const word of deck.words) {
      if (word.imageUrl) {
        backfillImage.run(word.imageUrl, deckId, word.word);
      }
    }
  });

  for (const file of files) {
    const deck = JSON.parse(readFileSync(join(dataDir, file), "utf8")) as SeedDeck;
    const existing = deckExists.get(deck.name) as { id: string } | undefined;
    if (existing) {
      backfillDeck(existing.id, deck);
      continue;
    }
    seedDeck(deck);
  }
}
```

- [ ] **Шаг 3.** Прогнать тест → PASS.

- [ ] **Шаг 4.** Коммит:

```bash
git add server/src/db/seedBuiltins.ts server/src/db/__tests__/seedBuiltins.test.ts
git commit -m "seedBuiltins: язык колоды, поле слова word вместо english"
```

---

## Task 7: Переименовать поле в существующих 9 английских JSON-колодах

**Files:**
- Modify: `data/01-top-200.json` … `data/09-numbers-time.json` (9 файлов)

- [ ] **Шаг 1.** Механически переименовать ключ `"english"` → `"word"` во всех 9 файлах (ключ встречается только как имя поля слова, значения не трогаем):

```bash
cd /Users/zengo/Projects/other/word-training/data
for f in 0*.json; do
  sed -i '' 's/"english":/"word":/' "$f"
done
```

- [ ] **Шаг 2.** Проверить, что JSON валиден и ключ действительно переименован:

```bash
node -e "
const fs = require('fs');
for (const f of fs.readdirSync('.').filter(f => f.startsWith('0') && f.endsWith('.json'))) {
  const deck = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!deck.words.every(w => typeof w.word === 'string')) throw new Error(f + ' broken');
}
console.log('ok');
"
```

- [ ] **Шаг 3.** Прогнать серверные тесты сидинга ещё раз (реальные файлы `data/`, не фикстуры) — опционально прогнать `npm run dev` локально не нужно, достаточно unit-теста seedBuiltins с реальным dataDir не делаем (вне scope теста). Коммит:

```bash
cd /Users/zengo/Projects/other/word-training
git add data/
git commit -m "Данные: переименовать поле english → word в встроенных колодах"
```

---

## Task 8: Клиентские типы и API

**Files:**
- Modify: `client/src/api/types.ts`
- Modify: `client/src/api/wordsApi.ts`
- Modify: `client/src/api/decksApi.ts`
- Modify: `client/src/auth/authApi.ts`
- Modify: `client/src/auth/token.ts`
- Test: `client/src/api/__tests__/wordsApi.test.ts`
- Test: `client/src/api/__tests__/decksApi.test.ts`
- Test: `client/src/auth/__tests__/authApi.test.ts`

- [ ] **Шаг 1.** Обновить тесты под новые имена полей/параметры (`foreign_word`/`native_word`, `language` у `Deck`/`User`). Прогнать → FAIL.

- [ ] **Шаг 2.** `types.ts`:

```typescript
export interface Deck {
  id: string;
  name: string;
  is_builtin: number;
  language: string;
  created_at: string;
  total: number;
  learned: number;
}

export interface Word {
  id: string;
  deck_id: string;
  foreign_word: string;
  native_word: string;
  transcription: string | null;
  example_sentence: string | null;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
}
```
(остальное без изменений)

- [ ] **Шаг 3.** `wordsApi.ts`:

```typescript
export interface WordDraft {
  foreignWord: string;
  nativeWord: string;
  imageUrl: string | null;
  imageCandidates: string[];
}

export async function lookupWord(
  foreignWord: string,
  language: string,
  fetchFn: typeof fetch = fetch,
): Promise<WordDraft> {
  return apiRequest<WordDraft>(
    "/api/words/lookup",
    { method: "POST", body: { foreignWord, language }, token: getToken() },
    fetchFn,
  );
}

export interface NewWordInput {
  deckId: string;
  foreignWord: string;
  nativeWord: string;
  imageUrl: string | null;
}

export async function createWord(input: NewWordInput, fetchFn: typeof fetch = fetch): Promise<Word> {
  const data = await apiRequest<{ word: Word }>(
    "/api/words",
    { method: "POST", body: input, token: getToken() },
    fetchFn,
  );
  return data.word;
}
```
(`searchImages` не меняется)

- [ ] **Шаг 4.** `decksApi.ts` — без изменений сигнатур (язык сервер берёт из профиля сам), только типы подтянутся из `types.ts`.

- [ ] **Шаг 5.** `authApi.ts`/`token.ts` — добавить `language` в `AuthUser`/`StoredUser`, и функцию смены языка:

```typescript
// authApi.ts
export interface AuthUser {
  id: string;
  name: string;
  language: string;
}

export async function setLanguage(
  language: string,
  fetchFn: typeof fetch = fetch,
): Promise<AuthUser> {
  const data = await apiRequest<{ user: AuthUser }>(
    "/api/auth/me/language",
    { method: "PATCH", body: { language }, token: getToken() },
    fetchFn,
  );
  return data.user;
}
```

```typescript
// token.ts
export interface StoredUser {
  id: string;
  name: string;
  language: string;
}
```

- [ ] **Шаг 6.** Проверить `apiRequest` в `http.ts` поддерживает метод `PATCH` (посмотреть сигнатуру — если ограничена списком методов, добавить `"PATCH"`).

- [ ] **Шаг 7.** Прогнать тесты → PASS:

```bash
cd client && npx vitest run src/api/__tests__ src/auth/__tests__/authApi.test.ts
```

- [ ] **Шаг 8.** Коммит:

```bash
git add client/src/api client/src/auth/authApi.ts client/src/auth/token.ts
git commit -m "Клиент: типы и API под foreign_word/native_word и language"
```

---

## Task 9: AuthContext — язык профиля

**Files:**
- Modify: `client/src/auth/AuthContext.tsx`
- Test: `client/src/auth/__tests__/AuthContext.test.tsx`

- [ ] **Шаг 1.** Обновить тест: добавить кейс "setLanguage обновляет user.language и localStorage". Прогнать → FAIL.

- [ ] **Шаг 2.** Реализовать:

```typescript
import { login as loginApi, register as registerApi, setLanguage as setLanguageApi } from "./authApi";
```

```typescript
interface AuthValue {
  isAuthenticated: boolean;
  user: StoredUser | null;
  login: (userId: string, password: string) => Promise<void>;
  register: (name: string, password: string, familyCode: string) => Promise<void>;
  setLanguage: (language: string) => Promise<void>;
  logout: () => void;
}
```

```typescript
const setLanguage = async (language: string): Promise<void> => {
  const updated = await setLanguageApi(language);
  saveStoredUser(updated);
  setUser(updated);
};
```

Добавить `setLanguage` в объект `value` провайдера.

- [ ] **Шаг 3.** Прогнать тест → PASS.

- [ ] **Шаг 4.** Коммит:

```bash
git add client/src/auth/AuthContext.tsx client/src/auth/__tests__/AuthContext.test.tsx
git commit -m "AuthContext: setLanguage для переключения языка изучения"
```

---

## Task 10: Экраны — переименование полей слова

**Files:**
- Modify: `client/src/lib/wordVisual.ts`
- Modify: `client/src/screens/trainer/trainerLogic.ts`
- Modify: `client/src/screens/WordSheet.tsx`
- Modify: `client/src/screens/DeckDetailScreen.tsx`
- Modify: `client/src/screens/TrainerScreen.tsx`
- Test: соответствующие файлы в `__tests__` для каждого из вышеперечисленных

- [ ] **Шаг 1.** В тестах этих файлов переименовать `word.english`/`word.russian` (и фабрики тестовых слов) на `word.foreign_word`/`word.native_word`. Прогнать → FAIL.

- [ ] **Шаг 2.** `wordVisual.ts`:

```typescript
export function playWord(word: { foreign_word: string; audio_url: string | null }): void {
  if (word.audio_url) {
    void new Audio(word.audio_url).play().catch(() => undefined);
    return;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(word.foreign_word);
    utt.lang = "en-US";
    utt.rate = 0.9;
    window.speechSynthesis.speak(utt);
  }
}
```

(озвучка через Web Speech API остаётся `en-US` — синтез немецкой речи через браузерный SpeechSynthesis вне scope, для немецких слов без `audio_url` голос будет читать текст английским движком; это ограничение фиксируем как есть, ключевая озвучка идёт через Google TTS при создании слова)

- [ ] **Шаг 3.** `trainerLogic.ts`:

```typescript
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
```

- [ ] **Шаг 4.** `WordSheet.tsx`, `DeckDetailScreen.tsx`, `TrainerScreen.tsx` — механическая замена всех `word.english` → `word.foreign_word`, `word.russian` → `word.native_word` (по местам, найденным ранее через grep: `WordSheet.tsx:14,33,38,44`; `DeckDetailScreen.tsx:35,39,46`; `TrainerScreen.tsx:76,270,298,344,389,392,489,495,525,545`).

- [ ] **Шаг 5.** Прогнать тесты и typecheck:

```bash
cd client && npx vitest run src/lib/__tests__ src/screens/trainer/__tests__ src/screens/__tests__/WordSheet.test.tsx src/screens/__tests__/DeckDetailScreen.test.tsx src/screens/__tests__/TrainerScreen.test.tsx
npm run typecheck
```

- [ ] **Шаг 6.** Коммит:

```bash
git add client/src/lib/wordVisual.ts client/src/screens/trainer/trainerLogic.ts client/src/screens/WordSheet.tsx client/src/screens/DeckDetailScreen.tsx client/src/screens/TrainerScreen.tsx client/src/lib/__tests__ client/src/screens/trainer/__tests__ client/src/screens/__tests__/WordSheet.test.tsx client/src/screens/__tests__/DeckDetailScreen.test.tsx client/src/screens/__tests__/TrainerScreen.test.tsx
git commit -m "Клиент: переименование word.english/russian → foreign_word/native_word"
```

---

## Task 11: AddWordScreen — динамические подписи и язык при создании

**Files:**
- Modify: `client/src/screens/AddWordScreen.tsx`
- Test: `client/src/screens/__tests__/AddWordScreen.test.tsx`

- [ ] **Шаг 1.** Обновить тест: рендерить `AddWordScreen` внутри `AuthContext` с `user.language = 'de'`, проверить, что заголовок поля — «Немецкое слово», а `lookupWord`/`createWord` вызываются с `foreignWord`/`nativeWord`. Прогнать → FAIL.

- [ ] **Шаг 2.** В `AddWordScreen.tsx`:

```typescript
import { useAuth } from "../auth/AuthContext";

const LANGUAGE_LABEL: Record<string, string> = { en: "Английское", de: "Немецкое" };
```

```typescript
export function AddWordScreen({ deckId, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const language = user?.language ?? "en";
  const [foreignWord, setForeignWord] = useState("");
  const [nativeWord, setNativeWord] = useState("");
  // ... остальные состояния без изменений (imageUrl, candidates, imageQuery, stage, busy, error)

  const onLookup = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const word = foreignWord.trim();
    if (word.length === 0) return;
    setStage("loading");
    setError("");
    try {
      const draft = await lookupWord(word, language);
      setNativeWord(draft.nativeWord);
      setImageUrl(draft.imageUrl);
      setCandidates(draft.imageCandidates);
      setImageQuery(word);
      setStage("ready");
    } catch {
      setError("Не удалось получить данные слова");
      setStage("input");
    }
  };

  // onSearchImages без изменений

  const onSave = async (): Promise<void> => {
    setBusy(true);
    setError("");
    try {
      await createWord({ deckId, foreignWord: foreignWord.trim(), nativeWord: nativeWord.trim(), imageUrl });
      onSaved();
    } catch {
      setError("Не удалось сохранить слово");
      setBusy(false);
    }
  };

  // ...
  <label style={LABEL}>{LANGUAGE_LABEL[language]} слово</label>
  <form onSubmit={(e) => void onLookup(e)} ...>
    <input
      aria-label={`${LANGUAGE_LABEL[language]} слово`}
      value={foreignWord}
      onChange={(e) => {
        setForeignWord(e.target.value);
        setStage("input");
      }}
      placeholder={language === "de" ? "Traum" : "dream"}
      ...
    />
```

Везде далее по файлу заменить `english`→`foreignWord`, `russian`→`nativeWord`, `setEnglish`→`setForeignWord`, `setRussian`→`setNativeWord` (переменные состояния).

- [ ] **Шаг 3.** Прогнать тест и typecheck → PASS.

- [ ] **Шаг 4.** Коммит:

```bash
git add client/src/screens/AddWordScreen.tsx client/src/screens/__tests__/AddWordScreen.test.tsx
git commit -m "AddWordScreen: подпись и язык слова зависят от профиля"
```

---

## Task 12: ProfileScreen — переключатель языка

**Files:**
- Modify: `client/src/screens/ProfileScreen.tsx`
- Test: `client/src/screens/__tests__/ProfileScreen.test.tsx`

- [ ] **Шаг 1.** Обновить тест: добавить кейс — рендер строки «Язык изучения» с текущим значением («Английский»/«Немецкий»), клик открывает выбор из двух вариантов, выбор вызывает `setLanguage` из `useAuth`. Прогнать → FAIL.

- [ ] **Шаг 2.** Реализовать простое переключение без модалки — клик по строке переключает язык на противоположный (EN↔DE), это достаточно для двух языков и не требует нового UI-компонента выбора:

```typescript
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
// ...существующие импорты

const LANGUAGE_NAME: Record<string, string> = { en: "Английский", de: "Немецкий" };

export function ProfileScreen() {
  const { logout, user, setLanguage } = useAuth();
  const [switching, setSwitching] = useState(false);
  const language = user?.language ?? "en";

  const onToggleLanguage = async (): Promise<void> => {
    setSwitching(true);
    try {
      await setLanguage(language === "en" ? "de" : "en");
    } finally {
      setSwitching(false);
    }
  };

  const settingsRows = [
    { icon: "target", label: "Дневная цель", detail: "20 слов" },
    { icon: "globe", label: "Язык изучения", detail: LANGUAGE_NAME[language], onClick: () => void onToggleLanguage() },
    { icon: "volume-2", label: "Озвучка слов", detail: "Вкл" },
    { icon: "refresh", label: "Направление повторов", detail: "Оба" },
    { icon: "calendar", label: "Напоминания", detail: "20:00" },
  ] as const;

  // ...в рендере строк:
  {settingsRows.map((r, i) => (
    <div
      key={r.label}
      onClick={"onClick" in r ? r.onClick : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "13px 12px",
        borderBottom: i < settingsRows.length - 1 ? "1px solid var(--line)" : "none",
        cursor: "onClick" in r ? "pointer" : "default",
      }}
    >
      <Icon name={r.icon} size={20} color="var(--ink-soft)" stroke={2.2} />
      <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{r.label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-mute)" }}>
        {switching && r.label === "Язык изучения" ? "…" : r.detail}
      </span>
      <Icon name="chevron-right" size={17} color="var(--ink-mute)" stroke={2.4} />
    </div>
  ))}
}
```

Проверить, что `Icon` поддерживает имя `"globe"` (посмотреть `client/src/components/Icon.tsx` — список доступных имён; если `globe` нет, взять ближайшее существующее, например `"refresh"` не подойдёт по смыслу — свериться со списком и выбрать подходящее, например `"map"` или `"star"`, если `globe` отсутствует).

- [ ] **Шаг 3.** Прогнать тест и typecheck → PASS.

- [ ] **Шаг 4.** Коммит:

```bash
git add client/src/screens/ProfileScreen.tsx client/src/screens/__tests__/ProfileScreen.test.tsx
git commit -m "ProfileScreen: рабочий переключатель языка изучения EN/DE"
```

---

## Task 13: fetch-images.mjs — imageQuery и поле word

**Files:**
- Modify: `scripts/fetch-images.mjs`

- [ ] **Шаг 1.** Заменить `word.english` на `word.word`, добавить приоритет `imageQuery`:

```javascript
const key = (word.imageQuery ?? word.word).trim().toLowerCase();
```

и далее в цикле поиска использовать этот `key` как есть (переименовать переменную `english` → `queryText` по месту использования в `for (const [english, refs] of pending)` → `for (const [queryText, refs] of pending)`, и все обращения `english` в логах/вызове `searchImage(english)` → `queryText`).

- [ ] **Шаг 2.** Убедиться скрипт по-прежнему проходит `node --check`:

```bash
node --check scripts/fetch-images.mjs
```

- [ ] **Шаг 3.** Коммит:

```bash
git add scripts/fetch-images.mjs
git commit -m "fetch-images: поле word, приоритет imageQuery для поиска картинки"
```

---

## Task 14: Контент — 9 немецких колод

**Files:**
- Create: `data/de-01-top-200.json`
- Create: `data/de-02-verbs-100.json`
- Create: `data/de-03-nouns-100.json`
- Create: `data/de-04-adjectives-100.json`
- Create: `data/de-05-food.json`
- Create: `data/de-06-travel.json`
- Create: `data/de-07-work.json`
- Create: `data/de-08-emotions.json`
- Create: `data/de-09-numbers-time.json`

- [ ] **Шаг 1.** Для каждого файла — структура:

```json
{
  "name": "<название колоды, зеркалит английскую, например «Топ-100 немецких слов»>",
  "language": "de",
  "words": [
    {
      "word": "<немецкое слово, с артиклем для существительных: der/die/das>",
      "russian": "<перевод>",
      "transcription": "/IPA/",
      "example": "<немецкое предложение с ___ вместо слова>",
      "imageUrl": null,
      "imageQuery": "<английское понятие для поиска картинки, напр. 'time'>"
    }
  ]
}
```

Категории и примерный объём (зеркалят английские файлы 1:1 по названию и количеству слов):
- `de-01-top-200.json` — «Топ-100 частых немецких слов» (~100 слов: время, дни, базовая лексика — аналог `01-top-200.json`)
- `de-02-verbs-100.json` — «Глаголы» (~100)
- `de-03-nouns-100.json` — «Существительные» (~100)
- `de-04-adjectives-100.json` — «Прилагательные» (~100)
- `de-05-food.json` — «Еда» (~40-60, по объёму `05-food.json`)
- `de-06-travel.json` — «Путешествия»
- `de-07-work.json` — «Работа»
- `de-08-emotions.json` — «Эмоции»
- `de-09-numbers-time.json` — «Числа и время»

Каждое слово — реальная немецкая лексика с точным переводом и грамматически корректным примером (пропуск `___` заменяет ровно словоформу из поля `word`, как в английских колодах). Транскрипция — IPA немецкого произношения.

- [ ] **Шаг 2.** Проверить валидность JSON всех 9 файлов:

```bash
cd /Users/zengo/Projects/other/word-training/data
for f in de-*.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('$f ok')"; done
```

- [ ] **Шаг 3.** Прогнать реальный сидинг на временной БД, убедиться, что немецкие колоды создаются с `language = 'de'` и словами:

```bash
cd server && DB_FILE=:memory: npx tsx -e "
import { createConnection } from './src/db/connection.ts';
import { runMigrations } from './src/db/migrate.ts';
import { seedBuiltins } from './src/db/seedBuiltins.ts';
const db = createConnection(':memory:');
runMigrations(db);
seedBuiltins(db, '../data');
console.log(db.prepare('SELECT name, language, (SELECT COUNT(*) FROM words WHERE deck_id = decks.id) as cnt FROM decks').all());
"
```

Ожидается: 9 строк с `language: 'en'` (старые) + 9 строк с `language: 'de'`, у каждой `cnt > 0`.

- [ ] **Шаг 4.** Коммит:

```bash
cd /Users/zengo/Projects/other/word-training
git add data/de-*.json
git commit -m "Данные: 9 встроенных немецких колод"
```

---

## Task 15: Финальная проверка и пуш

**Files:** нет новых — сквозная проверка.

- [ ] **Шаг 1.** Полный прогон на сервере:

```bash
cd server && npm run typecheck && npm run lint && npm test
```

- [ ] **Шаг 2.** Полный прогон на клиенте:

```bash
cd client && npm run typecheck && npm run lint --if-present && npm test && npm run build
```

(если в `client/package.json` нет скрипта `lint` — пропустить, зафиксировать в отчёте)

- [ ] **Шаг 3.** Ручная проверка через дев-сервер: поднять `server`+`client` (`npm run dev` в обоих), в браузере — зайти под тестовым пользователем, переключить язык в профиле на немецкий, убедиться что список колод сменился на немецкие, открыть колоду, пройти тренировку 1-2 слова, вернуть язык обратно на английский, убедиться что английские колоды снова видны и прогресс не потерян.

- [ ] **Шаг 4.** `git push`.

- [ ] **Шаг 5.** Сообщить пользователю, что реализация готова и запушена, кратко перечислить, что сделано, и что дальше — прогон `fetch-images.mjs` для картинок немецких слов (ручной шаг, требует `UNSPLASH_ACCESS_KEY`) и деплой.
