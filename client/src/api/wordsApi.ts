import { apiRequest } from "./http";
import { getToken } from "../auth/token";
import type { Word } from "./types";

export interface WordDraft {
  foreignWord: string;
  nativeWord: string;
  imageUrl: string | null;
  imageCandidates: string[];
  transcription: string | null;
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
  transcription?: string | null;
}

export async function createWord(input: NewWordInput, fetchFn: typeof fetch = fetch): Promise<Word> {
  const data = await apiRequest<{ word: Word }>(
    "/api/words",
    { method: "POST", body: input, token: getToken() },
    fetchFn,
  );
  return data.word;
}

export async function deleteWord(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
  await apiRequest<void>(`/api/words/${id}`, { method: "DELETE", token: getToken() }, fetchFn);
}

export async function searchImages(query: string, fetchFn: typeof fetch = fetch): Promise<string[]> {
  const data = await apiRequest<{ images: string[] }>(
    `/api/unsplash/search?q=${encodeURIComponent(query)}`,
    { token: getToken() },
    fetchFn,
  );
  return data.images;
}

// Тело запроса — сырые байты файла, не JSON, поэтому apiRequest не подходит
export async function uploadImage(file: File, fetchFn: typeof fetch = fetch): Promise<string> {
  const response = await fetchFn("/api/words/upload-image", {
    method: "POST",
    headers: {
      "Content-Type": file.type,
      Authorization: `Bearer ${getToken() ?? ""}`,
    },
    body: file,
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Не удалось загрузить картинку");
  }
  const data = (await response.json()) as { imageUrl: string };
  return data.imageUrl;
}
