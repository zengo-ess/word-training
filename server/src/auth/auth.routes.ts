import { Router } from "express";
import type { AppConfig } from "../config.js";
import { checkPassword, signToken } from "./auth.service.js";

export function createAuthRouter(config: AppConfig): Router {
  const router = Router();

  router.post("/login", (req, res) => {
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!checkPassword(password, config.appPassword)) {
      res.status(401).json({ error: "Неверный пароль" });
      return;
    }

    res.json({ token: signToken(config.jwtSecret) });
  });

  return router;
}
