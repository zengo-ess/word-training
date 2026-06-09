/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HomeScreen } from "../HomeScreen";

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

describe("HomeScreen", () => {
  it("показывает стрик и счётчик повторений", async () => {
    fetchStatsMock.mockResolvedValue(STATS);
    render(<HomeScreen onLearn={vi.fn()} onReview={vi.fn()} onOpenDeck={vi.fn()} onProfile={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("12")).toBeInTheDocument());
    expect(screen.getByText("14")).toBeInTheDocument();
  });

  it("показывает колоду в секции Продолжить", async () => {
    fetchStatsMock.mockResolvedValue({
      ...STATS,
      decks: [{ id: "d1", name: "Базовые", is_builtin: 1, created_at: "x", total: 10, learned: 5 }],
    });
    render(<HomeScreen onLearn={vi.fn()} onReview={vi.fn()} onOpenDeck={vi.fn()} onProfile={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Базовые")).toBeInTheDocument());
  });
});
