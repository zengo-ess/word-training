import { describe, it, expect } from "vitest";
import { buildDictionaryUrl, fetchTranscription } from "../dictionary.js";

describe("buildDictionaryUrl", () => {
  it("строит URL к бесплатному словарю для английского", () => {
    expect(buildDictionaryUrl("dream", "en")).toBe("https://api.dictionaryapi.dev/api/v2/entries/en/dream");
  });

  it("строит URL к бесплатному словарю для немецкого", () => {
    expect(buildDictionaryUrl("Zeit", "de")).toBe("https://api.dictionaryapi.dev/api/v2/entries/de/Zeit");
  });
});

describe("fetchTranscription", () => {
  it("возвращает phonetic из первой подходящей записи", async () => {
    const fetchFn = (async () =>
      new Response(
        JSON.stringify([{ phonetic: "", phonetics: [{ text: "" }, { text: "/driːm/" }] }]),
        { status: 200 },
      )) as unknown as typeof fetch;
    expect(await fetchTranscription("dream", "en", fetchFn)).toBe("/driːm/");
  });

  it("предпочитает верхнеуровневое поле phonetic", async () => {
    const fetchFn = (async () =>
      new Response(JSON.stringify([{ phonetic: "/kæt/" }]), { status: 200 })) as unknown as typeof fetch;
    expect(await fetchTranscription("cat", "en", fetchFn)).toBe("/kæt/");
  });

  it("возвращает null при ошибке ответа", async () => {
    const fetchFn = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    expect(await fetchTranscription("zzz", "en", fetchFn)).toBeNull();
  });

  it("возвращает null при сетевой ошибке", async () => {
    const fetchFn = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    expect(await fetchTranscription("dream", "en", fetchFn)).toBeNull();
  });

  it("возвращает null, если ни в одной записи нет phonetic", async () => {
    const fetchFn = (async () =>
      new Response(JSON.stringify([{ phonetics: [{}] }]), { status: 200 })) as unknown as typeof fetch;
    expect(await fetchTranscription("word", "en", fetchFn)).toBeNull();
  });

  it("для немецкого отбрасывает артикль перед запросом к словарю", async () => {
    let requestedUrl = "";
    const fetchFn = (async (url: string) => {
      requestedUrl = url;
      return new Response(JSON.stringify([{ phonetic: "/tsaɪ̯t/" }]), { status: 200 });
    }) as unknown as typeof fetch;
    expect(await fetchTranscription("die Zeit", "de", fetchFn)).toBe("/tsaɪ̯t/");
    expect(requestedUrl).toBe("https://api.dictionaryapi.dev/api/v2/entries/de/Zeit");
  });

  it("возвращает null для неподдерживаемого языка, не делая запрос", async () => {
    const fetchFn = (async () => {
      throw new Error("не должен вызываться");
    }) as unknown as typeof fetch;
    expect(await fetchTranscription("word", "fr", fetchFn)).toBeNull();
  });
});
