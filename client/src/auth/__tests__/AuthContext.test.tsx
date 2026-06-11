/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";

vi.mock("../authApi", () => ({
  login: vi.fn(async (userId: string, password: string) =>
    password === "ok"
      ? { token: "JWT", user: { id: userId, name: "Женя" } }
      : Promise.reject(new Error("Неверный пароль")),
  ),
  register: vi.fn(async (name: string) => ({
    token: "JWT2",
    user: { id: "u2", name },
  })),
}));

function Probe() {
  const { isAuthenticated, user, login, register, logout } = useAuth();
  return (
    <div>
      <span data-testid="state">{isAuthenticated ? "in" : "out"}</span>
      <span data-testid="user">{user ? user.name : "-"}</span>
      <button type="button" onClick={() => void login("u1", "ok")}>
        войти
      </button>
      <button type="button" onClick={() => void register("Маша", "1234", "family")}>
        создать
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
  it("стартует разлогиненным и логинится с сохранением токена и пользователя", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId("state")).toHaveTextContent("out");
    expect(screen.getByTestId("user")).toHaveTextContent("-");

    await act(async () => {
      screen.getByRole("button", { name: "войти" }).click();
    });

    expect(screen.getByTestId("state")).toHaveTextContent("in");
    expect(screen.getByTestId("user")).toHaveTextContent("Женя");
    expect(localStorage.getItem("wt_token")).toBe("JWT");
    expect(localStorage.getItem("wt_user")).toBe(JSON.stringify({ id: "u1", name: "Женя" }));
  });

  it("register логинит нового пользователя", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => {
      screen.getByRole("button", { name: "создать" }).click();
    });

    expect(screen.getByTestId("state")).toHaveTextContent("in");
    expect(screen.getByTestId("user")).toHaveTextContent("Маша");
    expect(localStorage.getItem("wt_token")).toBe("JWT2");
  });

  it("восстанавливает пользователя из localStorage", () => {
    localStorage.setItem("wt_token", "JWT");
    localStorage.setItem("wt_user", JSON.stringify({ id: "u1", name: "Женя" }));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId("state")).toHaveTextContent("in");
    expect(screen.getByTestId("user")).toHaveTextContent("Женя");
  });

  it("logout очищает токен, пользователя и состояние", async () => {
    localStorage.setItem("wt_token", "JWT");
    localStorage.setItem("wt_user", JSON.stringify({ id: "u1", name: "Женя" }));
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
    expect(screen.getByTestId("user")).toHaveTextContent("-");
    expect(localStorage.getItem("wt_token")).toBeNull();
    expect(localStorage.getItem("wt_user")).toBeNull();
  });
});
