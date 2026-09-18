/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileScreen } from "../ProfileScreen";

const logoutMock = vi.fn();
const updateSettingsMock = vi.fn();
let mockUser = {
  id: "9f1c0c4e-6a1d-4c2f-8c1a-2b7d1f4e5a60",
  name: "Женя",
  language: "en",
  daily_goal: 20,
  tts_enabled: 1,
  review_direction: "both",
};

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    logout: logoutMock,
    user: mockUser,
    updateSettings: updateSettingsMock,
  }),
}));

beforeEach(() => {
  mockUser = {
    id: "9f1c0c4e-6a1d-4c2f-8c1a-2b7d1f4e5a60",
    name: "Женя",
    language: "en",
    daily_goal: 20,
    tts_enabled: 1,
    review_direction: "both",
  };
  updateSettingsMock.mockReset();
  updateSettingsMock.mockResolvedValue(undefined);
  logoutMock.mockReset();
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
    const user = userEvent.setup();
    render(<ProfileScreen />);
    await user.click(screen.getByRole("button", { name: /Выйти/ }));
    expect(logoutMock).toHaveBeenCalledOnce();
  });

  it("не показывает строку напоминаний", () => {
    render(<ProfileScreen />);
    expect(screen.queryByText("Напоминания")).not.toBeInTheDocument();
  });

  it("показывает текущий язык изучения и переключает его по клику", async () => {
    const user = userEvent.setup();
    render(<ProfileScreen />);
    expect(screen.getByText("Английский")).toBeInTheDocument();

    await user.click(screen.getByText("Язык изучения"));
    expect(updateSettingsMock).toHaveBeenCalledWith({ language: "de" });
  });

  it("показывает «Немецкий», когда язык профиля de", () => {
    mockUser.language = "de";
    render(<ProfileScreen />);
    expect(screen.getByText("Немецкий")).toBeInTheDocument();
  });

  it("переключает дневную цель по кругу 10 → 20 → 30 → 50", async () => {
    const user = userEvent.setup();
    render(<ProfileScreen />);
    expect(screen.getByText("20 слов")).toBeInTheDocument();

    await user.click(screen.getByText("Дневная цель"));
    expect(updateSettingsMock).toHaveBeenCalledWith({ dailyGoal: 30 });
  });

  it("с последней цели возвращается на первую", async () => {
    mockUser.daily_goal = 50;
    const user = userEvent.setup();
    render(<ProfileScreen />);
    expect(screen.getByText("50 слов")).toBeInTheDocument();

    await user.click(screen.getByText("Дневная цель"));
    expect(updateSettingsMock).toHaveBeenCalledWith({ dailyGoal: 10 });
  });

  it("переключает озвучку", async () => {
    const user = userEvent.setup();
    render(<ProfileScreen />);
    expect(screen.getByText("Вкл")).toBeInTheDocument();

    await user.click(screen.getByText("Озвучка слов"));
    expect(updateSettingsMock).toHaveBeenCalledWith({ ttsEnabled: false });
  });

  it("показывает «Выкл», когда озвучка отключена", () => {
    mockUser.tts_enabled = 0;
    render(<ProfileScreen />);
    expect(screen.getByText("Выкл")).toBeInTheDocument();
  });

  it("переключает направление повторов по кругу", async () => {
    mockUser.review_direction = "toNative";
    const user = userEvent.setup();
    render(<ProfileScreen />);
    expect(screen.getByText("EN → RU")).toBeInTheDocument();

    await user.click(screen.getByText("Направление повторов"));
    expect(updateSettingsMock).toHaveBeenCalledWith({ reviewDirection: "toForeign" });
  });

  it("подписывает направление повторов языком профиля", () => {
    mockUser.language = "de";
    mockUser.review_direction = "toForeign";
    render(<ProfileScreen />);
    expect(screen.getByText("RU → DE")).toBeInTheDocument();
  });
});
