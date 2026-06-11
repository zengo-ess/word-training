import { Router } from "express";
import type Database from "better-sqlite3";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import { getWord } from "../words/words.repository.js";
import { getDeck, canAccessDeck } from "../decks/decks.repository.js";
import {
  getTodayTraining,
  recordLearningStep,
  markLearned,
  recordReview,
} from "./training.service.js";
import { recordStudyDay, isoDay } from "../stats/studyDays.js";

export function createTrainingRouter(db: Database.Database): Router {
  const router = Router();

  router.get("/today", (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    res.json(getTodayTraining(db, userId, new Date()));
  });

  router.post("/result", (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const body = req.body ?? {};
    const wordId = typeof body.wordId === "string" ? body.wordId : "";
    const word = getWord(db, wordId);
    if (!word) {
      res.status(404).json({ error: "Слово не найдено" });
      return;
    }
    const deck = getDeck(db, word.deck_id);
    if (!deck || !canAccessDeck(deck, userId)) {
      res.status(404).json({ error: "Слово не найдено" });
      return;
    }

    recordStudyDay(db, userId, isoDay(new Date()));

    const mode = body.mode;

    if (mode === "step") {
      const currentType = Number(body.currentType);
      if (!Number.isInteger(currentType) || currentType < 1 || currentType > 5) {
        res.status(400).json({ error: "Некорректный тип упражнения" });
        return;
      }
      res.json({ progress: recordLearningStep(db, userId, wordId, currentType) });
      return;
    }

    if (mode === "learned") {
      res.json({ progress: markLearned(db, userId, wordId, new Date()) });
      return;
    }

    if (mode === "review") {
      if (typeof body.correct !== "boolean") {
        res.status(400).json({ error: "Нужно поле correct (boolean)" });
        return;
      }
      const progress = recordReview(db, userId, wordId, body.correct, new Date());
      if (!progress) {
        res.status(409).json({ error: "Слово ещё не в режиме повторения" });
        return;
      }
      res.json({ progress });
      return;
    }

    res.status(400).json({ error: "Неизвестный режим" });
  });

  return router;
}
