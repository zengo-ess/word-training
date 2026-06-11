/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileScreen } from "../ProfileScreen";

const logoutMock = vi.fn();
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ logout: logoutMock, user: { id: "u1", name: "Женя" } }),
}));

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
});
