import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { downloadDeck } from "../download";
import * as storage from "../storage";
import { saveStoredUser, withSettingsDefaults } from "../../auth/token";
import { fetchDeckWords } from "../../api/decksApi";
import { deck, word, memoryCaches } from "./helpers";

vi.mock("../shell", () => ({ ensureOfflineShell: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../api/decksApi", () => ({ fetchDeckWords: vi.fn() }));
let cachesFake: ReturnType<typeof memoryCaches>;
beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  cachesFake = memoryCaches();
  vi.stubGlobal("caches", cachesFake);
  localStorage.clear();
  saveStoredUser(withSettingsDefaults({ id: "sasha", name: "Саша" }));
  vi.mocked(fetchDeckWords).mockResolvedValue([word]);
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response("media", {
    headers: { "content-type": url.endsWith(".mp3") ? "audio/mpeg" : "image/webp" },
  })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("скачивание колоды", () => {
  it("сохраняет полный снимок и все медиа, не отправляя прогресс", async () => {
    const progress = vi.fn();
    const record = await downloadDeck(deck, progress);
    expect(await storage.getOfflineDeck("sasha", deck.id)).toEqual(record);
    expect(cachesFake.maps.get(record.cacheName)?.size).toBe(2);
    expect(progress).toHaveBeenLastCalledWith(2, 2);
    expect(vi.mocked(fetch).mock.calls.map(call => call[0])).toEqual([word.image_url, word.audio_url]);
    expect(await storage.listOfflineDecks("other-user")).toEqual([]);
  });

  it("при обрыве загрузки сохраняет предыдущую версию и удаляет частичный кэш", async () => {
    const old = await downloadDeck(deck, vi.fn());
    vi.mocked(fetch).mockResolvedValueOnce(new Response("image", { headers: { "content-type": "image/webp" } }))
      .mockRejectedValueOnce(new TypeError("offline"));
    await expect(downloadDeck(deck, vi.fn())).rejects.toThrow("offline");
    expect(await storage.getOfflineDeck("sasha", deck.id)).toEqual(old);
    expect(await cachesFake.keys()).toEqual([old.cacheName]);
  });

  it("не выдаёт ошибочный HTML вместо картинки за готовую загрузку", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("login page", { headers: { "content-type": "text/html" } }));
    await expect(downloadDeck(deck, vi.fn())).rejects.toThrow("картинку");
    expect(await storage.listOfflineDecks("sasha")).toEqual([]);
    expect(await cachesFake.keys()).toEqual([]);
  });

  it("при нехватке места сохраняет предыдущую версию", async () => {
    const old = await downloadDeck(deck, vi.fn());
    vi.spyOn(storage, "saveOfflineDeck").mockRejectedValueOnce(new DOMException("full", "QuotaExceededError"));
    await expect(downloadDeck(deck, vi.fn())).rejects.toThrow("full");
    expect(await storage.getOfflineDeck("sasha", deck.id)).toEqual(old);
    expect(await cachesFake.keys()).toEqual([old.cacheName]);
  });

  it("успешное обновление убирает старый кэш", async () => {
    const old = await downloadDeck(deck, vi.fn());
    const fresh = await downloadDeck(deck, vi.fn());
    expect(fresh.cacheName).not.toBe(old.cacheName);
    expect(await cachesFake.keys()).toEqual([fresh.cacheName]);
  });

  it("смена профиля во время скачивания отменяет сохранение", async () => {
    vi.mocked(fetch).mockImplementation(async () => {
      localStorage.clear();
      return new Response("image", { headers: { "content-type": "image/webp" } });
    });
    await expect(downloadDeck(deck, vi.fn())).rejects.toThrow("Профиль изменился");
    expect(await storage.listOfflineDecks("sasha")).toEqual([]);
    expect(await cachesFake.keys()).toEqual([]);
  });

  it("выход удаляет только данные текущего профиля", async () => {
    await downloadDeck(deck, vi.fn());
    saveStoredUser(withSettingsDefaults({ id: "other-user", name: "Другой" }));
    const other = await downloadDeck(deck, vi.fn());
    await storage.clearOfflineUser("sasha");
    expect(await storage.listOfflineDecks("sasha")).toEqual([]);
    expect(await storage.listOfflineDecks("other-user")).toEqual([other]);
    expect(await cachesFake.keys()).toEqual([other.cacheName]);
  });
});
