import { Router, raw } from "express";
import type Database from "better-sqlite3";
import type { AuthedRequest } from "../auth/auth.middleware.js";
import { getDeck, canAccessDeck } from "../decks/decks.repository.js";
import { createWord, getWord, updateWord, deleteWord } from "./words.repository.js";
import { translateToRussian, translateFromRussian } from "../services/mymemory.js";
import { fetchTranscription } from "../services/dictionary.js";
import { searchImages } from "../services/unsplash.js";
import { synthesizeMp3 } from "../services/googleTts.js";
import { saveAudioFile, deleteAudioFile } from "../services/audioStorage.js";
import { saveUploadedImage, IMAGE_EXT_BY_MIME } from "../services/imageStorage.js";

const BUILTIN_READONLY = "Встроенная колода доступна только для чтения";
const TTS_LANGUAGE_CODE: Record<string, string> = { en: "en-US", de: "de-DE" };

export interface WordsRouterDeps {
  unsplashAccessKey: string;
  googleTtsApiKey: string;
  uploadsDir: string;
}

export function createWordsRouter(db: Database.Database, deps: WordsRouterDeps): Router {
  const router = Router();

  // Авто-черновик: перевод + картинки, без сохранения.
  // Если ввели кириллицу — считаем, что это русское слово, и ищем в обратную
  // сторону (переводим на изучаемый язык), а не как есть.
  router.post("/lookup", async (req, res) => {
    const input = typeof req.body?.foreignWord === "string" ? req.body.foreignWord.trim() : "";
    const language = typeof req.body?.language === "string" ? req.body.language : "en";
    if (!input) {
      res.status(400).json({ error: "Не указано слово" });
      return;
    }

    const isRussianInput = /[а-яё]/i.test(input);
    let foreignWord: string;
    let nativeWord: string;
    if (isRussianInput) {
      nativeWord = input;
      foreignWord = (await translateFromRussian(input, language)) || input;
    } else {
      foreignWord = input;
      nativeWord = await translateToRussian(input, language);
    }

    const [images, transcription] = await Promise.all([
      searchImages(foreignWord, deps.unsplashAccessKey),
      fetchTranscription(foreignWord, language),
    ]);
    res.json({
      foreignWord,
      nativeWord,
      imageUrl: images[0] ?? null,
      imageCandidates: images,
      transcription,
    });
  });

  // Загрузка своей картинки: тело запроса — сырые байты файла, Content-Type — mime картинки
  router.post(
    "/upload-image",
    raw({ type: Object.keys(IMAGE_EXT_BY_MIME), limit: "8mb" }),
    (req: AuthedRequest, res) => {
      if (!(req.body instanceof Buffer) || req.body.length === 0) {
        res.status(400).json({ error: "Не указан файл картинки" });
        return;
      }
      const contentType = req.headers["content-type"] ?? "";
      const imageUrl = saveUploadedImage(deps.uploadsDir, contentType, req.body);
      if (!imageUrl) {
        res.status(400).json({ error: "Поддерживаются только JPEG, PNG и WebP" });
        return;
      }
      res.status(201).json({ imageUrl });
    },
  );

  router.post("/", async (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const body = req.body ?? {};
    const deckId = typeof body.deckId === "string" ? body.deckId : "";
    const foreignWord = typeof body.foreignWord === "string" ? body.foreignWord.trim() : "";
    const nativeWord = typeof body.nativeWord === "string" ? body.nativeWord.trim() : "";
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;
    const transcription =
      typeof body.transcription === "string" && body.transcription.trim() ? body.transcription.trim() : null;

    const deck = getDeck(db, deckId);
    if (!deck || !canAccessDeck(deck, userId)) {
      res.status(404).json({ error: "Колода не найдена" });
      return;
    }
    if (deck.is_builtin) {
      res.status(403).json({ error: BUILTIN_READONLY });
      return;
    }
    if (!foreignWord || !nativeWord) {
      res.status(400).json({ error: "Нужны слово и перевод" });
      return;
    }

    const word = createWord(db, { deckId, foreignWord, nativeWord, imageUrl, transcription });

    // Озвучка опциональна: при отсутствии ключа/ошибке слово остаётся без аудио
    let finalWord = word;
    try {
      const languageCode = TTS_LANGUAGE_CODE[deck.language] ?? "en-US";
      const mp3 = await synthesizeMp3(foreignWord, languageCode, deps.googleTtsApiKey);
      if (mp3) {
        const audioUrl = saveAudioFile(deps.uploadsDir, word.id, mp3);
        finalWord = updateWord(db, word.id, { audioUrl }) ?? word;
      }
    } catch {
      // молча оставляем слово без озвучки
    }

    res.status(201).json({ word: finalWord });
  });

  router.put("/:id", (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const word = getWord(db, req.params.id);
    if (!word) {
      res.status(404).json({ error: "Слово не найдено" });
      return;
    }
    const deck = getDeck(db, word.deck_id);
    if (!deck || !canAccessDeck(deck, userId)) {
      res.status(404).json({ error: "Слово не найдено" });
      return;
    }
    if (deck.is_builtin) {
      res.status(403).json({ error: BUILTIN_READONLY });
      return;
    }
    const body = req.body ?? {};
    const updated = updateWord(db, req.params.id, {
      foreignWord: typeof body.foreignWord === "string" ? body.foreignWord.trim() : undefined,
      nativeWord: typeof body.nativeWord === "string" ? body.nativeWord.trim() : undefined,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
    });
    res.json({ word: updated });
  });

  router.delete("/:id", (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const word = getWord(db, req.params.id);
    if (!word) {
      res.status(404).json({ error: "Слово не найдено" });
      return;
    }
    const deck = getDeck(db, word.deck_id);
    if (!deck || !canAccessDeck(deck, userId)) {
      res.status(404).json({ error: "Слово не найдено" });
      return;
    }
    if (deck.is_builtin) {
      res.status(403).json({ error: BUILTIN_READONLY });
      return;
    }
    deleteWord(db, req.params.id);
    deleteAudioFile(deps.uploadsDir, req.params.id);
    res.status(204).end();
  });

  // Скопировать слово из встроенной (или любой) колоды в свою
  router.post("/:id/copy", (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const source = getWord(db, req.params.id);
    if (!source) {
      res.status(404).json({ error: "Слово не найдено" });
      return;
    }
    const targetDeckId =
      typeof req.body?.targetDeckId === "string" ? req.body.targetDeckId : "";
    const target = getDeck(db, targetDeckId);
    if (!target || !canAccessDeck(target, userId)) {
      res.status(404).json({ error: "Целевая колода не найдена" });
      return;
    }
    if (target.is_builtin) {
      res.status(403).json({ error: BUILTIN_READONLY });
      return;
    }
    const word = createWord(db, {
      deckId: targetDeckId,
      foreignWord: source.foreign_word,
      nativeWord: source.native_word,
      transcription: source.transcription,
      exampleSentence: source.example_sentence,
      imageUrl: source.image_url,
      audioUrl: source.audio_url,
    });
    res.status(201).json({ word });
  });

  return router;
}
