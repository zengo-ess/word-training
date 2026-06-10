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
  it("verifyToken возвращает userId из токена", () => {
    const token = signToken("user-1", SECRET);
    expect(verifyToken(token, SECRET)).toBe("user-1");
  });

  it("чужой секрет — null", () => {
    const token = signToken("user-1", SECRET);
    expect(verifyToken(token, "other-secret")).toBeNull();
  });

  it("мусорный токен — null", () => {
    expect(verifyToken("not-a-token", SECRET)).toBeNull();
  });
});
