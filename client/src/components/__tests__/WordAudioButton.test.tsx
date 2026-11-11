import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WordAudioButton } from "../WordAudioButton";
import { playWord } from "../../lib/wordVisual";

vi.mock("../../lib/wordVisual", () => ({ playWord: vi.fn(), stopWordPlayback: vi.fn() }));
const word = { id: "cat", foreign_word: "cat", audio_url: "/cat.m4a" };
beforeEach(() => vi.mocked(playWord).mockReset().mockResolvedValue(undefined));
describe("кнопка озвучки", () => {
  it("показывает ошибку проигрывания и позволяет повторить нажатие", async () => {
    vi.mocked(playWord).mockRejectedValueOnce(new Error("Звук заблокирован браузером"));
    const user = userEvent.setup();
    render(<WordAudioButton word={word} language="en" />);
    await user.click(screen.getByRole("button", { name: "Озвучить" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Звук заблокирован");
    await user.click(screen.getByRole("button", { name: "Озвучить" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("не выдаёт отмену предыдущего проигрывания за ошибку", async () => {
    vi.mocked(playWord).mockRejectedValueOnce(new DOMException("cancelled", "AbortError"));
    const user = userEvent.setup();
    render(<WordAudioButton word={word} language="en" large />);
    await user.click(screen.getByRole("button", { name: "Прослушать слово" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
