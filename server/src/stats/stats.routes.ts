import { Router } from "express";
import type Database from "better-sqlite3";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import { getStats } from "./stats.service.js";

export function createStatsRouter(db: Database.Database): Router {
  const router = Router();
  router.get("/", (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    res.json(getStats(db, userId, new Date()));
  });
  return router;
}
