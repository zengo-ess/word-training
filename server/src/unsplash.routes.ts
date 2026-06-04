import { Router } from "express";
import { searchImages } from "./services/unsplash.js";

export function createUnsplashRouter(unsplashAccessKey: string): Router {
  const router = Router();

  router.get("/search", async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    if (!query) {
      res.status(400).json({ error: "Не указан поисковый запрос" });
      return;
    }
    res.json({ images: await searchImages(query, unsplashAccessKey) });
  });

  return router;
}
