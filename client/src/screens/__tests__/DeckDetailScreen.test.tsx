/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeckDetailScreen } from "../DeckDetailScreen";
import type { Deck } from "../../api/types";

const fetchDeckWordsMock = vi.fn();
vi.mock("../../api/decksApi", () => ({
  fetchDeckWords: (id: string) => fetchDeckWordsMock(id),
}));

const customDeck: Deck = { id: "d1", name: "Мои слова", is_builtin: 0, created_at: "x", total: 1, learned: 0 };

beforeEach(() => {
  fetchDeckWordsMock.mockReset();
});

describe("DeckDetailScreen", () => {
  it("показывает слова и кнопку добавления для своей колоды", async () => {
    fetchDeckWordsMock.mockResolvedValue([
      {
        id: "w1",
        deck_id: "d1",
        english: "apple",
        russian: "яблоко",
        transcription: null,
        example_sentence: null,
        image_url: null,
        audio_url: null,
        created_at: "x",
        progress: null,
      },
    ]);
    render(
      <DeckDetailScreen
        deck={customDeck}
        onBack={vi.fn()}
        onWord={vi.fn()}
        onAddWord={vi.fn()}
        onLearn={vi.fn()}
        onReview={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText("apple")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Добавить слово/ })).toBeInTheDocument();
  });

  it("назад вызывает onBack", async () => {
    fetchDeckWordsMock.mockResolvedValue([]);
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(
      <DeckDetailScreen deck={customDeck} onBack={onBack} onWord={vi.fn()} onAddWord={vi.fn()} onLearn={vi.fn()} onReview={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: "Назад" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
