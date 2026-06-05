import { Router } from "express";
import type Database from "better-sqlite3";
import { getWord } from "../words/words.repository.js";
import {
  getTodayTraining,
  recordLearningStep,
  markLearned,
  recordReview,
} from "./training.service.js";

export function createTrainingRouter(db: Database.Database): Router {
  const router = Router();

  router.get("/today", (_req, res) => {
    res.json(getTodayTraining(db, new Date()));
  });

  router.post("/result", (req, res) => {
    const body = req.body ?? {};
    const wordId = typeof body.wordId === "string" ? body.wordId : "";
    if (!getWord(db, wordId)) {
      res.status(404).json({ error: "Слово не найдено" });
      return;
    }

    const mode = body.mode;

    if (mode === "step") {
      const currentType = Number(body.currentType);
      if (!Number.isInteger(currentType) || currentType < 1 || currentType > 5) {
        res.status(400).json({ error: "Некорректный тип упражнения" });
        return;
      }
      res.json({ progress: recordLearningStep(db, wordId, currentType) });
      return;
    }

    if (mode === "learned") {
      res.json({ progress: markLearned(db, wordId, new Date()) });
      return;
    }

    if (mode === "review") {
      if (typeof body.correct !== "boolean") {
        res.status(400).json({ error: "Нужно поле correct (boolean)" });
        return;
      }
      const progress = recordReview(db, wordId, body.correct, new Date());
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
