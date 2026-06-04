/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import {
  buildUnsplashSearchUrl,
  parseUnsplashResults,
  searchImages,
} from "../unsplash.js";

function mockFetch(payload: { ok: boolean; body?: unknown }): typeof fetch {
  return (async () => ({
    ok: payload.ok,
    json: async () => payload.body,
  })) as unknown as typeof fetch;
}

describe("buildUnsplashSearchUrl", () => {
  it("строит URL поиска с query и per_page", () => {
    const url = buildUnsplashSearchUrl("cat");
    expect(url).toContain("https://api.unsplash.com/search/photos?");
    expect(url).toContain("query=cat");
    expect(url).toContain("per_page=12");
  });
});

describe("parseUnsplashResults", () => {
  it("возвращает массив regular-ссылок", () => {
    const urls = parseUnsplashResults({
      results: [{ urls: { regular: "https://img/1" } }, { urls: { regular: "https://img/2" } }],
    });
    expect(urls).toEqual(["https://img/1", "https://img/2"]);
  });

  it("отфильтровывает элементы без ссылки и пустой ответ", () => {
    expect(parseUnsplashResults({ results: [{ urls: {} }] })).toEqual([]);
    expect(parseUnsplashResults({})).toEqual([]);
  });
});

describe("searchImages", () => {
  it("возвращает пустой массив без ключа доступа (fetch не вызывается)", async () => {
    let called = false;
    const fetchFn = (async () => {
      called = true;
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof fetch;
    expect(await searchImages("cat", "", fetchFn)).toEqual([]);
    expect(called).toBe(false);
  });

  it("возвращает ссылки при успешном ответе", async () => {
    const fetchFn = mockFetch({ ok: true, body: { results: [{ urls: { regular: "https://img/1" } }] } });
    expect(await searchImages("cat", "key", fetchFn)).toEqual(["https://img/1"]);
  });

  it("возвращает пустой массив при не-ok ответе", async () => {
    const fetchFn = mockFetch({ ok: false });
    expect(await searchImages("cat", "key", fetchFn)).toEqual([]);
  });
});
