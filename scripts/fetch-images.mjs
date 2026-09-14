/**
 * Загружает ссылки на картинки Unsplash для слов встроенных колод (data/*.json).
 *
 * Идемпотентен: слова с уже заполненным imageUrl пропускаются, файлы
 * сохраняются после каждого найденного слова — скрипт можно прервать
 * и запустить заново.
 *
 * Запуск: UNSPLASH_ACCESS_KEY=... node scripts/fetch-images.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
// ~45 запросов в час при лимите demo-тарифа 50/час
const DELAY_MS = 80_000;
const RATE_LIMIT_PAUSE_MS = 3_600_000;
const RETRY_PAUSE_MS = 60_000;

const accessKey = process.env.UNSPLASH_ACCESS_KEY ?? "";
if (!accessKey) {
  console.error("Не задана переменная окружения UNSPLASH_ACCESS_KEY");
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function loadDecks() {
  return readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => ({
      file,
      deck: JSON.parse(readFileSync(join(DATA_DIR, file), "utf8")),
    }));
}

function saveDeck({ file, deck }) {
  writeFileSync(join(DATA_DIR, file), JSON.stringify(deck, null, 2) + "\n");
}

async function searchImage(query) {
  const params = new URLSearchParams({
    query,
    per_page: "1",
    orientation: "squarish",
    content_filter: "high",
  });
  const response = await fetch(`https://api.unsplash.com/search/photos?${params.toString()}`, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });
  if (response.status === 403) {
    return { rateLimited: true };
  }
  if (!response.ok) {
    return { error: `HTTP ${response.status}` };
  }
  const json = await response.json();
  const url = json.results?.[0]?.urls?.regular;
  return { url: typeof url === "string" ? url : null };
}

const decks = loadDecks();

// поисковый запрос (в нижнем регистре) → записи слова во всех колодах без картинки.
// Для немецких слов используется imageQuery (английское понятие), если задан —
// немецкий текст плохо ищется по смыслу на Unsplash.
const pending = new Map();
for (const entry of decks) {
  for (const word of entry.deck.words) {
    if (typeof word.imageUrl === "string" && word.imageUrl.length > 0) {
      continue;
    }
    const key = (word.imageQuery ?? word.word).trim().toLowerCase();
    if (!pending.has(key)) {
      pending.set(key, []);
    }
    pending.get(key).push({ entry, word });
  }
}

console.log(`Слов без картинки: ${pending.size} (уникальных)`);

let done = 0;
const failed = [];

for (const [queryText, refs] of pending) {
  let result = await searchImage(queryText);
  while (result.rateLimited) {
    console.log(`[${done + 1}/${pending.size}] ${queryText} — лимит запросов, пауза 1 час`);
    await sleep(RATE_LIMIT_PAUSE_MS);
    result = await searchImage(queryText);
  }
  if (result.error) {
    console.log(`[${done + 1}/${pending.size}] ${queryText} — ошибка ${result.error}, повтор через минуту`);
    await sleep(RETRY_PAUSE_MS);
    result = await searchImage(queryText);
  }

  done += 1;
  if (result.url) {
    const touched = new Set();
    for (const { entry, word } of refs) {
      word.imageUrl = result.url;
      touched.add(entry);
    }
    for (const entry of touched) {
      saveDeck(entry);
    }
    console.log(`[${done}/${pending.size}] ${queryText} — ok`);
  } else {
    failed.push(queryText);
    console.log(`[${done}/${pending.size}] ${queryText} — картинка не найдена (${result.error ?? "пустой результат"})`);
  }

  if (done < pending.size) {
    await sleep(DELAY_MS);
  }
}

console.log(`Готово: ${done - failed.length} с картинками, без картинок: ${failed.length}`);
if (failed.length > 0) {
  console.log(`Не нашлись: ${failed.join(", ")}`);
}
