import { Router } from "express";
import type Database from "better-sqlite3";
import { getStats } from "./stats.service.js";

export function createStatsRouter(db: Database.Database): Router {
  const router = Router();
  router.get("/", (_req, res) => {
    res.json(getStats(db, new Date()));
  });
  return router;
}
