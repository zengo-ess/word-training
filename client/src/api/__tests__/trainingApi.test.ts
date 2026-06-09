/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import { fetchTodayTraining, postTrainingResult } from "../trainingApi";

function mockFetch(body: unknown): typeof fetch {
  return (async (_url: string, _init?: RequestInit) => ({
    ok: true,
    status: 200,
    json: async () => body,
  })) as unknown as typeof fetch;
}

function captureFetch(body: unknown): { captured: { url: string; init: RequestInit }; fn: typeof fetch } {
  const captured = { url: "", init: {} as RequestInit };
  const fn = (async (url: string, init: RequestInit) => {
    captured.url = url;
    captured.init = init;
    return { ok: true, status: 200, json: async () => body };
  }) as unknown as typeof fetch;
  return { captured, fn };
}

const WORD = { id: "w1", deck_id: "d1", english: "apple", russian: "яблоко", transcription: null, example_sentence: null, image_url: null, audio_url: null, created_at: "x" };

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("wt_token", "T");
});

describe("trainingApi", () => {
  it("fetchTodayTraining возвращает newWords и reviewWords", async () => {
    const result = await fetchTodayTraining(
      mockFetch({ newWords: [{ word: WORD, currentType: 1 }], reviewWords: [] }),
    );
    expect(result.newWords).toHaveLength(1);
    expect(result.newWords[0].word.english).toBe("apple");
    expect(result.reviewWords).toHaveLength(0);
  });

  it("postTrainingResult шлёт learned с нужным телом", async () => {
    const { captured, fn } = captureFetch({ progress: {} });
    await postTrainingResult("w1", "learned", undefined, fn);
    expect(captured.url).toBe("/api/training/result");
    const body = JSON.parse(captured.init.body as string) as Record<string, unknown>;
    expect(body.wordId).toBe("w1");
    expect(body.mode).toBe("learned");
  });

  it("postTrainingResult шлёт step с currentType", async () => {
    const { captured, fn } = captureFetch({ progress: {} });
    await postTrainingResult("w1", "step", 2, fn);
    const body = JSON.parse(captured.init.body as string) as Record<string, unknown>;
    expect(body.mode).toBe("step");
    expect(body.currentType).toBe(2);
  });
});
