/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditWordScreen } from "../EditWordScreen";
import type { WordWithProgress } from "../../api/types";

const updateMock = vi.fn();
const searchImagesMock = vi.fn();
const uploadImageMock = vi.fn();
vi.mock("../../api/wordsApi", () => ({
  updateWord: (id: string, input: unknown) => updateMock(id, input),
  searchImages: (q: string) => searchImagesMock(q),
  uploadImage: (file: File) => uploadImageMock(file),
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
  example_sentence: null,
  image_url: null,
  audio_url: null,
  created_at: "x",
  progress: null,
};

beforeEach(() => {
  updateMock.mockReset();
  searchImagesMock.mockReset();
  uploadImageMock.mockReset();
});

describe("EditWordScreen", () => {
  it("предзаполняет поля текущими значениями слова", () => {
    render(<EditWordScreen word={word} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByLabelText("Английское слово")).toHaveValue("apple");
    expect(screen.getByLabelText("Перевод")).toHaveValue("яблоко");
    expect(screen.getByLabelText("Транскрипция")).toHaveValue("/ˈæpəl/");
  });

  it("сохраняет изменённые поля через updateWord", async () => {
    updateMock.mockResolvedValue({ ...word, native_word: "яблочко" });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<EditWordScreen word={word} onClose={vi.fn()} onSaved={onSaved} />);

    const nativeInput = screen.getByLabelText("Перевод");
    await user.clear(nativeInput);
    await user.type(nativeInput, "яблочко");
    await user.click(screen.getByRole("button", { name: /Сохранить/ }));

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith("w1", {
        foreignWord: "apple",
        nativeWord: "яблочко",
        imageUrl: null,
        transcription: "/ˈæpəl/",
      }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });

  it("клик по X вызывает onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<EditWordScreen word={word} onClose={onClose} onSaved={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
