/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { pronunciationRu } from "../pronunciation";

describe("pronunciationRu (немецкий)", () => {
  it("расставляет типичные немецкие звуки", () => {
    expect(pronunciationRu("Schule", "de")).toBe("шуле");
    expect(pronunciationRu("Zeit", "de")).toBe("цайт");
    expect(pronunciationRu("ich", "de")).toBe("их");
  });

  it("отбрасывает артикль перед словом", () => {
    expect(pronunciationRu("die Zeit", "de")).toBe(pronunciationRu("Zeit", "de"));
  });
});

describe("pronunciationRu (английский)", () => {
  it("расставляет типичные английские звуки", () => {
    expect(pronunciationRu("cat", "en")).toBe("кат");
    expect(pronunciationRu("ship", "en")).toBe("шип");
    expect(pronunciationRu("this", "en")).toBe("зис");
  });

  it("возвращает пустую строку для пустого ввода", () => {
    expect(pronunciationRu("", "en")).toBe("");
  });
});
