/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import { getToken, saveToken, clearToken } from "../token";

beforeEach(() => {
  localStorage.clear();
});

describe("token storage", () => {
  it("сохраняет и читает токен", () => {
    saveToken("abc");
    expect(getToken()).toBe("abc");
  });

  it("getToken возвращает null без токена", () => {
    expect(getToken()).toBeNull();
  });

  it("clearToken удаляет токен", () => {
    saveToken("abc");
    clearToken();
    expect(getToken()).toBeNull();
  });
});
