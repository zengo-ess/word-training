/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "../App";

describe("App", () => {
  it("рендерит заголовок приложения", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Тренажёр слов" })).toBeInTheDocument();
  });
});
