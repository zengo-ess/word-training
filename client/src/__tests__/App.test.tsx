/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "../App";

const authState = { isAuthenticated: false };

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ ...authState, user: null, login: vi.fn(), register: vi.fn(), logout: vi.fn() }),
}));

vi.mock("../auth/authApi", () => ({
  fetchUsers: vi.fn(() => new Promise(() => undefined)),
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock("../AppShell", () => ({
  AppShell: () => <div>app-shell</div>,
}));

describe("App (гейт авторизации)", () => {
  it("показывает экран входа без авторизации", () => {
    authState.isAuthenticated = false;
    render(<App />);
    expect(screen.getByRole("heading", { name: "Кто занимается?" })).toBeInTheDocument();
  });

  it("показывает приложение после авторизации", () => {
    authState.isAuthenticated = true;
    render(<App />);
    expect(screen.getByText("app-shell")).toBeInTheDocument();
  });
});
