/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { buildChoices, buildQueue, shuffle } from "../trainerLogic";
import type { Word } from "../../../api/types";

function makeWord(id: string, foreignWord: string, nativeWord: string, hasExample = true): Word {
  return {
    id,
    deck_id: "d1",
    foreign_word: foreignWord,
    native_word: nativeWord,
    transcription: null,
    example_sentence: hasExample ? `I see a ___ today.` : null,
    image_url: null,
    audio_url: null,
    created_at: "x",
  };
}

const POOL: Word[] = [
  makeWord("1", "apple", "яблоко"),
  makeWord("2", "book", "книга"),
  makeWord("3", "car", "машина"),
  makeWord("4", "dog", "собака"),
];

describe("buildChoices", () => {
  it("возвращает 4 варианта, включая правильный (lang=ru)", () => {
    const { opts, correct } = buildChoices(POOL[0], POOL, "ru");
    expect(opts).toHaveLength(4);
    expect(opts).toContain(correct);
    expect(correct).toBe("яблоко");
  });

  it("возвращает 4 варианта для lang=en", () => {
    const { opts, correct } = buildChoices(POOL[0], POOL, "en");
    expect(opts).toHaveLength(4);
    expect(correct).toBe("apple");
  });
});

describe("buildQueue", () => {
  it("включает все слова для типа 1", () => {
    const q = buildQueue(POOL, 1);
    expect(q).toHaveLength(4);
  });

  it("пропускает тип 3 для слов без примера", () => {
    const mixed = [makeWord("a", "hi", "привет", false), makeWord("b", "bye", "пока", true)];
    const q = buildQueue(mixed, 3);
    expect(q).toHaveLength(1);
    expect(q[0]).toBe("b");
  });
});

describe("shuffle", () => {
  it("возвращает массив той же длины", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr)).toHaveLength(5);
  });

  it("не мутирует оригинал", () => {
    const arr = [1, 2, 3];
    shuffle(arr);
    expect(arr).toEqual([1, 2, 3]);
  });
});
