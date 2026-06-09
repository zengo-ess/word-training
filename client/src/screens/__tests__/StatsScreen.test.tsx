/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { StatsScreen } from "../StatsScreen";

const fetchStatsMock = vi.fn();
vi.mock("../../api/statsApi", () => ({
  fetchStats: () => fetchStatsMock(),
}));

const STATS = {
  learned: 47,
  inProgress: 8,
  dueToday: 14,
  learnedToday: 11,
  dailyGoal: 20,
  streak: 12,
  week: [true, true, false, true, true, true, false],
  decks: [
    { id: "d1", name: "Базовые", is_builtin: 1, created_at: "x", total: 10, learned: 5 },
  ],
};

beforeEach(() => {
  fetchStatsMock.mockReset();
});

describe("StatsScreen", () => {
  it("показывает стрик и всего слов", async () => {
    fetchStatsMock.mockResolvedValue(STATS);
    render(<StatsScreen onOpenDeck={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByText("12").length).toBeGreaterThan(0));
    expect(screen.getAllByText("47").length).toBeGreaterThan(0);
  });

  it("показывает колоду в прогрессе", async () => {
    fetchStatsMock.mockResolvedValue(STATS);
    render(<StatsScreen onOpenDeck={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Базовые")).toBeInTheDocument());
  });
});
