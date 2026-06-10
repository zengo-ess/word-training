import express, { type Express } from "express";
import type Database from "better-sqlite3";
import type { AppConfig } from "./config.js";
import { createAuthRouter } from "./auth/auth.routes.js";
import { createAuthMiddleware } from "./auth/auth.middleware.js";
import { createDecksRouter } from "./decks/decks.routes.js";
import { createWordsRouter } from "./words/words.routes.js";
import { createUnsplashRouter } from "./unsplash.routes.js";
import { createTrainingRouter } from "./training/training.routes.js";
import { createStatsRouter } from "./stats/stats.routes.js";

export function createApp(config: AppConfig, db: Database.Database): Express {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Статика озвучки (публично — браузерный <audio> не шлёт заголовок авторизации)
  app.use("/uploads", express.static(config.uploadsDir));

  app.use("/api/auth", createAuthRouter(config, db));

  const requireAuth = createAuthMiddleware(config.jwtSecret, db);
  app.use("/api/decks", requireAuth, createDecksRouter(db));
  app.use(
    "/api/words",
    requireAuth,
    createWordsRouter(db, {
      unsplashAccessKey: config.unsplashAccessKey,
      googleTtsApiKey: config.googleTtsApiKey,
      uploadsDir: config.uploadsDir,
    }),
  );
  app.use("/api/training", requireAuth, createTrainingRouter(db));
  app.use("/api/stats", requireAuth, createStatsRouter(db));
  app.use("/api/unsplash", requireAuth, createUnsplashRouter(config.unsplashAccessKey));

  return app;
}
