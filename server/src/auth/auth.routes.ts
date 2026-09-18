import { Router } from "express";
import type Database from "better-sqlite3";
import type { AppConfig } from "../config.js";
import type { AuthedRequest } from "./auth.middleware.js";
import { checkPassword, signToken } from "./auth.service.js";
import { hashPassword, verifyPassword } from "./password.js";
import {
  createUser,
  getUser,
  getUserByName,
  listUsers,
  toPublicUser,
  updateUserSettings,
  type UserSettingsPatch,
} from "./users.repository.js";

const LANGUAGES = ["en", "de"];
const DIRECTIONS = ["toNative", "toForeign", "both"];
const MAX_DAILY_GOAL = 500;

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
      user: toPublicUser(user),
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
      user: toPublicUser(user),
    });
  });

  return router;
}

// Разбирает тело PATCH /me/settings. Строка с ошибкой означает, что ничего
// сохранять нельзя — патч применяется целиком или не применяется вовсе.
export function parseSettingsPatch(body: unknown): UserSettingsPatch | string {
  const raw = (body ?? {}) as Record<string, unknown>;
  const patch: UserSettingsPatch = {};

  if (raw.language !== undefined) {
    if (typeof raw.language !== "string" || !LANGUAGES.includes(raw.language)) {
      return "Недопустимый язык";
    }
    patch.language = raw.language;
  }
  if (raw.dailyGoal !== undefined) {
    if (
      typeof raw.dailyGoal !== "number" ||
      !Number.isInteger(raw.dailyGoal) ||
      raw.dailyGoal < 1 ||
      raw.dailyGoal > MAX_DAILY_GOAL
    ) {
      return `Дневная цель должна быть целым числом от 1 до ${MAX_DAILY_GOAL}`;
    }
    patch.dailyGoal = raw.dailyGoal;
  }
  if (raw.ttsEnabled !== undefined) {
    if (typeof raw.ttsEnabled !== "boolean") {
      return "Нужно поле ttsEnabled (boolean)";
    }
    patch.ttsEnabled = raw.ttsEnabled;
  }
  if (raw.reviewDirection !== undefined) {
    if (typeof raw.reviewDirection !== "string" || !DIRECTIONS.includes(raw.reviewDirection)) {
      return "Недопустимое направление повторов";
    }
    patch.reviewDirection = raw.reviewDirection;
  }

  return patch;
}

// Требует авторизации — монтируется отдельно с auth-middleware (см. app.ts)
export function createAuthMeRouter(db: Database.Database): Router {
  const router = Router();

  router.patch("/settings", (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const patch = parseSettingsPatch(req.body);
    if (typeof patch === "string") {
      res.status(400).json({ error: patch });
      return;
    }
    const user = updateUserSettings(db, userId, patch);
    if (!user) {
      res.status(404).json({ error: "Пользователь не найден" });
      return;
    }
    res.json({ user: toPublicUser(user) });
  });

  return router;
}
