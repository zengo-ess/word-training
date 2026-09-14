import { apiRequest } from "./http";
import { getToken } from "../auth/token";
import type { Word } from "./types";

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

export async function searchImages(query: string, fetchFn: typeof fetch = fetch): Promise<string[]> {
  const data = await apiRequest<{ images: string[] }>(
    `/api/unsplash/search?q=${encodeURIComponent(query)}`,
    { token: getToken() },
    fetchFn,
  );
  return data.images;
}
