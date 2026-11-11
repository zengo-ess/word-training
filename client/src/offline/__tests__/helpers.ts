import type { Deck, WordWithProgress } from "../../api/types";

export const deck: Deck = { id: "animals", name: "Животные", is_builtin: 0, language: "en", created_at: "x", total: 1, learned: 0 };
export const word: WordWithProgress = {
  id: "cat", deck_id: deck.id, foreign_word: "cat", native_word: "кошка", transcription: "/kæt/",
  example_sentence: "The cat is on the bed.", image_url: "/uploads/cat.webp", audio_url: "/uploads/cat.mp3", created_at: "x", progress: null,
};

export function memoryCaches() {
  const maps = new Map<string, Map<string, Response>>();
  return {
    maps,
    async open(name: string) {
      if (!maps.has(name)) maps.set(name, new Map());
      const map = maps.get(name)!;
      return {
        async put(url: string, response: Response) { map.set(url, response.clone()); },
        async match(url: string) { return map.get(url)?.clone(); },
      };
    },
    async delete(name: string) { return maps.delete(name); },
    async keys() { return [...maps.keys()]; },
  };
}
