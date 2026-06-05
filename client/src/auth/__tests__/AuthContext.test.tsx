/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";

vi.mock("../authApi", () => ({
  login: vi.fn(async (password: string) =>
    password === "ok" ? "JWT" : Promise.reject(new Error("Неверный пароль")),
  ),
}));

function Probe() {
  const { isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="state">{isAuthenticated ? "in" : "out"}</span>
      <button type="button" onClick={() => void login("ok")}>
        войти
      </button>
      <button type="button" onClick={logout}>
        выйти
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("AuthProvider / useAuth", () => {
  it("стартует разлогиненным и логинится с сохранением токена", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId("state")).toHaveTextContent("out");

    await act(async () => {
      screen.getByRole("button", { name: "войти" }).click();
    });

    expect(screen.getByTestId("state")).toHaveTextContent("in");
    expect(localStorage.getItem("wt_token")).toBe("JWT");
  });

  it("logout очищает токен и состояние", async () => {
    localStorage.setItem("wt_token", "JWT");
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId("state")).toHaveTextContent("in");

    await act(async () => {
      screen.getByRole("button", { name: "выйти" }).click();
    });

    expect(screen.getByTestId("state")).toHaveTextContent("out");
    expect(localStorage.getItem("wt_token")).toBeNull();
  });
});
