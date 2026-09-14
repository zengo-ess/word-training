import { Router } from "express";
import type Database from "better-sqlite3";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import { getUser } from "../auth/users.repository.js";
import { getDeck, createDeck, canAccessDeck } from "./decks.repository.js";
import { listDecksWithStats, listWordsWithProgress } from "./deckStats.repository.js";

export function createDecksRouter(db: Database.Database): Router {
  const router = Router();

  router.get("/", (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const language = getUser(db, userId)?.language ?? "en";
    res.json({ decks: listDecksWithStats(db, userId, language) });
  });

  router.post("/", (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const language = getUser(db, userId)?.language ?? "en";
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      res.status(400).json({ error: "Не указано название колоды" });
      return;
    }
    res.status(201).json({ deck: createDeck(db, name, userId, language) });
  });

  router.get("/:id/words", (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const deck = getDeck(db, req.params.id);
    if (!deck || !canAccessDeck(deck, userId)) {
      res.status(404).json({ error: "Колода не найдена" });
      return;
    }
    res.json({ words: listWordsWithProgress(db, req.params.id, userId) });
  });

  return router;
}
