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

export function signToken(userId: string, secret: string): string {
  return jwt.sign({ sub: userId }, secret, { expiresIn: "30d" });
}

export function verifyToken(token: string, secret: string): string | null {
  try {
    const payload = jwt.verify(token, secret);
    const sub = typeof payload === "object" ? payload.sub : undefined;
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
}
