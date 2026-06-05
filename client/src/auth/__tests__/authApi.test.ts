/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { login } from "../authApi";

function mockFetch(status: number, body: unknown): typeof fetch {
  return (async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe("login", () => {
  it("возвращает токен при успехе", async () => {
    const token = await login("secret", mockFetch(200, { token: "JWT" }));
    expect(token).toBe("JWT");
  });

  it("пробрасывает ошибку при неверном пароле", async () => {
    await expect(
      login("bad", mockFetch(401, { error: "Неверный пароль" })),
    ).rejects.toThrow("Неверный пароль");
  });
});
