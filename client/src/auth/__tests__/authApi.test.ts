/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi } from "vitest";
import { fetchUsers, login, register } from "../authApi";

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }));
}

describe("fetchUsers", () => {
  it("возвращает список пользователей", async () => {
    const fetchFn = mockFetch(200, { users: [{ id: "u1", name: "Женя" }] });
    const users = await fetchUsers(fetchFn as unknown as typeof fetch);
    expect(users).toEqual([{ id: "u1", name: "Женя" }]);
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/auth/users",
      expect.objectContaining({ method: "GET" }),
    );
  });
});

describe("login", () => {
  it("шлёт userId и пароль, возвращает токен и пользователя", async () => {
    const fetchFn = mockFetch(200, { token: "JWT", user: { id: "u1", name: "Женя" } });
    const result = await login("u1", "1234", fetchFn as unknown as typeof fetch);
    expect(result).toEqual({ token: "JWT", user: { id: "u1", name: "Женя" } });
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userId: "u1", password: "1234" }),
      }),
    );
  });

  it("пробрасывает ошибку при неверном пароле", async () => {
    const fetchFn = mockFetch(401, { error: "Неверный пароль" });
    await expect(login("u1", "bad", fetchFn as unknown as typeof fetch)).rejects.toThrow(
      "Неверный пароль",
    );
  });
});

describe("register", () => {
  it("шлёт имя, пароль и код семьи, возвращает токен и пользователя", async () => {
    const fetchFn = mockFetch(201, { token: "JWT", user: { id: "u2", name: "Маша" } });
    const result = await register("Маша", "1234", "family", fetchFn as unknown as typeof fetch);
    expect(result).toEqual({ token: "JWT", user: { id: "u2", name: "Маша" } });
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Маша", password: "1234", familyCode: "family" }),
      }),
    );
  });

  it("пробрасывает ошибку при неверном коде семьи", async () => {
    const fetchFn = mockFetch(403, { error: "Неверный код семьи" });
    await expect(
      register("Маша", "1234", "wrong", fetchFn as unknown as typeof fetch),
    ).rejects.toThrow("Неверный код семьи");
  });
});
