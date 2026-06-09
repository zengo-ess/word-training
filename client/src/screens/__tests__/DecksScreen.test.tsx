/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DecksScreen } from "../DecksScreen";

const fetchDecksMock = vi.fn();
const createDeckMock = vi.fn();

vi.mock("../../api/decksApi", () => ({
  fetchDecks: () => fetchDecksMock(),
  createDeck: (name: string) => createDeckMock(name),
}));

function renderScreen() {
  return render(
    <MemoryRouter>
      <DecksScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  fetchDecksMock.mockReset();
  createDeckMock.mockReset();
});

describe("DecksScreen", () => {
  it("показывает встроенные и пользовательские колоды", async () => {
    fetchDecksMock.mockResolvedValue([
      { id: "1", name: "Топ 100", is_builtin: 1, created_at: "x" },
      { id: "2", name: "Моя колода", is_builtin: 0, created_at: "x" },
    ]);
    renderScreen();
    await waitFor(() => expect(screen.getByText("Моя колода")).toBeInTheDocument());
    expect(screen.getByText("Топ 100")).toBeInTheDocument();
  });

  it("создаёт колоду и перезагружает список", async () => {
    fetchDecksMock.mockResolvedValue([]);
    createDeckMock.mockResolvedValue({ id: "3", name: "Новая", is_builtin: 0, created_at: "x" });
    const user = userEvent.setup();
    renderScreen();
    await waitFor(() => expect(fetchDecksMock).toHaveBeenCalledTimes(1));

    await user.type(screen.getByLabelText("Название колоды"), "Новая");
    await user.click(screen.getByRole("button", { name: "Создать" }));

    expect(createDeckMock).toHaveBeenCalledWith("Новая");
    await waitFor(() => expect(fetchDecksMock).toHaveBeenCalledTimes(2));
  });
});
