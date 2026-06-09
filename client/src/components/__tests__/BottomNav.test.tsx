/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomNav } from "../BottomNav";

describe("BottomNav", () => {
  it("переключает вкладку по клику", async () => {
    const onTab = vi.fn();
    const user = userEvent.setup();
    render(<BottomNav tab="home" onTab={onTab} onLearn={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Колоды" }));
    expect(onTab).toHaveBeenCalledWith("decks");
  });

  it("центральная кнопка запускает обучение", async () => {
    const onLearn = vi.fn();
    const user = userEvent.setup();
    render(<BottomNav tab="home" onTab={vi.fn()} onLearn={onLearn} />);
    await user.click(screen.getByRole("button", { name: "Учить" }));
    expect(onLearn).toHaveBeenCalledOnce();
  });
});
