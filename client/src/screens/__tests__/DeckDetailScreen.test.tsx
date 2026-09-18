/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeckDetailScreen } from "../DeckDetailScreen";
import type { Deck } from "../../api/types";

const fetchDeckWordsMock = vi.fn();
const renameDeckMock = vi.fn();
const deleteDeckMock = vi.fn();
vi.mock("../../api/decksApi", () => ({
  fetchDeckWords: (id: string) => fetchDeckWordsMock(id),
  renameDeck: (id: string, name: string) => renameDeckMock(id, name),
  deleteDeck: (id: string) => deleteDeckMock(id),
}));

function makeWord(id: string, foreignWord: string, nativeWord: string) {
  return {
    id,
    deck_id: "d1",
    foreign_word: foreignWord,
    native_word: nativeWord,
    transcription: null,
    example_sentence: null,
    image_url: null,
    audio_url: null,
    created_at: "x",
    progress: null,
  };
}

function manyWords(count: number) {
  return Array.from({ length: count }, (_, i) => makeWord(`w${i}`, `word${i}`, `слово${i}`));
}

function renderDeck(props: Partial<Parameters<typeof DeckDetailScreen>[0]> = {}) {
  return render(
    <DeckDetailScreen
      deck={customDeck}
      onBack={vi.fn()}
      onWord={vi.fn()}
      onAddWord={vi.fn()}
      onLearn={vi.fn()}
      onReview={vi.fn()}
      {...props}
    />,
  );
}

const customDeck: Deck = {
  id: "d1",
  name: "Мои слова",
  is_builtin: 0,
  language: "en",
  created_at: "x",
  total: 1,
  learned: 0,
};

beforeEach(() => {
  fetchDeckWordsMock.mockReset();
  renameDeckMock.mockReset();
  deleteDeckMock.mockReset();
  deleteDeckMock.mockResolvedValue(undefined);
});

describe("DeckDetailScreen", () => {
  it("показывает слова и кнопку добавления для своей колоды", async () => {
    fetchDeckWordsMock.mockResolvedValue([
      {
        id: "w1",
        deck_id: "d1",
        foreign_word: "apple",
        native_word: "яблоко",
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

describe("поиск по колоде", () => {
  it("на короткой колоде поля поиска нет", async () => {
    fetchDeckWordsMock.mockResolvedValue(manyWords(5));
    renderDeck();
    await waitFor(() => expect(screen.getByText("word0")).toBeInTheDocument());
    expect(screen.queryByLabelText("Поиск по колоде")).not.toBeInTheDocument();
  });

  it("на длинной колоде поле поиска появляется", async () => {
    fetchDeckWordsMock.mockResolvedValue(manyWords(25));
    renderDeck();
    await waitFor(() => expect(screen.getByLabelText("Поиск по колоде")).toBeInTheDocument());
  });

  it("фильтрует и по слову, и по переводу", async () => {
    fetchDeckWordsMock.mockResolvedValue([
      ...manyWords(20),
      makeWord("a", "apple", "яблоко"),
      makeWord("b", "bread", "хлеб"),
    ]);
    const user = userEvent.setup();
    renderDeck();
    await waitFor(() => expect(screen.getByLabelText("Поиск по колоде")).toBeInTheDocument());

    await user.type(screen.getByLabelText("Поиск по колоде"), "appl");
    expect(screen.getByText("apple")).toBeInTheDocument();
    expect(screen.queryByText("bread")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Поиск по колоде"));
    await user.type(screen.getByLabelText("Поиск по колоде"), "хлеб");
    expect(screen.getByText("bread")).toBeInTheDocument();
    expect(screen.queryByText("apple")).not.toBeInTheDocument();
  });

  it("показывает счётчик найденного и сообщение о пустом результате", async () => {
    fetchDeckWordsMock.mockResolvedValue(manyWords(25));
    const user = userEvent.setup();
    renderDeck();
    await waitFor(() => expect(screen.getByLabelText("Поиск по колоде")).toBeInTheDocument());

    await user.type(screen.getByLabelText("Поиск по колоде"), "word1");
    expect(screen.getByText("Найдено 11 из 25")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Поиск по колоде"));
    await user.type(screen.getByLabelText("Поиск по колоде"), "zzz");
    expect(screen.getByText("Ничего не нашлось.")).toBeInTheDocument();
  });
});

describe("постраничный показ", () => {
  it("показывает первые 50 слов и докидывает по кнопке", async () => {
    fetchDeckWordsMock.mockResolvedValue(manyWords(120));
    const user = userEvent.setup();
    renderDeck();
    await waitFor(() => expect(screen.getByText("word0")).toBeInTheDocument());

    expect(screen.getByText("word49")).toBeInTheDocument();
    expect(screen.queryByText("word50")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Показать ещё/ }));
    expect(screen.getByText("word50")).toBeInTheDocument();
    expect(screen.queryByText("word100")).not.toBeInTheDocument();
  });

  it("кнопки нет, когда показаны все слова", async () => {
    fetchDeckWordsMock.mockResolvedValue(manyWords(25));
    renderDeck();
    await waitFor(() => expect(screen.getByText("word0")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Показать ещё/ })).not.toBeInTheDocument();
  });

  it("смена запроса сбрасывает окно показа", async () => {
    fetchDeckWordsMock.mockResolvedValue(manyWords(120));
    const user = userEvent.setup();
    renderDeck();
    await waitFor(() => expect(screen.getByLabelText("Поиск по колоде")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Показать ещё/ }));
    expect(screen.getByText("word50")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Поиск по колоде"), "word");
    expect(screen.queryByText("word50")).not.toBeInTheDocument();
  });
});

describe("управление колодой", () => {
  it("переименовывает колоду и сообщает наверх", async () => {
    fetchDeckWordsMock.mockResolvedValue([]);
    renameDeckMock.mockResolvedValue({ ...customDeck, name: "Работа" });
    const onChanged = vi.fn();
    const user = userEvent.setup();
    renderDeck({ onChanged });
    await waitFor(() => expect(screen.getByText("Мои слова")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Переименовать колоду" }));
    await user.clear(screen.getByLabelText("Название колоды"));
    await user.type(screen.getByLabelText("Название колоды"), "Работа");
    await user.click(screen.getByRole("button", { name: "Сохранить название" }));

    expect(renameDeckMock).toHaveBeenCalledWith("d1", "Работа");
    await waitFor(() => expect(screen.getByText("Работа")).toBeInTheDocument());
    // Наверх уходит обновлённая колода: экран пересоздаётся по key и иначе
    // показал бы старое имя из стека оверлеев
    await waitFor(() =>
      expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ id: "d1", name: "Работа" })),
    );
  });

  it("отмена переименования не шлёт запрос", async () => {
    fetchDeckWordsMock.mockResolvedValue([]);
    const user = userEvent.setup();
    renderDeck();
    await waitFor(() => expect(screen.getByText("Мои слова")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Переименовать колоду" }));
    await user.type(screen.getByLabelText("Название колоды"), "хвост");
    await user.click(screen.getByRole("button", { name: "Отменить" }));

    expect(renameDeckMock).not.toHaveBeenCalled();
    expect(screen.getByText("Мои слова")).toBeInTheDocument();
  });

  it("удаляет колоду после подтверждения и уходит назад", async () => {
    fetchDeckWordsMock.mockResolvedValue(manyWords(3));
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onBack = vi.fn();
    const onChanged = vi.fn();
    const user = userEvent.setup();
    renderDeck({ onBack, onChanged });
    await waitFor(() => expect(screen.getByText("word0")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Удалить колоду" }));

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("3 словами"));
    expect(deleteDeckMock).toHaveBeenCalledWith("d1");
    await waitFor(() => expect(onBack).toHaveBeenCalled());
    expect(onChanged).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("склоняет число слов в подтверждении", async () => {
    fetchDeckWordsMock.mockResolvedValue(manyWords(1));
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    renderDeck();
    await waitFor(() => expect(screen.getByText("word0")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Удалить колоду" }));

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("вместе с 1 словом?"));
    confirmSpy.mockRestore();
  });

  it("отказ в подтверждении не удаляет колоду", async () => {
    fetchDeckWordsMock.mockResolvedValue([]);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    renderDeck();
    await waitFor(() => expect(screen.getByText("Мои слова")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Удалить колоду" }));

    expect(deleteDeckMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("у встроенной колоды управления нет", async () => {
    fetchDeckWordsMock.mockResolvedValue([]);
    renderDeck({ deck: { ...customDeck, is_builtin: 1, name: "Топ-200" } });
    await waitFor(() => expect(screen.getByText("Только чтение")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Переименовать колоду" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Удалить колоду" })).not.toBeInTheDocument();
  });
});
