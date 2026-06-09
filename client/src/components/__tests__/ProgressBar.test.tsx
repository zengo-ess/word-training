/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ProgressBar } from "../ProgressBar";

describe("ProgressBar", () => {
  it("ограничивает заполнение в пределах 0..100%", () => {
    const { container } = render(<ProgressBar value={150} max={100} />);
    const fill = container.firstElementChild?.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });

  it("считает процент от value/max", () => {
    const { container } = render(<ProgressBar value={5} max={20} />);
    const fill = container.firstElementChild?.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("25%");
  });
});
