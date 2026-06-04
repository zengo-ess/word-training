/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { checkPassword, signToken, verifyToken } from "../auth.service.js";

const SECRET = "test-secret";

describe("checkPassword", () => {
  it("возвращает true при совпадении", () => {
    expect(checkPassword("hunter2", "hunter2")).toBe(true);
  });

  it("возвращает false при несовпадении", () => {
    expect(checkPassword("wrong", "hunter2")).toBe(false);
  });

  it("возвращает false при разной длине", () => {
    expect(checkPassword("short", "muchlongerpassword")).toBe(false);
  });
});

describe("signToken / verifyToken", () => {
  it("подписанный токен успешно проверяется", () => {
    const token = signToken(SECRET);
    expect(verifyToken(token, SECRET)).toBe(true);
  });

  it("токен с неверным секретом не проходит проверку", () => {
    const token = signToken(SECRET);
    expect(verifyToken(token, "other-secret")).toBe(false);
  });

  it("мусорный токен не проходит проверку", () => {
    expect(verifyToken("not-a-token", SECRET)).toBe(false);
  });
});
