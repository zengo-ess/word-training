/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddWordScreen } from "../AddWordScreen";

const lookupMock = vi.fn();
const createMock = vi.fn();
vi.mock("../../api/wordsApi", () => ({
  lookupWord: (en: string) => lookupMock(en),
  createWord: (input: unknown) => createMock(input),
  searchImages: vi.fn(),
}));

beforeEach(() => {
  lookupMock.mockReset();
  createMock.mockReset();
});

describe("AddWordScreen", () => {
  it("ищет перевод, затем сохраняет слово", async () => {
    lookupMock.mockResolvedValue({ english: "apple", russian: "яблоко", imageUrl: null, imageCandidates: [] });
    createMock.mockResolvedValue({ id: "w1" });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<AddWordScreen deckId="d1" onClose={vi.fn()} onSaved={onSaved} />);

    await user.type(screen.getByLabelText("Английское слово"), "apple");
    await user.click(screen.getByRole("button", { name: "Найти" }));

    await waitFor(() => expect(screen.getByLabelText("Перевод")).toHaveValue("яблоко"));
    await user.click(screen.getByRole("button", { name: /Сохранить/ }));

    expect(createMock).toHaveBeenCalledWith({ deckId: "d1", english: "apple", russian: "яблоко", imageUrl: null });
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });
});
