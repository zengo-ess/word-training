/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../Button";

describe("Button", () => {
  it("рендерит текст и реагирует на клик", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Войти</Button>);
    await user.click(screen.getByRole("button", { name: "Войти" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("не вызывает onClick когда disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Войти
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Войти" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
