import { apiRequest } from "./http";
import { getToken } from "../auth/token";
import type { Deck, WordWithProgress } from "./types";

export async function fetchDecks(fetchFn: typeof fetch = fetch): Promise<Deck[]> {
  const data = await apiRequest<{ decks: Deck[] }>("/api/decks", { token: getToken() }, fetchFn);
  return data.decks;
}

export async function createDeck(name: string, fetchFn: typeof fetch = fetch): Promise<Deck> {
  const data = await apiRequest<{ deck: Deck }>(
    "/api/decks",
    { method: "POST", body: { name }, token: getToken() },
    fetchFn,
  );
  return data.deck;
}

export async function fetchDeckWords(deckId: string, fetchFn: typeof fetch = fetch): Promise<WordWithProgress[]> {
  const data = await apiRequest<{ words: WordWithProgress[] }>(
    `/api/decks/${deckId}/words`,
    { token: getToken() },
    fetchFn,
  );
  return data.words;
}
