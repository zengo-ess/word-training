# Изучение немецкого языка — дизайн

**Дата:** 2026-09-14
**Статус:** утверждён

## Суть

Немецкий как второй язык наравне с английским. Переключается глобально в профиле пользователя (один активный язык изучения за раз, без смешивания прогресса). Встроенные колоды получают полный набор из 9 немецких колод по аналогии с английскими.

## Модель данных

```
users + language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','de'))
decks + language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','de'))
words: english → foreign_word, russian → native_word   -- переименование колонок
```

- `users.language` — активный язык изучения пользователя (глобальный переключатель).
- `decks.language` — язык слов в колоде. У встроенных колод проставляется при сидинге; у пользовательских — фиксируется языком профиля в момент создания колоды.
- `progress`, `study_days` не меняются — они привязаны к `word_id`/`user_id`, язык слова уже определён его колодой.
- Миграция `005_add_language.sql`: `ALTER TABLE ... RENAME COLUMN` для `words`, `ADD COLUMN language ... DEFAULT 'en'` для `decks`/`users`. Существующие данные — всё английское, дефолт `'en'` корректен, бэкфилл не нужен.

## Сервер

- `decks.repository.listDecks(db, userId, language)` — фильтр: `(is_builtin = 1 AND language = ?) OR (user_id = ? AND language = ?)`.
- `decks.repository.createDeck(db, name, userId, language)` — язык берётся из `users.language` на момент создания в роуте.
- `words.repository` / `words.routes`: поля `english`/`russian` → `foreignWord`/`nativeWord` по всей цепочке (create/update/copy/lookup).
- `services/mymemory.ts`: `translateToRussian(text, sourceLang, fetchFn)` → `langpair: ${sourceLang}|ru`.
- `services/googleTts.ts`: `synthesizeMp3(text, languageCode, apiKey, fetchFn)`; маппинг языка колоды на код Google TTS: `en → en-US`, `de → de-DE` (константа в `words.routes.ts`).
- `auth.routes.ts`: новый `PATCH /api/auth/me/language` — `{ language: 'en'|'de' }` → обновляет `users.language`, возвращает обновлённого пользователя. Невалидное значение → 400.
- `auth.service.ts`/`users.repository.ts`: `updateUserLanguage(db, userId, language)`.
- `seedBuiltins.ts`: JSON-файл колоды получает top-level `"language": "en" | "de"` (у существующих английских файлов по умолчанию `'en'`, если поле отсутствует — обратная совместимость не требует правки старых 9 файлов). Поле слова `english` → `word` (универсальное имя во всех seed-файлах, включая английские — правится один раз).

## Контент — 9 немецких колод

Новые файлы `data/de-01-top-200.json` … `data/de-09-numbers-time.json`, зеркалят категории английских (топ-100 частых слов, глаголы, существительные, прилагательные, еда, путешествия, работа, эмоции, числа/время). Формат слова:

```json
{ "word": "...", "russian": "...", "transcription": "/IPA/", "example": "... ___ ...", "imageUrl": null, "imageQuery": "английское понятие для поиска картинки" }
```

- Переводы/транскрипции (IPA)/примеры составляются вручную по аналогии с английскими колодами.
- `imageQuery` — опционально, используется скриптом поиска картинок вместо немецкого слова (немецкий плохо ищется по смыслу на Unsplash).
- `scripts/fetch-images.mjs` дорабатывается: ключ поиска — `imageQuery ?? word`.
- Картинки на этом проходе не скачиваем (нет доступа к Unsplash API в изоляции задачи) — слова сидируются с `imageUrl: null`, `image_url` в БД остаётся `NULL` до отдельного прогона `fetch-images.mjs` (как было и для английских колод — см. историю коммитов «Картинки для встроенных колод»).

## Клиент

- `api/types.ts`: `Word.foreign_word`/`native_word` (было `english`/`russian`), `Deck.language`, `User.language`.
- `auth/AuthContext.tsx`: пробрасывает `language` пользователя, добавляет `setLanguage(lang)` (вызывает API, обновляет контекст).
- `ProfileScreen.tsx`: строка настроек «Язык изучения» становится рабочей (остальные строки — статичные заглушки, не трогаем). Тап → переключатель EN/DE → `PATCH /me/language` → обновление контекста. Список колод на Home/DecksTab подтягивается заново (уже отфильтрован сервером).
- `AddWordScreen.tsx`, `WordTile.tsx`, `TrainerScreen.tsx`, `ReviewScreen.tsx`, `WordSheet.tsx`, `DeckDetailScreen.tsx`, `screens/trainer/trainerLogic.ts`: переименование полей вслед за API; подписи вида «Английское слово» → динамические по `user.language` («Английское слово» / «Немецкое слово»).
- Тесты во всех переименованных файлах правятся вслед (основной объём изменений по числу файлов, без изменения логики тестов).

## Тесты

- `seedBuiltins`: сидирует колоду с `language: 'de'`, ставит корректный `decks.language`.
- `decks.repository`: `listDecks` возвращает только колоды текущего языка (builtin + свои).
- `mymemory`/`googleTts`: langpair/languageCode меняются по параметру языка.
- `auth`: `PATCH /me/language` — валидный/невалидный язык, обновление контекста.
- Существующие тесты на `words`/`decks`/экраны — переименовать поля, логика та же.

## Вне scope

- Раздельная статистика/прогресс по языкам в профиле — не делаем.
- Смешивание языков внутри одной колоды, направление перевода native→foreign — не делаем.
- Скачивание картинок для немецких колод — отдельный ручной прогон `fetch-images.mjs` после мержа (как это было сделано для английских колод).
