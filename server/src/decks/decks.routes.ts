import { Router } from "express";
import type Database from "better-sqlite3";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import { getUser } from "../auth/users.repository.js";
import { deleteAudioFile } from "../services/audioStorage.js";
import {
  getDeck,
  createDeck,
  canAccessDeck,
  renameDeck,
  deleteDeckById,
  listWordIds,
  type DeckRow,
} from "./decks.repository.js";
import { listDecksWithStats, listWordsWithProgress } from "./deckStats.repository.js";

const BUILTIN_READONLY = "Встроенную колоду нельзя изменить";
const NOT_FOUND = "Колода не найдена";

export interface DecksRouterDeps {
  uploadsDir: string;
}

export function createDecksRouter(db: Database.Database, deps: DecksRouterDeps): Router {
  const router = Router();

  // Колода, которую текущий пользователь вправе менять. Строка — текст ошибки.
  function ownDeck(id: string, userId: string): DeckRow | { error: string; status: number } {
    const deck = getDeck(db, id);
    if (!deck || !canAccessDeck(deck, userId)) {
      return { error: NOT_FOUND, status: 404 };
    }
    if (deck.is_builtin) {
      return { error: BUILTIN_READONLY, status: 403 };
    }
    return deck;
  }

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
      res.status(404).json({ error: NOT_FOUND });
      return;
    }
    res.json({ words: listWordsWithProgress(db, req.params.id, userId) });
  });

  router.patch("/:id", (req: AuthedRequest, res) => {
    const found = ownDeck(req.params.id, req.userId as string);
    if ("error" in found) {
      res.status(found.status).json({ error: found.error });
      return;
    }
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      res.status(400).json({ error: "Не указано название колоды" });
      return;
    }
    res.json({ deck: renameDeck(db, found.id, name) });
  });

  router.delete("/:id", (req: AuthedRequest, res) => {
    const found = ownDeck(req.params.id, req.userId as string);
    if ("error" in found) {
      res.status(found.status).json({ error: found.error });
      return;
    }
    // Сначала файлы: после DELETE слова уже не найти
    for (const wordId of listWordIds(db, found.id)) {
      deleteAudioFile(deps.uploadsDir, wordId);
    }
    deleteDeckById(db, found.id);
    res.status(204).end();
  });

  return router;
}
