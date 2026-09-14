import { describe, it, expect } from "vitest";
import { buildDictionaryUrl, fetchEnglishTranscription } from "../dictionary.js";

describe("buildDictionaryUrl", () => {
  it("строит URL к бесплатному словарю", () => {
    expect(buildDictionaryUrl("dream")).toBe("https://api.dictionaryapi.dev/api/v2/entries/en/dream");
  });
});

describe("fetchEnglishTranscription", () => {
  it("возвращает phonetic из первой подходящей записи", async () => {
    const fetchFn = (async () =>
      new Response(
        JSON.stringify([{ phonetic: "", phonetics: [{ text: "" }, { text: "/driːm/" }] }]),
        { status: 200 },
      )) as unknown as typeof fetch;
    expect(await fetchEnglishTranscription("dream", fetchFn)).toBe("/driːm/");
  });

  it("предпочитает верхнеуровневое поле phonetic", async () => {
    const fetchFn = (async () =>
      new Response(JSON.stringify([{ phonetic: "/kæt/" }]), { status: 200 })) as unknown as typeof fetch;
    expect(await fetchEnglishTranscription("cat", fetchFn)).toBe("/kæt/");
  });

  it("возвращает null при ошибке ответа", async () => {
    const fetchFn = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    expect(await fetchEnglishTranscription("zzz", fetchFn)).toBeNull();
  });

  it("возвращает null при сетевой ошибке", async () => {
    const fetchFn = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    expect(await fetchEnglishTranscription("dream", fetchFn)).toBeNull();
  });

  it("возвращает null, если ни в одной записи нет phonetic", async () => {
    const fetchFn = (async () =>
      new Response(JSON.stringify([{ phonetics: [{}] }]), { status: 200 })) as unknown as typeof fetch;
    expect(await fetchEnglishTranscription("word", fetchFn)).toBeNull();
  });
});
