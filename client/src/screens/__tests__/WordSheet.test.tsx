/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WordSheet } from "../WordSheet";
import type { WordWithProgress } from "../../api/types";

vi.mock("../../lib/wordVisual", () => ({
  hueFromString: () => 55,
  playWord: vi.fn(),
}));

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Тестер", language: "en" } }),
}));

const word: WordWithProgress = {
  id: "w1",
  deck_id: "d1",
  foreign_word: "apple",
  native_word: "яблоко",
  transcription: "/ˈæpəl/",
  example_sentence: "I eat an ___ daily.",
  image_url: null,
  audio_url: null,
  created_at: "x",
  progress: { id: "p", word_id: "w1", current_type: null, learned_at: "2026-06-01", ease_factor: 2.3, interval_days: 3, next_review_at: "x", total_reviews: 4, correct_reviews: 3 },
};

describe("WordSheet", () => {
  it("показывает слово, перевод и пример", () => {
    render(<WordSheet word={word} onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "apple" })).toBeInTheDocument();
    expect(screen.getByText("яблоко")).toBeInTheDocument();
    expect(screen.getByText("I eat an apple daily.")).toBeInTheDocument();
  });

  it("клик по фону закрывает шит", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<WordSheet word={word} onClose={onClose} />);
    await user.click(screen.getByTestId("sheet-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });

  it("без onDelete кнопка удаления не отображается", () => {
    render(<WordSheet word={word} onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Удалить слово" })).not.toBeInTheDocument();
  });

  it("удаление вызывает onDelete после подтверждения", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<WordSheet word={word} onClose={vi.fn()} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: "Удалить слово" }));
    expect(onDelete).toHaveBeenCalled();
  });

  it("отменённое подтверждение не вызывает onDelete", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<WordSheet word={word} onClose={vi.fn()} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: "Удалить слово" }));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
