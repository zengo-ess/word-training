/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecksTab } from "../DecksTab";

const fetchDecksMock = vi.fn();
const createDeckMock = vi.fn();

vi.mock("../../api/decksApi", () => ({
  fetchDecks: () => fetchDecksMock(),
  createDeck: (name: string) => createDeckMock(name),
}));

beforeEach(() => {
  fetchDecksMock.mockReset();
  createDeckMock.mockReset();
});

describe("DecksTab", () => {
  it("делит колоды на мои и встроенные", async () => {
    fetchDecksMock.mockResolvedValue([
      { id: "1", name: "Базовые", is_builtin: 1, created_at: "x", total: 10, learned: 3 },
      { id: "2", name: "Мои слова", is_builtin: 0, created_at: "x", total: 2, learned: 0 },
    ]);
    render(<DecksTab onOpenDeck={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Мои слова")).toBeInTheDocument());
    expect(screen.getByText("Базовые")).toBeInTheDocument();
    expect(screen.getByText("Мои колоды")).toBeInTheDocument();
    expect(screen.getByText("Встроенные колоды")).toBeInTheDocument();
  });

  it("создаёт колоду и открывает её", async () => {
    fetchDecksMock.mockResolvedValue([]);
    createDeckMock.mockResolvedValue({ id: "9", name: "Новая", is_builtin: 0, created_at: "x", total: 0, learned: 0 });
    const onOpenDeck = vi.fn();
    const user = userEvent.setup();
    render(<DecksTab onOpenDeck={onOpenDeck} />);
    await waitFor(() => expect(fetchDecksMock).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: /Создать колоду/ }));
    await user.type(screen.getByLabelText("Название колоды"), "Новая");
    await user.click(screen.getByRole("button", { name: "Создать" }));

    expect(createDeckMock).toHaveBeenCalledWith("Новая");
    await waitFor(() => expect(onOpenDeck).toHaveBeenCalledWith(expect.objectContaining({ id: "9" })));
  });
});
