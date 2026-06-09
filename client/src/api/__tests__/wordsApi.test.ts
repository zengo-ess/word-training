/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import { lookupWord, createWord, searchImages } from "../wordsApi";

interface Captured {
  url: string;
  init: RequestInit;
}

function mockFetch(body: unknown, captured?: { value?: Captured }): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    if (captured) captured.value = { url, init };
    return { ok: true, status: 200, json: async () => body };
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("wt_token", "T");
});

describe("wordsApi", () => {
  it("lookupWord постит слово и возвращает черновик", async () => {
    const captured: { value?: Captured } = {};
    const draft = await lookupWord(
      "apple",
      mockFetch({ english: "apple", russian: "яблоко", imageUrl: "u", imageCandidates: ["u"] }, captured),
    );
    expect(draft.russian).toBe("яблоко");
    expect(captured.value?.url).toBe("/api/words/lookup");
    expect(captured.value?.init.body).toBe(JSON.stringify({ english: "apple" }));
  });

  it("createWord постит слово и возвращает его", async () => {
    const word = await createWord(
      { deckId: "d1", english: "apple", russian: "яблоко", imageUrl: null },
      mockFetch({ word: { id: "w1", deck_id: "d1", english: "apple", russian: "яблоко" } }),
    );
    expect(word.id).toBe("w1");
  });

  it("searchImages кодирует запрос и возвращает ссылки", async () => {
    const captured: { value?: Captured } = {};
    const images = await searchImages("red apple", mockFetch({ images: ["a", "b"] }, captured));
    expect(images).toEqual(["a", "b"]);
    expect(captured.value?.url).toContain("/api/unsplash/search?q=red%20apple");
  });
});
