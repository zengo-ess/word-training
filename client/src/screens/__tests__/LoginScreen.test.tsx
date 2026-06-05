/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginScreen } from "../LoginScreen";

const loginMock = vi.fn();

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false, login: loginMock, logout: vi.fn() }),
}));

beforeEach(() => {
  loginMock.mockReset();
});

describe("LoginScreen", () => {
  it("вызывает login с введённым паролем", async () => {
    loginMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.type(screen.getByLabelText("Пароль"), "secret");
    await user.click(screen.getByRole("button", { name: "Войти" }));

    expect(loginMock).toHaveBeenCalledWith("secret");
  });

  it("показывает ошибку при неудачном входе", async () => {
    loginMock.mockRejectedValue(new Error("Неверный пароль"));
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.type(screen.getByLabelText("Пароль"), "bad");
    await user.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Неверный пароль");
    });
  });

  it("кнопка заблокирована при пустом пароле", () => {
    render(<LoginScreen />);
    expect(screen.getByRole("button", { name: "Войти" })).toBeDisabled();
  });
});
