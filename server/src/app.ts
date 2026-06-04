import express, { type Express } from "express";
import type Database from "better-sqlite3";
import type { AppConfig } from "./config.js";
import { createAuthRouter } from "./auth/auth.routes.js";
import { createAuthMiddleware } from "./auth/auth.middleware.js";
import { createDecksRouter } from "./decks/decks.routes.js";
import { createWordsRouter } from "./words/words.routes.js";
import { createUnsplashRouter } from "./unsplash.routes.js";

export function createApp(config: AppConfig, db: Database.Database): Express {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", createAuthRouter(config));

  const requireAuth = createAuthMiddleware(config.jwtSecret);
  app.use("/api/decks", requireAuth, createDecksRouter(db));
  app.use("/api/words", requireAuth, createWordsRouter(db, config.unsplashAccessKey));
  app.use("/api/unsplash", requireAuth, createUnsplashRouter(config.unsplashAccessKey));

  return app;
}
