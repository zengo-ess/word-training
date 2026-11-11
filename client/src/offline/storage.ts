import type { Deck, WordWithProgress } from "../api/types";

export interface OfflineDeck {
  key: string;
  userId: string;
  deck: Deck;
  words: WordWithProgress[];
  cacheName: string;
  savedAt: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("wt-offline", 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore("decks", { keyPath: "key" });
      store.createIndex("userId", "userId");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function query<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("decks", mode);
    const request = action(tx.objectStore("decks"));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error ?? new Error("Не удалось сохранить колоду на устройстве.")); };
  });
}

export const offlineKey = (userId: string, deckId: string): string => `${userId}:${deckId}`;
export const getOfflineDeck = (userId: string, deckId: string): Promise<OfflineDeck | undefined> =>
  query("readonly", store => store.get(offlineKey(userId, deckId)));
export const listOfflineDecks = (userId: string): Promise<OfflineDeck[]> =>
  query("readonly", store => store.index("userId").getAll(userId));
export const saveOfflineDeck = (record: OfflineDeck): Promise<IDBValidKey> =>
  query("readwrite", store => store.put(record));

export async function removeOfflineDeck(userId: string, deckId: string): Promise<void> {
  const record = await getOfflineDeck(userId, deckId);
  await query("readwrite", store => store.delete(offlineKey(userId, deckId)));
  if (record) await caches.delete(record.cacheName);
}

export async function clearOfflineUser(userId: string): Promise<void> {
  const records = await listOfflineDecks(userId);
  await Promise.all(records.map(record => removeOfflineDeck(userId, record.deck.id)));
}
