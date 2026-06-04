/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { loadConfig } from "../config.js";

describe("loadConfig", () => {
  it("читает значения из переданного окружения", () => {
    const config = loadConfig({
      APP_PASSWORD: "secret",
      JWT_SECRET: "jwt-secret",
      UNSPLASH_ACCESS_KEY: "unsplash",
      PORT: "4000",
    });
    expect(config.appPassword).toBe("secret");
    expect(config.jwtSecret).toBe("jwt-secret");
    expect(config.unsplashAccessKey).toBe("unsplash");
    expect(config.port).toBe(4000);
  });

  it("использует порт 3001 по умолчанию", () => {
    const config = loadConfig({ APP_PASSWORD: "p", JWT_SECRET: "j" });
    expect(config.port).toBe(3001);
  });

  it("бросает ошибку, если нет APP_PASSWORD или JWT_SECRET", () => {
    expect(() => loadConfig({ JWT_SECRET: "j" })).toThrow(/APP_PASSWORD/);
    expect(() => loadConfig({ APP_PASSWORD: "p" })).toThrow(/JWT_SECRET/);
  });
});
