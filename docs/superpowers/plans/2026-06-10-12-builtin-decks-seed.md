# Builtin Decks: Data & Seeder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Наполнить приложение встроенными колодами из спеки (~700 слов): топ-100 глаголов, топ-100 существительных, топ-100 прилагательных, топ-200 частых слов, тематические (еда, путешествия, работа, эмоции, числа и время). Данные пишутся вручную (LLM-авторинг в сессии, без Anthropic API), сидер заливает их в SQLite на старте сервера.

**Architecture:** JSON-файлы в `/data` (корень репо) с числовыми префиксами для порядка. `server/src/db/seedBuiltins.ts` — идемпотентный сидер: на старте читает все `*.json`, пропускает колоды, чьё имя уже есть в БД, остальные вставляет с `is_builtin = 1`. Вызов из `index.ts` после миграций. `audio_url`/`image_url` остаются NULL (озвучка — Web Speech fallback на фронте; TTS добавится при появлении ключа).

**Tech Stack:** Node.js + better-sqlite3, vitest.

---

## Формат данных

```json
{
  "name": "Топ-100 глаголов",
  "words": [
    {
      "english": "be",
      "russian": "быть",
      "transcription": "/biː/",
      "example": "I want to ___ a doctor when I grow up."
    }
  ]
}
```

Требования к слову:
- `example` ОБЯЗАТЕЛЬНО содержит ровно один `___` (упражнение «вставь пропуск»), слово в пропуске — в базовой форме `english`
- `russian` — один основной перевод (без списков через запятую)
- `transcription` — IPA в слешах
- Внутри колоды `english` не повторяются

## Файлы данных

```
data/
  01-top-200.json        # Топ-200 самых частых слов — 200 слов
  02-verbs-100.json      # Топ-100 глаголов — 100 слов
  03-nouns-100.json      # Топ-100 существительных — 100 слов
  04-adjectives-100.json # Топ-100 прилагательных — 100 слов
  05-food.json           # Еда — 40 слов
  06-travel.json         # Путешествия — 40 слов
  07-work.json           # Работа — 40 слов
  08-emotions.json       # Эмоции — 40 слов
  09-numbers-time.json   # Числа и время — 40 слов
```

Имена колод: «Топ-200 частых слов», «Топ-100 глаголов», «Топ-100 существительных», «Топ-100 прилагательных», «Еда», «Путешествия», «Работа», «Эмоции», «Числа и время».

---

### Task 1: Сидер (TDD)

**Files:**
- Create: `server/src/db/seedBuiltins.ts`
- Test: `server/src/db/__tests__/seedBuiltins.test.ts`
- Modify: `server/src/index.ts` (вызов после `runMigrations`)

Тест: временная директория с одним JSON (2 слова) → `seedBuiltins(db, dir)` → колода с `is_builtin=1` и 2 слова в БД; повторный вызов не дублирует. Реализация: `readdirSync(dir).filter(.json).sort()`, для каждой: `SELECT id FROM decks WHERE name = ?` → если есть, skip; иначе INSERT deck (`is_builtin=1`) + INSERT words в транзакции.

В `index.ts`: `seedBuiltins(db, process.env.DATA_DIR ?? "../data")` — путь относительно cwd сервера (server/), т.е. `../data` = корень репо.

Commit: `Добавить сидер встроенных колод`

### Task 2: Топ-200 частых слов

Создать `data/01-top-200.json` — 200 самых частотных английских слов уровня A1–A2 (существительные, глаголы, прилагательные, наречия — без артиклей/предлогов/местоимений, т.к. для них нет осмысленных карточек). Commit: `Добавить колоду Топ-200 частых слов`

### Task 3: Топ-100 глаголов

`data/02-verbs-100.json` — 100 самых частых глаголов. Commit: `Добавить колоду Топ-100 глаголов`

### Task 4: Топ-100 существительных

`data/03-nouns-100.json`. Commit: `Добавить колоду Топ-100 существительных`

### Task 5: Топ-100 прилагательных

`data/04-adjectives-100.json`. Commit: `Добавить колоду Топ-100 прилагательных`

### Task 6: Тематические колоды (5 файлов по 40 слов)

`data/05-food.json`, `06-travel.json`, `07-work.json`, `08-emotions.json`, `09-numbers-time.json`. Commit: `Добавить тематические колоды`

### Task 7: Прогон и проверка

- Валидация всех JSON скриптом (уникальность english, наличие `___`, поля)
- Рестарт сервера → сидер заливает колоды
- Проверка через API: `GET /api/decks` → 9 встроенных колод с корректными счётчиками
- Проверка в браузере: вкладка «Колоды» — секция «Встроенные колоды»
- Commit финальный (если были правки)

---

## Self-Review

- Все колоды из спеки покрыты ✓ (Oxford-3000-подобный топ-200, 3 части речи, 5 тем)
- Идемпотентность сидера ✓ (по имени колоды)
- Тип 3 работает для встроенных слов ✓ (у всех есть example с `___`)
- Без внешних API ✓
