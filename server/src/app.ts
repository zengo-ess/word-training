import express, { type Express } from "express";
import type Database from "better-sqlite3";
import type { AppConfig } from "./config.js";
import { createAuthRouter } from "./auth/auth.routes.js";

export function createApp(config: AppConfig, _db: Database.Database): Express {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", createAuthRouter(config));

  return app;
}
