import { timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";

export function checkPassword(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function signToken(secret: string): string {
  return jwt.sign({ sub: "owner" }, secret, { expiresIn: "30d" });
}

export function verifyToken(token: string, secret: string): boolean {
  try {
    jwt.verify(token, secret);
    return true;
  } catch {
    return false;
  }
}
