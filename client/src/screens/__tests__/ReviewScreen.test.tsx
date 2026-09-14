/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewScreen } from "../ReviewScreen";
import type { Word } from "../../api/types";

const postReviewMock = vi.fn();
vi.mock("../../api/trainingApi", () => ({
  postReviewResult: (...args: unknown[]) => postReviewMock(...args),
}));

const WORD: Word = {
  id: "w1",
  deck_id: "d1",
  foreign_word: "apple",
  native_word: "яблоко",
  transcription: null,
  example_sentence: null,
  image_url: null,
  audio_url: null,
  created_at: "x",
};

const WORDS: Word[] = [
  WORD,
  { ...WORD, id: "w2", foreign_word: "book", native_word: "книга" },
];

beforeEach(() => {
  postReviewMock.mockReset();
  postReviewMock.mockResolvedValue({ progress: {} });
});

describe("ReviewScreen", () => {
  it("показывает интро с выбором направления и количеством слов", () => {
    render(<ReviewScreen dueWords={WORDS} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText("2 слов на повтор")).toBeInTheDocument();
    expect(screen.getByText("EN → RU")).toBeInTheDocument();
    expect(screen.getByText("RU → EN")).toBeInTheDocument();
    expect(screen.getByText("Оба")).toBeInTheDocument();
  });

  it("X на интро вызывает onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ReviewScreen dueWords={WORDS} onClose={onClose} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /закрыть/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("после Начать повтор показывает упражнение", async () => {
    const user = userEvent.setup();
    render(<ReviewScreen dueWords={WORDS} onClose={vi.fn()} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Начать повтор/ }));
    expect(screen.getByText("apple")).toBeInTheDocument();
  });
});
