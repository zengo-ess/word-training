/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginScreen } from "../LoginScreen";

const fetchUsersMock = vi.fn();
vi.mock("../../auth/authApi", () => ({
  fetchUsers: () => fetchUsersMock(),
  login: vi.fn(),
  register: vi.fn(),
}));

const loginMock = vi.fn();
const registerMock = vi.fn();
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ login: loginMock, register: registerMock, isAuthenticated: false, user: null, logout: vi.fn() }),
}));

beforeEach(() => {
  fetchUsersMock.mockReset();
  loginMock.mockReset();
  registerMock.mockReset();
});

describe("LoginScreen", () => {
  it("показывает профили и переходит к паролю", async () => {
    fetchUsersMock.mockResolvedValue([{ id: "u1", name: "Женя" }]);
    const user = userEvent.setup();
    render(<LoginScreen />);
    await waitFor(() => expect(screen.getByText("Женя")).toBeInTheDocument());

    await user.click(screen.getByText("Женя"));
    await user.type(screen.getByLabelText("Пароль"), "1234");
    await user.click(screen.getByRole("button", { name: "Войти" }));
    expect(loginMock).toHaveBeenCalledWith("u1", "1234");
  });

  it("создаёт профиль", async () => {
    fetchUsersMock.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<LoginScreen />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Создать профиль/ })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Создать профиль/ }));
    await user.type(screen.getByLabelText("Имя"), "Маша");
    await user.type(screen.getByLabelText("Пароль"), "1234");
    await user.type(screen.getByLabelText("Код семьи"), "family");
    await user.click(screen.getByRole("button", { name: "Создать" }));
    expect(registerMock).toHaveBeenCalledWith("Маша", "1234", "family");
  });

  it("показывает ошибку при неудачном входе", async () => {
    fetchUsersMock.mockResolvedValue([{ id: "u1", name: "Женя" }]);
    loginMock.mockRejectedValue(new Error("Неверный пароль"));
    const user = userEvent.setup();
    render(<LoginScreen />);
    await waitFor(() => expect(screen.getByText("Женя")).toBeInTheDocument());

    await user.click(screen.getByText("Женя"));
    await user.type(screen.getByLabelText("Пароль"), "bad");
    await user.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Неверный пароль");
    });
  });

  it("кнопка Назад возвращает к списку профилей", async () => {
    fetchUsersMock.mockResolvedValue([{ id: "u1", name: "Женя" }]);
    const user = userEvent.setup();
    render(<LoginScreen />);
    await waitFor(() => expect(screen.getByText("Женя")).toBeInTheDocument());

    await user.click(screen.getByText("Женя"));
    expect(screen.getByLabelText("Пароль")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Назад" }));
    expect(screen.getByText("Женя")).toBeInTheDocument();
    expect(screen.queryByLabelText("Пароль")).not.toBeInTheDocument();
  });

  it("без профилей показывает подсказку создать первый", async () => {
    fetchUsersMock.mockResolvedValue([]);
    render(<LoginScreen />);
    await waitFor(() =>
      expect(screen.getByText("Профилей пока нет — создайте первый")).toBeInTheDocument(),
    );
  });
});
