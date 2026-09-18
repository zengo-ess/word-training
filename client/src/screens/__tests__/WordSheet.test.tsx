/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WordSheet } from "../WordSheet";
import type { WordWithProgress } from "../../api/types";

vi.mock("../../lib/wordVisual", () => ({
  hueFromString: () => 55,
  playWord: vi.fn(),
}));

let mockTts = 1;
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Тестер", language: "en", tts_enabled: mockTts } }),
}));

const fetchDecksMock = vi.fn();
const createDeckMock = vi.fn();
vi.mock("../../api/decksApi", () => ({
  fetchDecks: () => fetchDecksMock(),
  createDeck: (name: string) => createDeckMock(name),
}));

const copyWordMock = vi.fn();
vi.mock("../../api/wordsApi", () => ({
  copyWord: (wordId: string, deckId: string) => copyWordMock(wordId, deckId),
}));

const OWN_DECK = {
  id: "d9",
  name: "Мои слова",
  is_builtin: 0,
  language: "en",
  created_at: "x",
  total: 0,
  learned: 0,
};

beforeEach(() => {
  mockTts = 1;
  fetchDecksMock.mockReset();
  fetchDecksMock.mockResolvedValue([OWN_DECK, { ...OWN_DECK, id: "d0", name: "Топ-200", is_builtin: 1 }]);
  createDeckMock.mockReset();
  copyWordMock.mockReset();
  copyWordMock.mockResolvedValue({});
});

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

  it("без onEdit кнопка редактирования не отображается", () => {
    render(<WordSheet word={word} onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Изменить слово" })).not.toBeInTheDocument();
  });

  it("клик по кнопке редактирования вызывает onEdit", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<WordSheet word={word} onClose={vi.fn()} onEdit={onEdit} />);
    await user.click(screen.getByRole("button", { name: "Изменить слово" }));
    expect(onEdit).toHaveBeenCalled();
  });

  it("без onCopied кнопки копирования нет", () => {
    render(<WordSheet word={word} onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "В свою колоду" })).not.toBeInTheDocument();
  });

  it("при выключенной озвучке кнопки динамика нет", () => {
    mockTts = 0;
    render(<WordSheet word={word} onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Озвучить" })).not.toBeInTheDocument();
  });

  it("копирует слово в выбранную личную колоду", async () => {
    const onCopied = vi.fn();
    const user = userEvent.setup();
    render(<WordSheet word={word} onClose={vi.fn()} onCopied={onCopied} />);

    await user.click(screen.getByRole("button", { name: "В свою колоду" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Мои слова" })).toBeInTheDocument());
    // Встроенные колоды в список не попадают
    expect(screen.queryByRole("button", { name: "Топ-200" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Мои слова" }));

    expect(copyWordMock).toHaveBeenCalledWith("w1", "d9");
    await waitFor(() => expect(screen.getByText("Скопировано в «Мои слова»")).toBeInTheDocument());
    expect(onCopied).toHaveBeenCalled();
  });

  it("создаёт колоду на месте, когда своих нет", async () => {
    fetchDecksMock.mockResolvedValue([]);
    createDeckMock.mockResolvedValue({ ...OWN_DECK, id: "new", name: "Первая" });
    const user = userEvent.setup();
    render(<WordSheet word={word} onClose={vi.fn()} onCopied={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "В свою колоду" }));
    await waitFor(() => expect(screen.getByText("Своих колод пока нет — создайте первую")).toBeInTheDocument());

    await user.type(screen.getByLabelText("Новая колода"), "Первая");
    await user.click(screen.getByRole("button", { name: "Создать" }));

    expect(createDeckMock).toHaveBeenCalledWith("Первая");
    await waitFor(() => expect(copyWordMock).toHaveBeenCalledWith("w1", "new"));
    expect(screen.getByText("Скопировано в «Первая»")).toBeInTheDocument();
  });

  it("сообщает об ошибке копирования", async () => {
    copyWordMock.mockRejectedValue(new Error("нет связи"));
    const user = userEvent.setup();
    render(<WordSheet word={word} onClose={vi.fn()} onCopied={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "В свою колоду" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Мои слова" })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Мои слова" }));

    await waitFor(() => expect(screen.getByText("Не удалось скопировать слово")).toBeInTheDocument());
  });
});
