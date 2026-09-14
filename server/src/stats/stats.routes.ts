import { Router } from "express";
import type Database from "better-sqlite3";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import { getUser } from "../auth/users.repository.js";
import { getStats } from "./stats.service.js";

export function createStatsRouter(db: Database.Database): Router {
  const router = Router();
  router.get("/", (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const language = getUser(db, userId)?.language ?? "en";
    res.json(getStats(db, userId, new Date(), language));
  });
  return router;
}
