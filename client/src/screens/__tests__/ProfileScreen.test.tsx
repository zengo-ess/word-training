/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileScreen } from "../ProfileScreen";

const logoutMock = vi.fn();
const setLanguageMock = vi.fn();
let mockLanguage = "en";
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    logout: logoutMock,
    user: { id: "u1", name: "Женя", language: mockLanguage },
    setLanguage: setLanguageMock,
  }),
}));

beforeEach(() => {
  mockLanguage = "en";
  setLanguageMock.mockReset();
});

describe("ProfileScreen", () => {
  it("показывает заголовок и настройки", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("Профиль")).toBeInTheDocument();
    expect(screen.getByText("Дневная цель")).toBeInTheDocument();
    expect(screen.getByText("Направление повторов")).toBeInTheDocument();
  });

  it("показывает имя пользователя и первую букву в аватаре", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("Женя")).toBeInTheDocument();
    expect(screen.getByText("Ж")).toBeInTheDocument();
  });

  it("кнопка выйти вызывает logout", async () => {
    logoutMock.mockReset();
    const user = userEvent.setup();
    render(<ProfileScreen />);
    await user.click(screen.getByRole("button", { name: /Выйти/ }));
    expect(logoutMock).toHaveBeenCalledOnce();
  });

  it("показывает текущий язык изучения и переключает его по клику", async () => {
    const user = userEvent.setup();
    render(<ProfileScreen />);
    expect(screen.getByText("Язык изучения")).toBeInTheDocument();
    expect(screen.getByText("Английский")).toBeInTheDocument();

    await user.click(screen.getByText("Язык изучения"));
    expect(setLanguageMock).toHaveBeenCalledWith("de");
  });

  it("показывает «Немецкий», когда язык профиля de", () => {
    mockLanguage = "de";
    render(<ProfileScreen />);
    expect(screen.getByText("Немецкий")).toBeInTheDocument();
  });
});
