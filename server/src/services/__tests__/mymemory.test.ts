/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import {
  buildTranslateUrl,
  parseTranslation,
  translateToRussian,
} from "../mymemory.js";

function mockFetch(payload: { ok: boolean; body?: unknown }): typeof fetch {
  return (async () => ({
    ok: payload.ok,
    json: async () => payload.body,
  })) as unknown as typeof fetch;
}

describe("buildTranslateUrl", () => {
  it("строит URL с langpair en|ru и закодированным словом", () => {
    const url = buildTranslateUrl("good morning", "en");
    expect(url).toContain("https://api.mymemory.translated.net/get?");
    expect(url).toContain("q=good+morning");
    expect(url).toContain("langpair=en%7Cru");
  });

  it("строит langpair для немецкого", () => {
    const url = buildTranslateUrl("Morgen", "de");
    expect(url).toContain("langpair=de%7Cru");
  });
});

describe("parseTranslation", () => {
  it("извлекает translatedText", () => {
    expect(parseTranslation({ responseData: { translatedText: "кот" } })).toBe("кот");
  });

  it("возвращает пустую строку при отсутствии данных", () => {
    expect(parseTranslation({})).toBe("");
    expect(parseTranslation(null)).toBe("");
  });
});

describe("translateToRussian", () => {
  it("возвращает перевод при успешном ответе", async () => {
    const fetchFn = mockFetch({ ok: true, body: { responseData: { translatedText: "кот" } } });
    expect(await translateToRussian("cat", "en", fetchFn)).toBe("кот");
  });

  it("возвращает пустую строку при не-ok ответе", async () => {
    const fetchFn = mockFetch({ ok: false });
    expect(await translateToRussian("cat", "en", fetchFn)).toBe("");
  });
});
