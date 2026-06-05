/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { apiRequest } from "../http";

interface Captured {
  url: string;
  init: RequestInit;
}

function mockFetch(
  status: number,
  body: unknown,
  captured?: { value?: Captured },
): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    if (captured) {
      captured.value = { url, init };
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  }) as unknown as typeof fetch;
}

describe("apiRequest", () => {
  it("возвращает распарсенный JSON при успехе", async () => {
    const data = await apiRequest<{ hello: string }>("/api/x", {}, mockFetch(200, { hello: "мир" }));
    expect(data.hello).toBe("мир");
  });

  it("шлёт тело JSON и Content-Type для POST", async () => {
    const captured: { value?: Captured } = {};
    await apiRequest("/api/x", { method: "POST", body: { a: 1 } }, mockFetch(200, {}, captured));
    expect(captured.value?.init.method).toBe("POST");
    expect(captured.value?.init.body).toBe(JSON.stringify({ a: 1 }));
    expect((captured.value?.init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("добавляет Bearer-токен", async () => {
    const captured: { value?: Captured } = {};
    await apiRequest("/api/x", { token: "T" }, mockFetch(200, {}, captured));
    expect((captured.value?.init.headers as Record<string, string>).Authorization).toBe("Bearer T");
  });

  it("возвращает undefined при 204", async () => {
    const data = await apiRequest<undefined>("/api/x", { method: "DELETE" }, mockFetch(204, null));
    expect(data).toBeUndefined();
  });

  it("бросает ошибку с status и сообщением из тела при не-ok", async () => {
    await expect(
      apiRequest("/api/x", {}, mockFetch(401, { error: "Неверный пароль" })),
    ).rejects.toMatchObject({ status: 401, message: "Неверный пароль" });
  });
});
