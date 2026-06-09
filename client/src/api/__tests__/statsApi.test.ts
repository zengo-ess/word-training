/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import { fetchStats } from "../statsApi";

function mockFetch(body: unknown): typeof fetch {
  return (async () => ({
    ok: true,
    status: 200,
    json: async () => body,
  })) as unknown as typeof fetch;
}

const STATS = {
  learned: 10,
  inProgress: 3,
  dueToday: 5,
  learnedToday: 2,
  dailyGoal: 20,
  streak: 7,
  week: [true, true, false, true, true, true, false],
  decks: [],
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("wt_token", "T");
});

describe("statsApi", () => {
  it("fetchStats возвращает данные", async () => {
    const stats = await fetchStats(mockFetch(STATS));
    expect(stats.streak).toBe(7);
    expect(stats.week).toHaveLength(7);
    expect(stats.dueToday).toBe(5);
  });
});
