import { Router } from "express";
import type Database from "better-sqlite3";
import { listDecks, getDeck, createDeck } from "./decks.repository.js";
import { listWordsByDeck } from "../words/words.repository.js";

export function createDecksRouter(db: Database.Database): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ decks: listDecks(db) });
  });

  router.post("/", (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      res.status(400).json({ error: "Не указано название колоды" });
      return;
    }
    res.status(201).json({ deck: createDeck(db, name) });
  });

  router.get("/:id/words", (req, res) => {
    const deck = getDeck(db, req.params.id);
    if (!deck) {
      res.status(404).json({ error: "Колода не найдена" });
      return;
    }
    res.json({ words: listWordsByDeck(db, req.params.id) });
  });

  return router;
}
