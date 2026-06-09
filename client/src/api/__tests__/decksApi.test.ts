/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import { fetchDecks, createDeck, fetchDeckWords } from "../decksApi";

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

describe("decksApi", () => {
  it("fetchDecks возвращает массив и шлёт токен", async () => {
    const captured: { value?: Captured } = {};
    const decks = await fetchDecks(
      mockFetch({ decks: [{ id: "a", name: "Колода", is_builtin: 0, created_at: "x" }] }, captured),
    );
    expect(decks).toHaveLength(1);
    expect(decks[0].name).toBe("Колода");
    expect((captured.value?.init.headers as Record<string, string>).Authorization).toBe("Bearer T");
  });

  it("createDeck постит имя и возвращает колоду", async () => {
    const captured: { value?: Captured } = {};
    const deck = await createDeck(
      "Моя",
      mockFetch({ deck: { id: "b", name: "Моя", is_builtin: 0, created_at: "x" } }, captured),
    );
    expect(deck.name).toBe("Моя");
    expect(captured.value?.url).toBe("/api/decks");
    expect(captured.value?.init.method).toBe("POST");
    expect(captured.value?.init.body).toBe(JSON.stringify({ name: "Моя" }));
  });

  it("fetchDeckWords обращается к словам колоды", async () => {
    const captured: { value?: Captured } = {};
    const words = await fetchDeckWords("deck-1", mockFetch({ words: [] }, captured));
    expect(words).toEqual([]);
    expect(captured.value?.url).toBe("/api/decks/deck-1/words");
  });
});
