/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import {
  directionLabel,
  directionLabels,
  exerciseNames,
  langCode,
  langNameAccusative,
  typeShort,
} from "../languageLabels";

describe("langCode / langNameAccusative", () => {
  it("знает английский и немецкий", () => {
    expect(langCode("en")).toBe("EN");
    expect(langCode("de")).toBe("DE");
    expect(langNameAccusative("en")).toBe("английский");
    expect(langNameAccusative("de")).toBe("немецкий");
  });

  it("на неизвестном языке откатывается к английскому", () => {
    expect(langCode("fr")).toBe("EN");
    expect(langNameAccusative("fr")).toBe("английский");
  });
});

describe("exerciseNames", () => {
  it("подписывает переводы кодом изучаемого языка", () => {
    expect(exerciseNames("de")[1]).toBe("Перевод DE→RU");
    expect(exerciseNames("de")[2]).toBe("Перевод RU→DE");
    expect(exerciseNames("en")[1]).toBe("Перевод EN→RU");
  });

  it("подписи упражнений без языка не зависят от него", () => {
    expect(exerciseNames("de")[3]).toBe("Вставь пропуск");
    expect(exerciseNames("de")[4]).toBe("Собери из букв");
    expect(exerciseNames("de")[5]).toBe("Аудио");
  });
});

describe("typeShort", () => {
  it("даёт короткие подписи направлений", () => {
    expect(typeShort("de")).toEqual({ 1: "DE → RU", 2: "RU → DE" });
    expect(typeShort("en")).toEqual({ 1: "EN → RU", 2: "RU → EN" });
  });
});

describe("directionLabels", () => {
  it("отдаёт три направления с ключами настроек", () => {
    const labels = directionLabels("de");
    expect(labels.map((d) => d.key)).toEqual(["toNative", "toForeign", "both"]);
    expect(labels[0].label).toBe("DE → RU");
    expect(labels[1].label).toBe("RU → DE");
    expect(labels[2].label).toBe("Оба");
  });

  it("directionLabel находит подпись по ключу", () => {
    expect(directionLabel("de", "toForeign")).toBe("RU → DE");
    expect(directionLabel("en", "both")).toBe("Оба");
  });
});
