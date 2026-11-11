import { fetchDeckWords } from "../api/decksApi";
import type { Deck } from "../api/types";
import { getStoredUser } from "../auth/token";
import { ensureOfflineShell } from "./shell";
import { getOfflineDeck, offlineKey, saveOfflineDeck, type OfflineDeck } from "./storage";

export async function downloadDeck(deck: Deck, onProgress: (done: number, total: number) => void): Promise<OfflineDeck> {
  const user = getStoredUser();
  if (!user) throw new Error("Сначала войдите в свой профиль.");
  await ensureOfflineShell();
  const words = await fetchDeckWords(deck.id, (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }));
  const urls = [...new Set(words.flatMap(word => [word.image_url, word.audio_url]).filter((url): url is string => Boolean(url)))];
  const cacheName = `wt-media-${user.id}-${deck.id}-${crypto.randomUUID()}`;
  const old = await getOfflineDeck(user.id, deck.id);
  let committed = false;
  let done = 0;
  onProgress(0, urls.length);
  try {
    const cache = await caches.open(cacheName);
    // Sequential writes keep peak memory small on phones and simplify failure cleanup.
    for (const url of urls) {
      const response = await fetch(url, { cache: "reload", signal: AbortSignal.timeout(20000) });
      if (!response.ok || !/^(image|audio)\//i.test(response.headers.get("content-type") ?? "")) {
        throw new Error("Не удалось скачать картинку или аудио. Проверьте соединение и попробуйте снова.");
      }
      await cache.put(url, response);
      onProgress(++done, urls.length);
    }
    if (getStoredUser()?.id !== user.id) throw new Error("Профиль изменился. Повторите скачивание.");
    const record: OfflineDeck = {
      key: offlineKey(user.id, deck.id), userId: user.id,
      deck: { ...deck, total: words.length }, words, cacheName, savedAt: new Date().toISOString(),
    };
    await saveOfflineDeck(record);
    committed = true;
    if (old) await caches.delete(old.cacheName).catch(() => undefined);
    return record;
  } finally {
    if (!committed) await caches.delete(cacheName);
  }
}
