/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrainerScreen } from "../TrainerScreen";
import type { Word } from "../../api/types";

const postResultMock = vi.fn();
vi.mock("../../api/trainingApi", () => ({
  postTrainingResult: (...args: unknown[]) => postResultMock(...args),
}));

vi.mock("../../screens/trainer/trainerLogic", async (importOriginal) => {
  const real = await importOriginal<typeof import("../trainer/trainerLogic")>();
  return {
    ...real,
    shuffle: (a: unknown[]) => [...a],
  };
});

const WORD: Word = {
  id: "w1",
  deck_id: "d1",
  english: "apple",
  russian: "яблоко",
  transcription: null,
  example_sentence: null,
  image_url: null,
  audio_url: null,
  created_at: "x",
};

const POOL: Word[] = [
  WORD,
  { ...WORD, id: "w2", english: "book", russian: "книга" },
  { ...WORD, id: "w3", english: "car", russian: "машина" },
  { ...WORD, id: "w4", english: "dog", russian: "собака" },
];

beforeEach(() => {
  postResultMock.mockReset();
  postResultMock.mockResolvedValue({ progress: {} });
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TrainerScreen", () => {
  it("показывает MCQ с вариантами ответов для типа 1", () => {
    render(<TrainerScreen batch={POOL} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText("яблоко")).toBeInTheDocument();
    expect(screen.getByText("apple")).toBeInTheDocument();
  });

  it("нажатие X вызывает onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<TrainerScreen batch={POOL} onClose={onClose} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /закрыть/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("показывает экран завершения для пустого батча", () => {
    render(<TrainerScreen batch={[]} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText(/Батч выучен/i)).toBeInTheDocument();
  });
});
