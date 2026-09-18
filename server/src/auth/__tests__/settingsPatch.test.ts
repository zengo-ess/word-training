/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { parseSettingsPatch } from "../auth.routes.js";

describe("parseSettingsPatch", () => {
  it("пустое тело даёт пустой патч", () => {
    expect(parseSettingsPatch({})).toEqual({});
    expect(parseSettingsPatch(undefined)).toEqual({});
  });

  it("разбирает все поля сразу", () => {
    expect(
      parseSettingsPatch({
        language: "de",
        dailyGoal: 30,
        ttsEnabled: false,
        reviewDirection: "toForeign",
      }),
    ).toEqual({
      language: "de",
      dailyGoal: 30,
      ttsEnabled: false,
      reviewDirection: "toForeign",
    });
  });

  it("берёт только переданные поля", () => {
    expect(parseSettingsPatch({ ttsEnabled: true })).toEqual({ ttsEnabled: true });
  });

  it("отвергает неизвестный язык", () => {
    expect(parseSettingsPatch({ language: "fr" })).toBe("Недопустимый язык");
  });

  it("отвергает неизвестное направление повторов", () => {
    expect(parseSettingsPatch({ reviewDirection: "enru" })).toBe(
      "Недопустимое направление повторов",
    );
  });

  it("отвергает нецелую, нулевую и слишком большую цель", () => {
    expect(typeof parseSettingsPatch({ dailyGoal: 12.5 })).toBe("string");
    expect(typeof parseSettingsPatch({ dailyGoal: 0 })).toBe("string");
    expect(typeof parseSettingsPatch({ dailyGoal: 501 })).toBe("string");
    expect(typeof parseSettingsPatch({ dailyGoal: "20" })).toBe("string");
  });

  it("отвергает не-boolean в ttsEnabled", () => {
    expect(parseSettingsPatch({ ttsEnabled: 1 })).toBe("Нужно поле ttsEnabled (boolean)");
  });

  it("одно невалидное поле отменяет весь патч", () => {
    expect(typeof parseSettingsPatch({ dailyGoal: 30, language: "fr" })).toBe("string");
  });
});
