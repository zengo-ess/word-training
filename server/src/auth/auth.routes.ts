import { Router } from "express";
import type Database from "better-sqlite3";
import type { AppConfig } from "../config.js";
import type { AuthedRequest } from "./auth.middleware.js";
import { checkPassword, signToken } from "./auth.service.js";
import { hashPassword, verifyPassword } from "./password.js";
import { createUser, getUser, getUserByName, listUsers, updateUserLanguage } from "./users.repository.js";

export function createAuthRouter(config: AppConfig, db: Database.Database): Router {
  const router = Router();

  router.get("/users", (_req, res) => {
    res.json({ users: listUsers(db) });
  });

  router.post("/register", (req, res) => {
    const body = req.body ?? {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const familyCode = typeof body.familyCode === "string" ? body.familyCode : "";

    if (!checkPassword(familyCode, config.appPassword)) {
      res.status(403).json({ error: "Неверный код семьи" });
      return;
    }
    if (!name || password.length < 4) {
      res.status(400).json({ error: "Нужны имя и пароль (от 4 символов)" });
      return;
    }
    if (getUserByName(db, name)) {
      res.status(409).json({ error: "Имя уже занято" });
      return;
    }

    const user = createUser(db, name, hashPassword(password));
    res.status(201).json({
      token: signToken(user.id, config.jwtSecret),
      user: { id: user.id, name: user.name, language: user.language },
    });
  });

  router.post("/login", (req, res) => {
    const body = req.body ?? {};
    const userId = typeof body.userId === "string" ? body.userId : "";
    const password = typeof body.password === "string" ? body.password : "";

    const user = getUser(db, userId);
    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: "Неверный пароль" });
      return;
    }

    res.json({
      token: signToken(user.id, config.jwtSecret),
      user: { id: user.id, name: user.name, language: user.language },
    });
  });

  return router;
}

// Требует авторизации — монтируется отдельно с auth-middleware (см. app.ts)
export function createAuthMeRouter(db: Database.Database): Router {
  const router = Router();

  router.patch("/language", (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const language = typeof req.body?.language === "string" ? req.body.language : "";
    if (language !== "en" && language !== "de") {
      res.status(400).json({ error: "Недопустимый язык" });
      return;
    }
    const user = updateUserLanguage(db, userId, language);
    res.json({ user: { id: user!.id, name: user!.name, language: user!.language } });
  });

  return router;
}
