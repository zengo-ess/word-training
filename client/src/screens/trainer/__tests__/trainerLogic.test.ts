/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi } from "vitest";
import { availableTypes, buildChoices, buildQueue, shuffle, shuffleQueue } from "../trainerLogic";
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

describe("перемешивание между этапами", () => {
  it("случайное совпадение порядка заменяет другим, не теряя слова", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.999);
    try {
      const ids = ["a", "b", "c", "d"];
      const previous = [...ids];
      const result = shuffleQueue(ids, previous);
      expect(result).not.toEqual(previous);
      expect([...result].sort()).toEqual(ids);
      expect(ids).toEqual(["a", "b", "c", "d"]);
      expect(previous).toEqual(ids);
    } finally { random.mockRestore(); }
  });

  it("перемешивает и первый этап", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      expect(shuffleQueue(["a", "b", "c"])).toEqual(["b", "c", "a"]);
    } finally { random.mockRestore(); }
  });

  it("не зацикливается на одном слове или пустой очереди", () => {
    expect(shuffleQueue(["a"], ["a"])).toEqual(["a"]);
    expect(shuffleQueue([], [])).toEqual([]);
  });
});

describe("buildQueue и озвучка", () => {
  it("при выключенной озвучке тип 5 недоступен", () => {
    expect(buildQueue(POOL, 5, false)).toEqual([]);
  });

  it("при включённой озвучке тип 5 берёт весь батч", () => {
    expect(buildQueue(POOL, 5, true)).toHaveLength(POOL.length);
  });

  it("озвучка не влияет на остальные типы", () => {
    expect(buildQueue(POOL, 1, false)).toHaveLength(POOL.length);
    expect(buildQueue(POOL, 4, false)).toHaveLength(POOL.length);
  });
});

describe("availableTypes", () => {
  it("даже при наличии примеров скрытый тип 3 не попадает в последовательность", () => {
    expect(availableTypes(POOL, true)).toEqual([1, 2, 4, 5]);
  });

  it("без озвучки шага 5 нет", () => {
    expect(availableTypes(POOL, false)).toEqual([1, 2, 4]);
  });

  it("без примеров нет шага 3", () => {
    const noExamples = [makeWord("a", "hi", "привет", false)];
    expect(availableTypes(noExamples, true)).toEqual([1, 2, 4, 5]);
  });

  it("без примеров и без озвучки остаются шаги 1, 2 и 4", () => {
    const noExamples = [makeWord("a", "hi", "привет", false)];
    expect(availableTypes(noExamples, false)).toEqual([1, 2, 4]);
  });
});
