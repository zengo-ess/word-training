# Frontend: New-Words Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать тренажёр новых слов (5 типов упражнений: MCQ EN→RU, MCQ RU→EN, вставить пропуск, собрать из букв, аудио MCQ), батч до 20 слов, слоевая логика с накоплением ошибок, сохранение прогресса через `POST /api/training/result`.

**Architecture:** Три слоя: (1) `trainingApi.ts` — HTTP-клиент; (2) `trainerLogic.ts` — чистые функции (`buildChoices`, `buildQueue`, shuffle); (3) `TrainerScreen.tsx` — полноэкранный оверлей со всеми упражнениями внутри. AppShell при `onLearn` загружает батч и открывает TrainerScreen. Прогресс сохраняется после прохождения всех 5 типов: `mode:"learned"` для каждого слова.

**Tech Stack:** React 18, TS, vitest + @testing-library/react, vi.useFakeTimers для тестов с таймерами.

**Источники истины:** `docs/design/handoff/app/trainer.jsx`, `docs/design/handoff/app/exercises.jsx`, `server/src/training/training.routes.ts`.

---

## File Structure

```
client/src/
  api/trainingApi.ts                           # НОВЫЙ: fetchTodayTraining, postResult
  api/__tests__/trainingApi.test.ts            # НОВЫЙ
  screens/trainer/trainerLogic.ts              # НОВЫЙ: buildChoices, buildQueue, shuffle
  screens/trainer/__tests__/trainerLogic.test.ts # НОВЫЙ
  screens/TrainerScreen.tsx                    # НОВЫЙ: полный тренажёр
  screens/__tests__/TrainerScreen.test.tsx     # НОВЫЙ
  AppShell.tsx                                 # МОДИФИЦ.: wire onLearn
```

**Конвенции:** только `import`; тест-файлы с двумя eslint-disable; НЕ интеграционные тесты; НЕ тестируем `displayName`; коммит в `main`.

---

### Task 1: trainingApi

**Files:**
- Create: `client/src/api/trainingApi.ts`
- Test: `client/src/api/__tests__/trainingApi.test.ts`

- [ ] **Step 1: Создать тест `client/src/api/__tests__/trainingApi.test.ts`**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import { fetchTodayTraining, postTrainingResult } from "../trainingApi";

function mockFetch(body: unknown): typeof fetch {
  return (async (_url: string, _init?: RequestInit) => ({
    ok: true,
    status: 200,
    json: async () => body,
  })) as unknown as typeof fetch;
}

function captureFetch(body: unknown): { captured: { url: string; init: RequestInit }; fn: typeof fetch } {
  const captured = { url: "", init: {} as RequestInit };
  const fn = (async (url: string, init: RequestInit) => {
    captured.url = url;
    captured.init = init;
    return { ok: true, status: 200, json: async () => body };
  }) as unknown as typeof fetch;
  return { captured, fn };
}

const WORD = { id: "w1", deck_id: "d1", english: "apple", russian: "яблоко", transcription: null, example_sentence: null, image_url: null, audio_url: null, created_at: "x" };

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("wt_token", "T");
});

describe("trainingApi", () => {
  it("fetchTodayTraining возвращает newWords и reviewWords", async () => {
    const result = await fetchTodayTraining(
      mockFetch({ newWords: [{ word: WORD, currentType: 1 }], reviewWords: [] }),
    );
    expect(result.newWords).toHaveLength(1);
    expect(result.newWords[0].word.english).toBe("apple");
    expect(result.reviewWords).toHaveLength(0);
  });

  it("postTrainingResult шлёт learned с нужным телом", async () => {
    const { captured, fn } = captureFetch({ progress: {} });
    await postTrainingResult("w1", "learned", undefined, fn);
    expect(captured.url).toBe("/api/training/result");
    const body = JSON.parse(captured.init.body as string) as Record<string, unknown>;
    expect(body.wordId).toBe("w1");
    expect(body.mode).toBe("learned");
  });

  it("postTrainingResult шлёт step с currentType", async () => {
    const { captured, fn } = captureFetch({ progress: {} });
    await postTrainingResult("w1", "step", 2, fn);
    const body = JSON.parse(captured.init.body as string) as Record<string, unknown>;
    expect(body.mode).toBe("step");
    expect(body.currentType).toBe(2);
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

```bash
cd /Users/zengo/Projects/other/word-training/client && npx vitest run src/api/__tests__/trainingApi.test.ts 2>&1 | tail -10
```

- [ ] **Step 3: Создать `client/src/api/trainingApi.ts`**

```ts
import { apiRequest } from "./http";
import { getToken } from "../auth/token";
import type { Word, Progress } from "./types";

export interface LearnableWord {
  word: Word;
  currentType: number;
}

export interface DueReview {
  word: Word;
  progress: Progress;
}

export interface TodayTraining {
  newWords: LearnableWord[];
  reviewWords: DueReview[];
}

export async function fetchTodayTraining(fetchFn: typeof fetch = fetch): Promise<TodayTraining> {
  return apiRequest<TodayTraining>("/api/training/today", { token: getToken() }, fetchFn);
}

export async function postTrainingResult(
  wordId: string,
  mode: "step" | "learned",
  currentType?: number,
  fetchFn: typeof fetch = fetch,
): Promise<{ progress: Progress }> {
  return apiRequest<{ progress: Progress }>(
    "/api/training/result",
    {
      method: "POST",
      body: currentType !== undefined ? { wordId, mode, currentType } : { wordId, mode },
      token: getToken(),
    },
    fetchFn,
  );
}
```

- [ ] **Step 4: Запустить — PASS (3). Полный прогон + tsc**

```bash
cd /Users/zengo/Projects/other/word-training/client && npx vitest run src/api/__tests__/trainingApi.test.ts 2>&1 | tail -5
npm test 2>&1 | tail -5
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd /Users/zengo/Projects/other/word-training
git add client/src/api/trainingApi.ts client/src/api/__tests__/trainingApi.test.ts
git commit -m "Добавить trainingApi: загрузка батча и запись результата"
```

---

### Task 2: trainerLogic (чистые функции)

**Files:**
- Create: `client/src/screens/trainer/trainerLogic.ts`
- Test: `client/src/screens/trainer/__tests__/trainerLogic.test.ts`

- [ ] **Step 1: Создать директорию и тест `client/src/screens/trainer/__tests__/trainerLogic.test.ts`**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { buildChoices, buildQueue, shuffle } from "../trainerLogic";
import type { Word } from "../../../api/types";

function makeWord(id: string, english: string, russian: string, hasExample = true): Word {
  return {
    id,
    deck_id: "d1",
    english,
    russian,
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
```

- [ ] **Step 2: Запустить — FAIL**

```bash
cd /Users/zengo/Projects/other/word-training/client && npx vitest run "src/screens/trainer/__tests__/trainerLogic.test.ts" 2>&1 | tail -10
```

- [ ] **Step 3: Создать `client/src/screens/trainer/trainerLogic.ts`**

```ts
import type { Word } from "../../api/types";

export function shuffle<T>(arr: T[]): T[] {
  const r = [...arr];
  for (let i = r.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export function buildChoices(
  word: Word,
  pool: Word[],
  lang: "ru" | "en",
): { opts: string[]; correct: string } {
  const field = lang === "ru" ? "russian" : "english";
  const correct = word[field] as string;
  const others = [...new Set(pool.filter((w) => w.id !== word.id).map((w) => w[field] as string))];
  const picks: string[] = [];
  const shuffled = shuffle(others);
  for (const o of shuffled) {
    if (picks.length >= 3) break;
    if (o !== correct) picks.push(o);
  }
  while (picks.length < 3) picks.push(["—", "...", "???"][picks.length] ?? "—");
  const opts = shuffle([...picks, correct]);
  return { opts, correct };
}

export function buildQueue(batch: Word[], type: number): string[] {
  return batch.filter((w) => type !== 3 || w.example_sentence != null).map((w) => w.id);
}
```

- [ ] **Step 4: Запустить — PASS (6). Полный прогон + tsc**

```bash
cd /Users/zengo/Projects/other/word-training/client && npx vitest run "src/screens/trainer/__tests__/trainerLogic.test.ts" 2>&1 | tail -5
npm test 2>&1 | tail -5
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd /Users/zengo/Projects/other/word-training
git add client/src/screens/trainer/trainerLogic.ts \
        "client/src/screens/trainer/__tests__/trainerLogic.test.ts"
git commit -m "Добавить логику тренажёра: buildChoices, buildQueue, shuffle"
```

---

### Task 3: TrainerScreen

**Files:**
- Create: `client/src/screens/TrainerScreen.tsx`
- Test: `client/src/screens/__tests__/TrainerScreen.test.tsx`

- [ ] **Step 1: Создать тест `client/src/screens/__tests__/TrainerScreen.test.tsx`**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrainerScreen } from "../TrainerScreen";
import type { Word } from "../../api/types";

const postResultMock = vi.fn();
vi.mock("../../api/trainingApi", () => ({
  postTrainingResult: (...args: unknown[]) => postResultMock(...args),
}));

vi.mock("../../screens/trainer/trainerLogic", async (importOriginal) => {
  const real = await importOriginal<typeof import("../trainer/trainerLogic")>();
  return {
    ...real,
    shuffle: (a: unknown[]) => [...a],
  };
});

const WORD: Word = {
  id: "w1",
  deck_id: "d1",
  english: "apple",
  russian: "яблоко",
  transcription: null,
  example_sentence: null,
  image_url: null,
  audio_url: null,
  created_at: "x",
};

const POOL: Word[] = [
  WORD,
  { ...WORD, id: "w2", english: "book", russian: "книга" },
  { ...WORD, id: "w3", english: "car", russian: "машина" },
  { ...WORD, id: "w4", english: "dog", russian: "собака" },
];

beforeEach(() => {
  postResultMock.mockReset();
  postResultMock.mockResolvedValue({ progress: {} });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TrainerScreen", () => {
  it("показывает MCQ с вариантами ответов для типа 1", () => {
    render(<TrainerScreen batch={POOL} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText("яблоко")).toBeInTheDocument();
    expect(screen.getByText("apple")).toBeInTheDocument();
  });

  it("нажатие X вызывает onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<TrainerScreen batch={POOL} onClose={onClose} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /закрыть/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("показывает экран завершения для пустого батча", () => {
    render(<TrainerScreen batch={[]} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText(/Батч выучен/i)).toBeInTheDocument();
  });

  it("клик по правильному ответу показывает Верно и записывает прогресс", async () => {
    const onDone = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    render(<TrainerScreen batch={[WORD]} onClose={vi.fn()} onDone={onDone} />);

    const correctBtn = screen.getByRole("button", { name: "яблоко" });
    await user.click(correctBtn);
    expect(screen.getByText("Верно!")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce(), { timeout: 3000 });
    expect(postResultMock).toHaveBeenCalledWith("w1", "learned", undefined, undefined);
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

```bash
cd /Users/zengo/Projects/other/word-training/client && npx vitest run src/screens/__tests__/TrainerScreen.test.tsx 2>&1 | tail -15
```

- [ ] **Step 3: Создать `client/src/screens/TrainerScreen.tsx`**

```tsx
import { useState, useEffect, useMemo } from "react";
import { postTrainingResult } from "../api/trainingApi";
import { buildChoices, buildQueue, shuffle } from "./trainer/trainerLogic";
import { Icon } from "../components/Icon";
import { IconBtn } from "../components/IconBtn";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { WordTile } from "../components/WordTile";
import { hueFromString } from "../lib/wordVisual";
import type { Word } from "../api/types";

// ---- helpers ----

const EX_NAMES: Record<number, string> = {
  1: "Перевод EN→RU",
  2: "Перевод RU→EN",
  3: "Вставь пропуск",
  4: "Собери из букв",
  5: "Аудио",
};

// ---- SegBar ----

function SegBar({ total, done }: { total: number; done: number }) {
  return (
    <div style={{ display: "flex", gap: 4, flex: 1 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 6,
            borderRadius: 99,
            background: i < done ? "var(--primary)" : "var(--track, var(--line))",
            transition: "background 0.3s",
          }}
        />
      ))}
    </div>
  );
}

// ---- FeedbackBar ----

function FeedbackBar({ kind, word }: { kind: "correct" | "wrong"; word: Word }) {
  const ok = kind === "correct";
  return (
    <div
      className="fb-enter"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 30,
        zIndex: 80,
        background: ok ? "var(--success)" : "var(--danger)",
        borderRadius: 18,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 12px 30px -8px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={ok ? "check" : "x"} size={20} color="#fff" stroke={3} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15.5, fontWeight: 800, color: "#fff" }}>{ok ? "Верно!" : "Почти!"}</div>
        {!ok ? (
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
            {word.english} — {word.russian}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ---- TrainerDone ----

function TrainerDone({ count, onDone }: { count: number; onDone: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg)",
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 30,
        textAlign: "center",
      }}
    >
      <div
        className="pop"
        style={{
          width: 110,
          height: 110,
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--primary), var(--primary-2, var(--primary)))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          boxShadow: "0 18px 40px -12px var(--primary-glow, rgba(0,0,0,0.2))",
        }}
      >
        <Icon name="trophy" size={54} color="#fff" stroke={2} />
      </div>
      <h1
        style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--ink)", margin: "0 0 8px" }}
      >
        Батч выучен! 🎉
      </h1>
      <p
        style={{
          fontSize: 15.5,
          fontWeight: 600,
          color: "var(--ink-soft)",
          margin: "0 0 6px",
          lineHeight: 1.5,
          maxWidth: 280,
        }}
      >
        {count} слов прошли все 5 типов и отправились в умное повторение.
      </p>
      <div style={{ display: "flex", gap: 8, margin: "14px 0 28px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--success-soft, #dcfce7)",
            color: "var(--success, #16a34a)",
            borderRadius: 99,
            padding: "5px 12px",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <Icon name="refresh" size={14} color="var(--success, #16a34a)" stroke={2.4} />
          Повтор через 1 день
        </div>
      </div>
      <Button full variant="primary" icon="sparkles" onClick={onDone}>
        Готово
      </Button>
    </div>
  );
}

// ---- MCQ ----

function MCQ({
  word,
  pool,
  lang,
  answered,
  onResult,
  children,
}: {
  word: Word;
  pool: Word[];
  lang: "ru" | "en";
  answered: "correct" | "wrong" | null;
  onResult: (correct: boolean) => void;
  children?: React.ReactNode;
}) {
  const { opts, correct } = useMemo(() => buildChoices(word, pool, lang), [word.id, lang]);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    setPicked(null);
  }, [word.id, lang]);

  function choose(o: string) {
    if (answered || picked) return;
    setPicked(o);
    onResult(o === correct);
  }

  return (
    <>
      {children}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: lang === "en" ? "1fr 1fr" : "1fr",
          gap: 10,
          marginTop: "auto",
        }}
      >
        {opts.map((o, i) => {
          let state: "idle" | "correct" | "wrong" | "dim" = "idle";
          if (picked) {
            if (o === correct) state = "correct";
            else if (o === picked) state = "wrong";
            else state = "dim";
          }
          const styles = {
            idle: { background: "var(--surface)", color: "var(--ink)", boxShadow: "var(--shadow-sm)" },
            correct: {
              background: "var(--success-soft, #dcfce7)",
              color: "var(--success-ink, #15803d)",
              boxShadow: "inset 0 0 0 2px var(--success, #16a34a)",
            },
            wrong: {
              background: "var(--danger-soft, #fee2e2)",
              color: "var(--danger-ink, #b91c1c)",
              boxShadow: "inset 0 0 0 2px var(--danger, #ef4444)",
            },
            dim: { background: "var(--surface)", color: "var(--ink-mute)", opacity: 0.5 },
          }[state];
          return (
            <button
              key={i}
              className={picked ? "" : "btn-press"}
              onClick={() => choose(o)}
              style={{
                border: "none",
                cursor: picked ? "default" : "pointer",
                borderRadius: "var(--r-btn)",
                padding: "17px 16px",
                fontSize: 17,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all .2s",
                minHeight: 58,
                ...styles,
              }}
            >
              {state === "correct" ? <Icon name="check" size={18} stroke={3} /> : null}
              {state === "wrong" ? <Icon name="x" size={18} stroke={3} /> : null}
              {o}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ---- FillGap ----

function FillGap({
  word,
  answered,
  onResult,
}: {
  word: Word;
  answered: "correct" | "wrong" | null;
  onResult: (correct: boolean) => void;
}) {
  const [val, setVal] = useState("");
  const [locked, setLocked] = useState(false);
  const parts = (word.example_sentence ?? "___").split("___");

  useEffect(() => {
    setVal("");
    setLocked(false);
  }, [word.id]);

  function check() {
    if (locked || !val.trim()) return;
    setLocked(true);
    onResult(val.trim().toLowerCase() === word.english.toLowerCase());
  }

  return (
    <>
      <div
        style={{
          textAlign: "center",
          fontSize: 14,
          fontWeight: 700,
          color: "var(--ink-mute)",
          marginBottom: 18,
        }}
      >
        Вставьте пропущенное слово
      </div>
      <Card pad={18} style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 19, fontWeight: 600, color: "var(--ink)", lineHeight: 1.6 }}>
          {parts[0]}
          <span
            style={{
              display: "inline-flex",
              minWidth: 70,
              borderBottom: "3px solid var(--primary)",
              textAlign: "center",
              color: "var(--primary)",
              fontWeight: 800,
              justifyContent: "center",
              padding: "0 6px",
            }}
          >
            {val || " "}
          </span>
          {parts[1]}
        </div>
        <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600, color: "var(--ink-mute)" }}>
          = {word.russian}
        </div>
      </Card>
      <input
        autoFocus
        value={val}
        disabled={locked}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") check();
        }}
        placeholder="введите слово…"
        style={{
          width: "100%",
          boxSizing: "border-box",
          fontSize: 18,
          fontWeight: 700,
          color: "var(--ink)",
          background: "var(--surface)",
          border: "2px solid var(--line)",
          borderRadius: "var(--r-btn)",
          padding: "15px 16px",
          outline: "none",
          marginBottom: 14,
        }}
      />
      <Button
        full
        variant="primary"
        onClick={check}
        disabled={!val.trim() || locked}
        style={{ marginTop: "auto" }}
      >
        Проверить
      </Button>
    </>
  );
}

// ---- Assemble ----

interface Tile {
  ch: string;
  id: number;
}

function Assemble({
  word,
  onResult,
}: {
  word: Word;
  answered: "correct" | "wrong" | null;
  onResult: (correct: boolean) => void;
}) {
  const target = word.english;
  const initial = useMemo(() => {
    let s = shuffle(target.split("")).map((ch, i): Tile => ({ ch, id: i }));
    if (s.map((t) => t.ch).join("") === target && target.length > 1) {
      s = shuffle(s);
    }
    return s;
  }, [word.id]);

  const [bank, setBank] = useState<Tile[]>(initial);
  const [slots, setSlots] = useState<Tile[]>([]);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setBank(initial);
    setSlots([]);
    setLocked(false);
  }, [word.id]);

  useEffect(() => {
    if (!locked && slots.length === target.length && slots.length > 0) {
      const guess = slots.map((t) => t.ch).join("");
      setLocked(true);
      setTimeout(() => onResult(guess.toLowerCase() === target.toLowerCase()), 250);
    }
  }, [slots]);

  function place(tile: Tile) {
    if (locked) return;
    setBank((b) => b.filter((t) => t.id !== tile.id));
    setSlots((s) => [...s, tile]);
  }

  function remove(tile: Tile) {
    if (locked) return;
    setSlots((s) => s.filter((t) => t.id !== tile.id));
    setBank((b) => [...b, tile]);
  }

  return (
    <>
      <div
        style={{
          textAlign: "center",
          fontSize: 14,
          fontWeight: 700,
          color: "var(--ink-mute)",
          marginBottom: 18,
        }}
      >
        Соберите слово из букв
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <WordTile icon="book" hue={hueFromString(word.english)} size={120} />
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 17,
          fontWeight: 700,
          color: "var(--primary)",
          marginBottom: 16,
        }}
      >
        {word.russian}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 7,
          minHeight: 56,
          marginBottom: 4,
          padding: 12,
          background: "var(--surface-2)",
          borderRadius: 16,
        }}
      >
        {slots.length === 0 ? (
          <span
            style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-mute)", alignSelf: "center" }}
          >
            нажимайте на буквы ниже
          </span>
        ) : null}
        {slots.map((t) => (
          <button
            key={t.id}
            onClick={() => remove(t)}
            className="tile-pop"
            style={{
              border: "none",
              cursor: "pointer",
              width: 40,
              height: 46,
              borderRadius: 11,
              background: "var(--primary)",
              color: "var(--on-primary, #fff)",
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 700,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {t.ch}
          </button>
        ))}
      </div>
      <div style={{ height: 28 }} />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 8,
          marginTop: "auto",
        }}
      >
        {bank.map((t) => (
          <button
            key={t.id}
            onClick={() => place(t)}
            className="btn-press"
            style={{
              border: "none",
              cursor: "pointer",
              width: 46,
              height: 52,
              borderRadius: 13,
              background: "var(--surface)",
              color: "var(--ink)",
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 700,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {t.ch}
          </button>
        ))}
      </div>
    </>
  );
}

// ---- Exercise dispatcher ----

function Exercise({
  layer,
  word,
  pool,
  answered,
  onResult,
}: {
  layer: number;
  word: Word;
  pool: Word[];
  answered: "correct" | "wrong" | null;
  onResult: (correct: boolean) => void;
}) {
  if (layer === 1)
    return (
      <MCQ word={word} pool={pool} lang="ru" answered={answered} onResult={onResult}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            {word.image_url ? (
              <img
                src={word.image_url}
                alt=""
                style={{ width: 140, height: 140, borderRadius: "var(--r-tile)", objectFit: "cover" }}
              />
            ) : (
              <WordTile icon="book" hue={hueFromString(word.english)} size={140} photo />
            )}
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
            {word.english}
          </h2>
          {word.transcription ? (
            <div style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--ink-mute)", marginTop: 4 }}>
              {word.transcription}
            </div>
          ) : null}
        </div>
      </MCQ>
    );

  if (layer === 2)
    return (
      <MCQ word={word} pool={pool} lang="en" answered={answered} onResult={onResult}>
        <div style={{ textAlign: "center", marginBottom: 26, marginTop: 10 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--ink-mute)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            Переведите на английский
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
            {word.russian}
          </h2>
        </div>
      </MCQ>
    );

  if (layer === 3) return <FillGap word={word} answered={answered} onResult={onResult} />;

  if (layer === 4) return <Assemble word={word} answered={answered} onResult={onResult} />;

  if (layer === 5)
    return (
      <MCQ word={word} pool={pool} lang="ru" answered={answered} onResult={onResult}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <button
              className="btn-press"
              onClick={() => {
                try {
                  window.speechSynthesis.cancel();
                  const u = new SpeechSynthesisUtterance(word.english);
                  u.lang = "en-US";
                  u.rate = 0.9;
                  window.speechSynthesis.speak(u);
                } catch {
                  /* ignore */
                }
              }}
              style={{
                border: "none",
                cursor: "pointer",
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "var(--primary-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Icon name="volume-2" size={48} color="var(--primary)" stroke={2.2} />
            </button>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-mute)" }}>
            Нажмите, чтобы прослушать
          </div>
        </div>
      </MCQ>
    );

  return null;
}

// ---- TrainerScreen ----

interface Props {
  batch: Word[];
  onClose: () => void;
  onDone: () => void;
}

export function TrainerScreen({ batch, onClose, onDone }: Props) {
  const byId = useMemo(() => Object.fromEntries(batch.map((w) => [w.id, w])), [batch]);

  const [layer, setLayer] = useState(1);
  const [queue, setQueue] = useState(() => buildQueue(batch, 1));
  const [errors, setErrors] = useState<string[]>([]);
  const [passed, setPassed] = useState(0);
  const [target, setTarget] = useState(() => buildQueue(batch, 1).length);
  const [answered, setAnswered] = useState<"correct" | "wrong" | null>(null);
  const [done, setDone] = useState(false);

  const currentId = queue[0];
  const word = currentId != null ? byId[currentId] : undefined;

  function enterLayer(t: number) {
    let next = t;
    while (next <= 5) {
      const q = buildQueue(batch, next);
      if (q.length) {
        setLayer(next);
        setQueue(q);
        setErrors([]);
        setPassed(0);
        setTarget(q.length);
        return;
      }
      next += 1;
    }
    void Promise.all(batch.map((w) => postTrainingResult(w.id, "learned"))).then(onDone);
    setDone(true);
  }

  function handleResult(correct: boolean) {
    if (answered) return;
    setAnswered(correct ? "correct" : "wrong");
    setTimeout(
      () => {
        setAnswered(null);
        const [head, ...rest] = queue;
        if (correct) {
          const np = passed + 1;
          setPassed(np);
          if (np >= target) {
            enterLayer(layer + 1);
            return;
          }
          if (rest.length === 0 && errors.length > 0) {
            setQueue(shuffle(errors));
            setErrors([]);
          } else {
            setQueue(rest);
          }
        } else {
          const newErrors = [...errors, head];
          if (rest.length === 0) {
            setQueue(shuffle(newErrors));
            setErrors([]);
          } else {
            setQueue(rest);
            setErrors(newErrors);
          }
        }
      },
      correct ? 750 : 1050,
    );
  }

  if (done || batch.length === 0) return <TrainerDone count={batch.length} onDone={onDone} />;
  if (!word) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg)",
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* top bar */}
      <div style={{ paddingTop: 54, paddingLeft: 16, paddingRight: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <IconBtn name="x" aria-label="Закрыть" onClick={onClose} size={36} iconSize={18} />
          <SegBar total={target} done={passed} />
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
            {passed}/{target}
          </span>
        </div>
        {/* layer tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          {([1, 2, 3, 4, 5] as const).map((t) => {
            const active = t === layer;
            const doneL = t < layer;
            return (
              <div key={t} style={{ flex: 1 }}>
                <div
                  style={{
                    height: 32,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: active ? "var(--primary)" : doneL ? "var(--success-soft, #dcfce7)" : "var(--surface-2)",
                    color: active ? "var(--on-primary, #fff)" : doneL ? "var(--success, #16a34a)" : "var(--ink-mute)",
                  }}
                >
                  {doneL ? (
                    <Icon name="check" size={15} stroke={3} />
                  ) : (
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700 }}>{t}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            textAlign: "center",
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--ink-mute)",
            marginTop: 6,
          }}
        >
          {EX_NAMES[layer]}
        </div>
      </div>

      {/* exercise body */}
      <div
        key={`${layer}-${currentId}-${queue.length}`}
        className="ex-enter"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 18px 24px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Exercise layer={layer} word={word} pool={batch} answered={answered} onResult={handleResult} />
      </div>

      {answered ? <FeedbackBar kind={answered} word={word} /> : null}
    </div>
  );
}
```

- [ ] **Step 4: Запустить тест — должен PASS (4). Если тесты падают — разберись с причиной.**

Особые случаи:
- Тест "клик по правильному ответу..." — `shuffle` замокан (возвращает без перемешивания), поэтому правильный ответ всегда последний в opts. Слово `apple`/`яблоко` с 1 словом в батче: buildChoices вернёт 3 заглушки + "яблоко". После correct answer → `np = 1 >= target = 1` → `enterLayer(2)`. Для типа 2 buildQueue(["w1"], 2) = ["w1"]. Отвечаем верно → `enterLayer(3)`. Тип 3 пропускается (нет example_sentence). Тип 4 queue = ["w1"]. Тип 4 — `Assemble` компонент не MCQ — тест не взаимодействует с ним напрямую. Тест будет вызывать `onDone` после прохождения всех типов. Если тип 4 автоматически не завершается, нужно разобраться.

Если тест "клик по правильному ответу..." не может пройти type 4 (Assemble), измени тест: используй два слова или только проверяй что после type 1 правильный ответ вызывает переход. Адаптируй тест по результатам запуска.

```bash
cd /Users/zengo/Projects/other/word-training/client && npx vitest run src/screens/__tests__/TrainerScreen.test.tsx 2>&1 | tail -20
```

- [ ] **Step 5: Полный прогон + tsc**

```bash
cd /Users/zengo/Projects/other/word-training/client && npm test 2>&1 | tail -5 && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
cd /Users/zengo/Projects/other/word-training
git add client/src/screens/TrainerScreen.tsx \
        client/src/screens/__tests__/TrainerScreen.test.tsx
git commit -m "Добавить TrainerScreen с 5 типами упражнений"
```

---

### Task 4: Подключить тренажёр к AppShell

**Files:**
- Modify: `client/src/AppShell.tsx`

- [ ] **Step 1: Прочитать текущий `client/src/AppShell.tsx`**

- [ ] **Step 2: Обновить AppShell**

Добавь импорты и state для тренажёра. Текущий AppShell имеет `onLearn={() => { /* План 10 */ }}`. Обнови:

```tsx
// Добавить импорт:
import { TrainerScreen } from "./screens/TrainerScreen";
import { fetchTodayTraining } from "./api/trainingApi";
// Добавить тип Word уже есть в импорте: import type { Deck, WordWithProgress } from "./api/types";
// Добавить к нему: Word
```

Добавить state:
```tsx
const [trainerWords, setTrainerWords] = useState<import("./api/types").Word[] | null>(null);
```

Функция открытия тренажёра:
```tsx
const openTrainer = () => {
  void fetchTodayTraining().then(({ newWords }) => {
    if (newWords.length > 0) {
      setTrainerWords(newWords.map((lw) => lw.word));
    }
  });
};
```

Заменить все `onLearn={() => { /* План 10 */ }}` на `onLearn={openTrainer}` (в HomeScreen и DeckDetailScreen через AppShell).

Добавить рендер TrainerScreen (после оверлеев):
```tsx
{trainerWords ? (
  <TrainerScreen
    batch={trainerWords}
    onClose={() => setTrainerWords(null)}
    onDone={() => {
      setTrainerWords(null);
      setReloadKey((k) => k + 1);
    }}
  />
) : null}
```

- [ ] **Step 3: Полный прогон + tsc + build**

```bash
cd /Users/zengo/Projects/other/word-training/client && npm test 2>&1 | tail -5 && npx tsc --noEmit && npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
cd /Users/zengo/Projects/other/word-training
git add client/src/AppShell.tsx
git commit -m "Подключить тренажёр новых слов к AppShell"
```

---

## Self-Review

**Spec coverage:**
- Тип 1 (EN→RU): картинка/тайл + слово → 4 варианта перевода ✓
- Тип 2 (RU→EN): русское слово → 4 варианта EN ✓
- Тип 3 (вставить пропуск): example_sentence с ___ → текстовый ввод ✓; пропускается если нет примера ✓
- Тип 4 (буквы): перемешанные буквы → нажимаем по порядку ✓
- Тип 5 (аудио): кнопка произношения → 4 варианта RU ✓
- Батч = 20 слов (лимит из API) ✓
- Слоевая логика: сначала все тип 1, потом все тип 2... ✓
- Накопление ошибок: при ошибке → в errors; если queue пуст → shuffle(errors) ✓
- После type 5 → markLearned + SM-2 ✓
- SegBar прогресса ✓; таб-индикаторы типов ✓; FeedbackBar ✓

**Placeholder scan:** нет.

**Type consistency:** `Word` из `types.ts` используется везде. `buildChoices(word: Word, pool: Word[], lang)` → совпадает с MCQ. `buildQueue(batch: Word[], type: number) → string[]` → ids.
