import { Router } from "express";
import type Database from "better-sqlite3";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import { getUser } from "../auth/users.repository.js";
import { getStats } from "./stats.service.js";

export function createStatsRouter(db: Database.Database): Router {
  const router = Router();
  router.get("/", (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const user = getUser(db, userId);
    const language = user?.language ?? "en";
    const dailyGoal = user?.daily_goal ?? 20;
    res.json(getStats(db, userId, new Date(), language, dailyGoal));
  });
  return router;
}
