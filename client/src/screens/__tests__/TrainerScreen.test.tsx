/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
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

let mockLanguage = "en";
let mockTts = 1;
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", name: "Тестер", language: mockLanguage, tts_enabled: mockTts },
  }),
}));

const playWordMock = vi.fn();
vi.mock("../../lib/wordVisual", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../lib/wordVisual")>();
  return {
    ...real,
    playWord: (...args: unknown[]) => playWordMock(...args),
  };
});

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

const POOL: Word[] = [
  WORD,
  { ...WORD, id: "w2", foreign_word: "book", native_word: "книга" },
  { ...WORD, id: "w3", foreign_word: "car", native_word: "машина" },
  { ...WORD, id: "w4", foreign_word: "dog", native_word: "собака" },
];

beforeEach(() => {
  postResultMock.mockReset();
  postResultMock.mockResolvedValue({ progress: {} });
  mockLanguage = "en";
  mockTts = 1;
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

  it("кнопка озвучки на фазе перевода вызывает playWord", async () => {
    playWordMock.mockReset();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<TrainerScreen batch={POOL} onClose={vi.fn()} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Озвучить" }));
    expect(playWordMock).toHaveBeenCalledWith(expect.objectContaining({ foreign_word: "apple" }), "en");
  });

  it("показывает экран завершения для пустого батча", () => {
    render(<TrainerScreen batch={[]} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText(/Батч выучен/i)).toBeInTheDocument();
  });

  it("клик по шагу переключает режим вручную, не дожидаясь прохождения предыдущего", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<TrainerScreen batch={POOL} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText("Перевод EN→RU")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Режим: Собери из букв" }));

    expect(screen.getByText("Собери из букв")).toBeInTheDocument();
    expect(screen.getByText("Соберите слово из букв")).toBeInTheDocument();
  });

  it("для немецкого профиля названия режимов и текст перевода используют DE/немецкий", async () => {
    mockLanguage = "de";
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<TrainerScreen batch={POOL} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText("Перевод DE→RU")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Режим: Перевод RU→DE" }));

    expect(screen.getByText("Перевод RU→DE")).toBeInTheDocument();
    expect(screen.getByText("Переведите на немецкий")).toBeInTheDocument();
  });

  it("при выключенной озвучке нет шага «Аудио» и кнопки динамика", () => {
    mockTts = 0;
    render(<TrainerScreen batch={POOL} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Режим: Аудио" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Озвучить" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Режим: Перевод EN→RU" })).toBeInTheDocument();
  });

  it("пройденный последний шаг не завершает батч, пока остальные не пройдены", async () => {
    const onDone = vi.fn();
    const batch = POOL.slice(0, 2);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<TrainerScreen batch={batch} onClose={vi.fn()} onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: "Режим: Аудио" }));
    expect(screen.getByText("Нажмите, чтобы прослушать")).toBeInTheDocument();

    for (const answer of ["яблоко", "книга"]) {
      await user.click(screen.getByRole("button", { name: answer }));
      await act(async () => {
        vi.advanceTimersByTime(900);
      });
    }

    // Шаг 5 пройден, но шаги 1, 2 и 4 — нет: слова не должны уйти в повторение
    expect(postResultMock).not.toHaveBeenCalledWith(expect.anything(), "learned");
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByText("Перевод EN→RU")).toBeInTheDocument();
  });

  it("батч завершается, когда пройдены все доступные шаги", async () => {
    const onDone = vi.fn();
    // Односимвольные слова: шаг «Собери из букв» проходится одним кликом,
    // и тест остаётся про правило завершения, а не про UI сборки
    const batch: Word[] = [
      { ...WORD, id: "s1", foreign_word: "a", native_word: "первое" },
      { ...WORD, id: "s2", foreign_word: "b", native_word: "второе" },
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<TrainerScreen batch={batch} onClose={vi.fn()} onDone={onDone} />);

    // Доступны шаги 1, 2, 4 и 5 — примеров у слов нет, озвучка включена
    const stepAnswers = [
      ["первое", "второе"],
      ["a", "b"],
      ["a", "b"],
      ["первое", "второе"],
    ];

    for (const answers of stepAnswers) {
      for (const answer of answers) {
        await user.click(screen.getAllByRole("button", { name: answer })[0]);
        await act(async () => {
          vi.advanceTimersByTime(1400);
        });
      }
    }

    expect(postResultMock).toHaveBeenCalledWith("s1", "learned");
    expect(postResultMock).toHaveBeenCalledWith("s2", "learned");
  });
});
