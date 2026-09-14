/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddWordScreen } from "../AddWordScreen";

const lookupMock = vi.fn();
const createMock = vi.fn();
const uploadImageMock = vi.fn();
vi.mock("../../api/wordsApi", () => ({
  lookupWord: (foreignWord: string, language: string) => lookupMock(foreignWord, language),
  createWord: (input: unknown) => createMock(input),
  searchImages: vi.fn(),
  uploadImage: (file: File) => uploadImageMock(file),
}));

let mockLanguage = "en";
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Тестер", language: mockLanguage } }),
}));

beforeEach(() => {
  lookupMock.mockReset();
  createMock.mockReset();
  uploadImageMock.mockReset();
  mockLanguage = "en";
});

describe("AddWordScreen", () => {
  it("ищет перевод, затем сохраняет слово (английский профиль)", async () => {
    lookupMock.mockResolvedValue({ foreignWord: "apple", nativeWord: "яблоко", imageUrl: null, imageCandidates: [] });
    createMock.mockResolvedValue({ id: "w1" });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<AddWordScreen deckId="d1" onClose={vi.fn()} onSaved={onSaved} />);

    await user.type(screen.getByLabelText("Английское слово"), "apple");
    await user.click(screen.getByRole("button", { name: "Найти" }));

    await waitFor(() => expect(screen.getByLabelText("Перевод")).toHaveValue("яблоко"));
    expect(lookupMock).toHaveBeenCalledWith("apple", "en");
    await user.click(screen.getByRole("button", { name: /Сохранить/ }));

    expect(createMock).toHaveBeenCalledWith({
      deckId: "d1",
      foreignWord: "apple",
      nativeWord: "яблоко",
      imageUrl: null,
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });

  it("подписывает поле «Немецкое слово» и ищет с language=de при немецком профиле", async () => {
    mockLanguage = "de";
    lookupMock.mockResolvedValue({ foreignWord: "Apfel", nativeWord: "яблоко", imageUrl: null, imageCandidates: [] });
    const user = userEvent.setup();
    render(<AddWordScreen deckId="d1" onClose={vi.fn()} onSaved={vi.fn()} />);

    await user.type(screen.getByLabelText("Немецкое слово"), "Apfel");
    await user.click(screen.getByRole("button", { name: "Найти" }));

    await waitFor(() => expect(lookupMock).toHaveBeenCalledWith("Apfel", "de"));
  });

  it("если ввели русское слово — подставляет найденное иностранное в верхнее поле", async () => {
    mockLanguage = "de";
    lookupMock.mockResolvedValue({ foreignWord: "der Tisch", nativeWord: "стол", imageUrl: null, imageCandidates: [] });
    const user = userEvent.setup();
    render(<AddWordScreen deckId="d1" onClose={vi.fn()} onSaved={vi.fn()} />);

    await user.type(screen.getByLabelText("Немецкое слово"), "стол");
    await user.click(screen.getByRole("button", { name: "Найти" }));

    await waitFor(() => expect(screen.getByLabelText("Немецкое слово")).toHaveValue("der Tisch"));
    expect(screen.getByLabelText("Перевод")).toHaveValue("стол");
  });

  it("загружает своё фото и делает его выбранной картинкой", async () => {
    lookupMock.mockResolvedValue({ foreignWord: "apple", nativeWord: "яблоко", imageUrl: null, imageCandidates: [] });
    uploadImageMock.mockResolvedValue("/uploads/images/abc.png");
    const user = userEvent.setup();
    const { container } = render(<AddWordScreen deckId="d1" onClose={vi.fn()} onSaved={vi.fn()} />);

    await user.type(screen.getByLabelText("Английское слово"), "apple");
    await user.click(screen.getByRole("button", { name: "Найти" }));
    await waitFor(() => expect(screen.getByLabelText("Перевод")).toHaveValue("яблоко"));

    const file = new File(["bytes"], "photo.png", { type: "image/png" });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => expect(uploadImageMock).toHaveBeenCalledWith(file));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Выбрать картинку" })).toHaveAttribute("aria-pressed", "true"),
    );
  });
});
