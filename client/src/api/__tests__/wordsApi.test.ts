/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import { lookupWord, createWord, searchImages, uploadImage, deleteWord, updateWord } from "../wordsApi";

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
  it("lookupWord постит слово и язык, возвращает черновик", async () => {
    const captured: { value?: Captured } = {};
    const draft = await lookupWord(
      "apple",
      "en",
      mockFetch({ foreignWord: "apple", nativeWord: "яблоко", imageUrl: "u", imageCandidates: ["u"] }, captured),
    );
    expect(draft.nativeWord).toBe("яблоко");
    expect(captured.value?.url).toBe("/api/words/lookup");
    expect(captured.value?.init.body).toBe(JSON.stringify({ foreignWord: "apple", language: "en" }));
  });

  it("createWord постит слово и возвращает его", async () => {
    const word = await createWord(
      { deckId: "d1", foreignWord: "apple", nativeWord: "яблоко", imageUrl: null },
      mockFetch({ word: { id: "w1", deck_id: "d1", foreign_word: "apple", native_word: "яблоко" } }),
    );
    expect(word.id).toBe("w1");
  });

  it("searchImages кодирует запрос и возвращает ссылки", async () => {
    const captured: { value?: Captured } = {};
    const images = await searchImages("red apple", mockFetch({ images: ["a", "b"] }, captured));
    expect(images).toEqual(["a", "b"]);
    expect(captured.value?.url).toContain("/api/unsplash/search?q=red%20apple");
  });

  it("uploadImage шлёт файл как тело запроса с его mime-типом и токеном", async () => {
    const captured: { value?: Captured } = {};
    const file = new File(["bytes"], "photo.png", { type: "image/png" });
    const url = await uploadImage(file, mockFetch({ imageUrl: "/uploads/images/x.png" }, captured));
    expect(url).toBe("/uploads/images/x.png");
    expect(captured.value?.url).toBe("/api/words/upload-image");
    expect(captured.value?.init.method).toBe("POST");
    expect(captured.value?.init.body).toBe(file);
    expect((captured.value?.init.headers as Record<string, string>)["Content-Type"]).toBe("image/png");
    expect((captured.value?.init.headers as Record<string, string>).Authorization).toBe("Bearer T");
  });

  it("updateWord шлёт PUT с изменёнными полями", async () => {
    const captured: { value?: Captured } = {};
    const word = await updateWord(
      "w1",
      { foreignWord: "apple", nativeWord: "яблочко", imageUrl: null, transcription: "/ˈæpəl/" },
      mockFetch({ word: { id: "w1", deck_id: "d1", foreign_word: "apple", native_word: "яблочко" } }, captured),
    );
    expect(word.native_word).toBe("яблочко");
    expect(captured.value?.url).toBe("/api/words/w1");
    expect(captured.value?.init.method).toBe("PUT");
    expect(captured.value?.init.body).toBe(
      JSON.stringify({ foreignWord: "apple", nativeWord: "яблочко", imageUrl: null, transcription: "/ˈæpəl/" }),
    );
  });

  it("deleteWord шлёт DELETE с токеном на нужный адрес", async () => {
    const captured: { value?: Captured } = {};
    const fetchFn = (async (url: string, init: RequestInit) => {
      captured.value = { url, init };
      return { ok: true, status: 204, json: async () => ({}) };
    }) as unknown as typeof fetch;
    await deleteWord("w1", fetchFn);
    expect(captured.value?.url).toBe("/api/words/w1");
    expect(captured.value?.init.method).toBe("DELETE");
    expect((captured.value?.init.headers as Record<string, string>).Authorization).toBe("Bearer T");
  });

  it("uploadImage бросает ошибку при неуспешном ответе", async () => {
    const file = new File(["bytes"], "photo.pdf", { type: "application/pdf" });
    const failingFetch = (async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: "Поддерживаются только JPEG, PNG и WebP" }),
    })) as unknown as typeof fetch;
    await expect(uploadImage(file, failingFetch)).rejects.toThrow("Поддерживаются только JPEG, PNG и WebP");
  });
});
