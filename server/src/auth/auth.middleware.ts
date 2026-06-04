import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "./auth.service.js";

export function createAuthMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!token || !verifyToken(token, secret)) {
      res.status(401).json({ error: "Не авторизован" });
      return;
    }
    next();
  };
}
