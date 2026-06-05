/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "../App";

const authState = { isAuthenticated: false };

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ ...authState, login: vi.fn(), logout: vi.fn() }),
}));

describe("App (гейт авторизации)", () => {
  it("показывает экран входа без авторизации", () => {
    authState.isAuthenticated = false;
    render(<App />);
    expect(screen.getByRole("heading", { name: "Вход" })).toBeInTheDocument();
  });

  it("показывает домашний экран после авторизации", () => {
    authState.isAuthenticated = true;
    render(<App />);
    expect(screen.getByRole("button", { name: "Выйти" })).toBeInTheDocument();
  });
});
