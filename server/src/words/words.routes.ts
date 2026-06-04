import { Router } from "express";
import type Database from "better-sqlite3";
import { getDeck } from "../decks/decks.repository.js";
import { createWord, getWord, updateWord, deleteWord } from "./words.repository.js";
import { translateToRussian } from "../services/mymemory.js";
import { searchImages } from "../services/unsplash.js";

const BUILTIN_READONLY = "Встроенная колода доступна только для чтения";

export function createWordsRouter(db: Database.Database, unsplashAccessKey: string): Router {
  const router = Router();

  // Авто-черновик: перевод + картинки, без сохранения
  router.post("/lookup", async (req, res) => {
    const english = typeof req.body?.english === "string" ? req.body.english.trim() : "";
    if (!english) {
      res.status(400).json({ error: "Не указано слово" });
      return;
    }
    const [russian, images] = await Promise.all([
      translateToRussian(english),
      searchImages(english, unsplashAccessKey),
    ]);
    res.json({
      english,
      russian,
      imageUrl: images[0] ?? null,
      imageCandidates: images,
    });
  });

  router.post("/", (req, res) => {
    const body = req.body ?? {};
    const deckId = typeof body.deckId === "string" ? body.deckId : "";
    const english = typeof body.english === "string" ? body.english.trim() : "";
    const russian = typeof body.russian === "string" ? body.russian.trim() : "";
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;

    const deck = getDeck(db, deckId);
    if (!deck) {
      res.status(404).json({ error: "Колода не найдена" });
      return;
    }
    if (deck.is_builtin) {
      res.status(403).json({ error: BUILTIN_READONLY });
      return;
    }
    if (!english || !russian) {
      res.status(400).json({ error: "Нужны английское слово и перевод" });
      return;
    }

    res.status(201).json({ word: createWord(db, { deckId, english, russian, imageUrl }) });
  });

  router.put("/:id", (req, res) => {
    const word = getWord(db, req.params.id);
    if (!word) {
      res.status(404).json({ error: "Слово не найдено" });
      return;
    }
    const deck = getDeck(db, word.deck_id);
    if (deck?.is_builtin) {
      res.status(403).json({ error: BUILTIN_READONLY });
      return;
    }
    const body = req.body ?? {};
    const updated = updateWord(db, req.params.id, {
      english: typeof body.english === "string" ? body.english.trim() : undefined,
      russian: typeof body.russian === "string" ? body.russian.trim() : undefined,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
    });
    res.json({ word: updated });
  });

  router.delete("/:id", (req, res) => {
    const word = getWord(db, req.params.id);
    if (!word) {
      res.status(404).json({ error: "Слово не найдено" });
      return;
    }
    const deck = getDeck(db, word.deck_id);
    if (deck?.is_builtin) {
      res.status(403).json({ error: BUILTIN_READONLY });
      return;
    }
    deleteWord(db, req.params.id);
    res.status(204).end();
  });

  // Скопировать слово из встроенной (или любой) колоды в свою
  router.post("/:id/copy", (req, res) => {
    const source = getWord(db, req.params.id);
    if (!source) {
      res.status(404).json({ error: "Слово не найдено" });
      return;
    }
    const targetDeckId =
      typeof req.body?.targetDeckId === "string" ? req.body.targetDeckId : "";
    const target = getDeck(db, targetDeckId);
    if (!target) {
      res.status(404).json({ error: "Целевая колода не найдена" });
      return;
    }
    if (target.is_builtin) {
      res.status(403).json({ error: BUILTIN_READONLY });
      return;
    }
    const word = createWord(db, {
      deckId: targetDeckId,
      english: source.english,
      russian: source.russian,
      transcription: source.transcription,
      exampleSentence: source.example_sentence,
      imageUrl: source.image_url,
    });
    res.status(201).json({ word });
  });

  return router;
}
