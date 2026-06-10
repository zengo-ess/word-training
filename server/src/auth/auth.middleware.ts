import type { NextFunction, Request, Response } from "express";
import type Database from "better-sqlite3";
import { verifyToken } from "./auth.service.js";
import { getUser } from "./users.repository.js";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function createAuthMiddleware(secret: string, db: Database.Database) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const userId = token ? verifyToken(token, secret) : null;

    if (!userId || !getUser(db, userId)) {
      res.status(401).json({ error: "Не авторизован" });
      return;
    }
    req.userId = userId;
    next();
  };
}
