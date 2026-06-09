/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { DeckScreen } from "../DeckScreen";

const fetchDeckWordsMock = vi.fn();

vi.mock("../../api/decksApi", () => ({
  fetchDeckWords: (id: string) => fetchDeckWordsMock(id),
}));

function renderAt(deckId: string) {
  return render(
    <MemoryRouter initialEntries={[`/decks/${deckId}`]}>
      <Routes>
        <Route path="/decks/:id" element={<DeckScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  fetchDeckWordsMock.mockReset();
});

describe("DeckScreen", () => {
  it("показывает слова колоды", async () => {
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
      },
    ]);
    renderAt("d1");
    await waitFor(() => expect(screen.getByText("apple")).toBeInTheDocument());
    expect(screen.getByText("яблоко")).toBeInTheDocument();
    expect(fetchDeckWordsMock).toHaveBeenCalledWith("d1");
  });

  it("показывает пустое состояние", async () => {
    fetchDeckWordsMock.mockResolvedValue([]);
    renderAt("d2");
    await waitFor(() => expect(screen.getByText("В колоде пока нет слов.")).toBeInTheDocument());
  });
});
