import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory } from "fake-indexeddb";
import { OfflineLibrary } from "../OfflineLibrary";
import { saveOfflineDeck, offlineKey } from "../storage";
import { deck, word, memoryCaches } from "./helpers";

vi.mock("../../auth/AuthContext", () => ({ useAuth: () => ({ user: { id: "sasha", name: "Саша" } }) }));
beforeEach(async () => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("caches", memoryCaches());
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("No network")));
  await saveOfflineDeck({ key: offlineKey("sasha", deck.id), userId: "sasha", deck, words: [
    { ...word, image_url: null, audio_url: null },
    { ...word, id: "dog", foreign_word: "dog", native_word: "собака", image_url: null, audio_url: null },
  ], cacheName: "media", savedAt: new Date().toISOString() });
});
afterEach(() => vi.unstubAllGlobals());

describe("автономный просмотр", () => {
  it("читает скачанные слова без запросов, открывает перевод и листает с его скрытием", async () => {
    const user = userEvent.setup();
    render(<OfflineLibrary onClose={vi.fn()} />);
    await user.click(await screen.findByRole("button", { name: "Животные · 2 слов" }));
    expect(screen.getByRole("heading", { name: "cat" })).toBeInTheDocument();
    expect(screen.queryByText("кошка")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Показать перевод" }));
    expect(screen.getByText("кошка")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Следующая" }));
    expect(screen.getByRole("heading", { name: "dog" })).toBeInTheDocument();
    expect(screen.queryByText("собака")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("удаляет локальную загрузку без обращения к серверу", async () => {
    const user = userEvent.setup();
    render(<OfflineLibrary onClose={vi.fn()} />);
    await user.click(await screen.findByRole("button", { name: "Удалить загрузку" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Животные · 2 слов" })).not.toBeInTheDocument());
    expect(fetch).not.toHaveBeenCalled();
  });
});
