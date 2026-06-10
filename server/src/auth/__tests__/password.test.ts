/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../password.js";

describe("password", () => {
  it("верный пароль проходит проверку", () => {
    const hash = hashPassword("secret123");
    expect(verifyPassword("secret123", hash)).toBe(true);
  });

  it("неверный пароль не проходит", () => {
    const hash = hashPassword("secret123");
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("хэши одного пароля различаются (соль)", () => {
    expect(hashPassword("a")).not.toBe(hashPassword("a"));
  });
});
