# Frontend: Spaced-Repetition Review Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Режим повторений: выбор направления (EN→RU / RU→EN / оба), упражнения только типов 1/2, запись результата каждого ответа через `POST /api/training/result` с `mode:"review"`, экран итогов.

**Architecture:** (1) `trainingApi.ts` дополняется `postReviewResult(wordId, correct)`; (2) из `TrainerScreen.tsx` экспортируются `Exercise` и `FeedbackBar` (уже написаны, нужен только `export`); (3) новый `ReviewScreen.tsx` — интро с выбором направления → прогон слов → экран итогов; (4) AppShell: `onReview` загружает `reviewWords` из `fetchTodayTraining` и открывает ReviewScreen.

**Tech Stack:** React 18, TS, vitest + @testing-library/react.

**Источники истины:** `docs/design/handoff/app/review.jsx`, `server/src/training/training.routes.ts` (mode "review" принимает `correct: boolean`, отвечает 409 если слово не в SR).

---

## File Structure

```
client/src/
  api/trainingApi.ts                        # МОДИФИЦ.: + postReviewResult
  api/__tests__/trainingApi.test.ts         # МОДИФИЦ.: + тест review
  screens/TrainerScreen.tsx                 # МОДИФИЦ.: export Exercise, FeedbackBar
  screens/ReviewScreen.tsx                  # НОВЫЙ
  screens/__tests__/ReviewScreen.test.tsx   # НОВЫЙ
  AppShell.tsx                              # МОДИФИЦ.: wire onReview
```

**Конвенции:** только `import`; тест-файлы с двумя eslint-disable; НЕ интеграционные тесты; НЕ тестируем `displayName`; коммит в `main`.

---

### Task 1: postReviewResult в trainingApi

**Files:**
- Modify: `client/src/api/trainingApi.ts`
- Modify: `client/src/api/__tests__/trainingApi.test.ts`

- [ ] **Step 1: Добавить тест в `client/src/api/__tests__/trainingApi.test.ts`** (внутрь существующего `describe("trainingApi", ...)`):

```ts
  it("postReviewResult шлёт review с correct", async () => {
    const { captured, fn } = captureFetch({ progress: {} });
    await postReviewResult("w1", true, fn);
    expect(captured.url).toBe("/api/training/result");
    const body = JSON.parse(captured.init.body as string) as Record<string, unknown>;
    expect(body.mode).toBe("review");
    expect(body.correct).toBe(true);
  });
```

И добавить `postReviewResult` в импорт из `"../trainingApi"`.

- [ ] **Step 2: Запустить — FAIL**

```bash
cd /Users/zengo/Projects/other/word-training/client && npx vitest run src/api/__tests__/trainingApi.test.ts 2>&1 | tail -10
```

- [ ] **Step 3: Добавить в `client/src/api/trainingApi.ts`:**

```ts
export async function postReviewResult(
  wordId: string,
  correct: boolean,
  fetchFn: typeof fetch = fetch,
): Promise<{ progress: Progress }> {
  return apiRequest<{ progress: Progress }>(
    "/api/training/result",
    { method: "POST", body: { wordId, mode: "review", correct }, token: getToken() },
    fetchFn,
  );
}
```

- [ ] **Step 4: Запустить — PASS (4). Полный прогон + tsc.**

- [ ] **Step 5: Commit**

```bash
cd /Users/zengo/Projects/other/word-training
git add client/src/api/trainingApi.ts client/src/api/__tests__/trainingApi.test.ts
git commit -m "Добавить postReviewResult в trainingApi"
```

---

### Task 2: ReviewScreen

**Files:**
- Modify: `client/src/screens/TrainerScreen.tsx` (только `export` перед `function Exercise` и `function FeedbackBar`)
- Create: `client/src/screens/ReviewScreen.tsx`
- Test: `client/src/screens/__tests__/ReviewScreen.test.tsx`

- [ ] **Step 1: В `TrainerScreen.tsx` сделать `Exercise` и `FeedbackBar` экспортируемыми** — заменить `function Exercise(` на `export function Exercise(`, `function FeedbackBar(` на `export function FeedbackBar(`.

- [ ] **Step 2: Создать тест `client/src/screens/__tests__/ReviewScreen.test.tsx`**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewScreen } from "../ReviewScreen";
import type { Word } from "../../api/types";

const postReviewMock = vi.fn();
vi.mock("../../api/trainingApi", () => ({
  postReviewResult: (...args: unknown[]) => postReviewMock(...args),
}));

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

const WORDS: Word[] = [
  WORD,
  { ...WORD, id: "w2", english: "book", russian: "книга" },
];

beforeEach(() => {
  postReviewMock.mockReset();
  postReviewMock.mockResolvedValue({ progress: {} });
});

describe("ReviewScreen", () => {
  it("показывает интро с выбором направления и количеством слов", () => {
    render(<ReviewScreen dueWords={WORDS} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText("2 слов на повтор")).toBeInTheDocument();
    expect(screen.getByText("EN → RU")).toBeInTheDocument();
    expect(screen.getByText("RU → EN")).toBeInTheDocument();
    expect(screen.getByText("Оба")).toBeInTheDocument();
  });

  it("X на интро вызывает onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ReviewScreen dueWords={WORDS} onClose={onClose} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /закрыть/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("после Начать повтор показывает упражнение", async () => {
    const user = userEvent.setup();
    render(<ReviewScreen dueWords={WORDS} onClose={vi.fn()} onDone={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /Начать повтор/ }));
    expect(screen.getByText("apple")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Запустить — FAIL**

```bash
cd /Users/zengo/Projects/other/word-training/client && npx vitest run src/screens/__tests__/ReviewScreen.test.tsx 2>&1 | tail -10
```

- [ ] **Step 4: Создать `client/src/screens/ReviewScreen.tsx`**

```tsx
import { useState } from "react";
import { postReviewResult } from "../api/trainingApi";
import { Exercise, FeedbackBar } from "./TrainerScreen";
import { Page } from "../components/Page";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { IconBtn } from "../components/IconBtn";
import { Icon } from "../components/Icon";
import { Pill } from "../components/Pill";
import { ProgressBar } from "../components/ProgressBar";
import type { Word } from "../api/types";

type Direction = "enru" | "ruen" | "both";

const DIRS: { key: Direction; label: string; sub: string }[] = [
  { key: "enru", label: "EN → RU", sub: "Только Тип 1" },
  { key: "ruen", label: "RU → EN", sub: "Только Тип 2" },
  { key: "both", label: "Оба", sub: "Чередуем Тип 1 и Тип 2" },
];

const TYPE_SHORT: Record<number, string> = { 1: "EN → RU", 2: "RU → EN" };

interface Props {
  dueWords: Word[];
  onClose: () => void;
  onDone: () => void;
}

export function ReviewScreen({ dueWords, onClose, onDone }: Props) {
  const [dir, setDir] = useState<Direction>("both");
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState<"correct" | "wrong" | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [started, setStarted] = useState(false);

  const word = dueWords[idx];
  const layer = dir === "enru" ? 1 : dir === "ruen" ? 2 : idx % 2 === 0 ? 1 : 2;

  function handleResult(correct: boolean) {
    if (answered) return;
    setAnswered(correct ? "correct" : "wrong");
    void postReviewResult(word.id, correct);
    setTimeout(
      () => {
        setAnswered(null);
        setResults((r) => [...r, correct]);
        setIdx((i) => i + 1);
      },
      correct ? 700 : 1000,
    );
  }

  if (!started) {
    return (
      <div style={{ position: "absolute", inset: 0, background: "var(--bg)", zIndex: 60, overflowY: "auto" }} className="page-scroll">
        <Page withNav={false}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <IconBtn name="x" aria-label="Закрыть" onClick={onClose} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>
              Повторение
            </span>
            <div style={{ width: 40 }} />
          </div>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              className="pop"
              style={{
                width: 88,
                height: 88,
                borderRadius: 26,
                margin: "0 auto 16px",
                background: "var(--amber-soft, #fff8e1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="refresh" size={42} color="var(--amber-ink, #b45309)" stroke={2.2} />
            </div>
            <h1
              style={{ fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 700, color: "var(--ink)", margin: "0 0 4px" }}
            >
              {dueWords.length} слов на повтор
            </h1>
            <p style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink-soft)", margin: 0 }}>
              Закрепим то, что подошло по сроку
            </p>
          </div>

          <div
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--ink-mute)",
              textTransform: "uppercase",
              letterSpacing: 0.4,
              margin: "0 4px 10px",
            }}
          >
            Направление
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {DIRS.map((d) => (
              <Card
                key={d.key}
                onClick={() => setDir(d.key)}
                pad={15}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  cursor: "pointer",
                  boxShadow: dir === d.key ? "inset 0 0 0 2.5px var(--primary)" : "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: dir === d.key ? "var(--primary)" : "var(--surface-2)",
                  }}
                >
                  {dir === d.key ? <Icon name="check" size={13} color="#fff" stroke={3.2} /> : null}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>{d.label}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-mute)" }}>{d.sub}</div>
                </div>
              </Card>
            ))}
          </div>
          <Button full variant="primary" icon="arrow-right" onClick={() => setStarted(true)}>
            Начать повтор
          </Button>
        </Page>
      </div>
    );
  }

  if (idx >= dueWords.length) {
    const correct = results.filter(Boolean).length;
    const wrong = dueWords.length - correct;
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
            background: "linear-gradient(135deg, var(--amber, #f59e0b), var(--primary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 22,
            boxShadow: "0 18px 40px -12px var(--primary-glow, rgba(0,0,0,0.2))",
          }}
        >
          <Icon name="check" size={56} color="#fff" stroke={2.6} />
        </div>
        <h1
          style={{ fontFamily: "var(--font-display)", fontSize: 27, fontWeight: 700, color: "var(--ink)", margin: "0 0 8px" }}
        >
          Повтор завершён!
        </h1>
        <p style={{ fontSize: 15.5, fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 20px" }}>
          {correct} из {dueWords.length} верно · интервалы обновлены
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap", justifyContent: "center" }}>
          <Pill tone="success" icon="check">
            {correct} закреплено
          </Pill>
          {wrong > 0 ? (
            <Pill tone="danger" icon="refresh">
              {wrong} вернулись
            </Pill>
          ) : null}
        </div>
        <Button full variant="primary" onClick={onDone} style={{ maxWidth: 320 }}>
          Готово
        </Button>
      </div>
    );
  }

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
      <div style={{ paddingTop: 54, paddingLeft: 16, paddingRight: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <IconBtn name="x" aria-label="Закрыть" onClick={onClose} size={36} iconSize={18} />
          <div style={{ flex: 1 }}>
            <ProgressBar value={idx} max={dueWords.length} height={8} color="var(--amber, #f59e0b)" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
            {idx}/{dueWords.length}
          </span>
        </div>
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <Pill tone="amber" icon="refresh">
            Повторение · {TYPE_SHORT[layer]}
          </Pill>
        </div>
      </div>

      <div
        key={idx}
        className="ex-enter"
        style={{ flex: 1, overflowY: "auto", padding: "14px 18px 24px", display: "flex", flexDirection: "column" }}
      >
        <Exercise layer={layer} word={word} pool={dueWords} answered={answered} onResult={handleResult} />
      </div>

      {answered ? <FeedbackBar kind={answered} word={word} /> : null}
    </div>
  );
}
```

- [ ] **Step 5: Запустить тест — PASS (3).** Если падает из-за пропов `Pill`/`Button` (например, нет tone="amber" или icon="arrow-right") — прочитай компоненты и адаптируй вызовы под реальные API, не меняя смысл.

- [ ] **Step 6: Полный прогон + tsc**

```bash
cd /Users/zengo/Projects/other/word-training/client && npm test 2>&1 | tail -5 && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
cd /Users/zengo/Projects/other/word-training
git add client/src/screens/ReviewScreen.tsx \
        client/src/screens/__tests__/ReviewScreen.test.tsx \
        client/src/screens/TrainerScreen.tsx
git commit -m "Добавить экран повторения со spaced repetition"
```

---

### Task 3: Подключить повторение к AppShell

**Files:**
- Modify: `client/src/AppShell.tsx`

- [ ] **Step 1: Обновить AppShell** — по аналогии с `openTrainer`:

```tsx
// импорт:
import { ReviewScreen } from "./screens/ReviewScreen";

// state:
const [reviewWords, setReviewWords] = useState<Word[] | null>(null);

// функция:
const openReview = () => {
  void fetchTodayTraining().then(({ reviewWords: due }) => {
    if (due.length > 0) {
      setReviewWords(due.map((r) => r.word));
    }
  });
};
```

Заменить оба `onReview={() => { /* План 11 */ }}` на `onReview={openReview}` (HomeScreen, DeckDetailScreen).

Добавить рендер рядом с TrainerScreen:

```tsx
{reviewWords ? (
  <ReviewScreen
    dueWords={reviewWords}
    onClose={() => setReviewWords(null)}
    onDone={() => {
      setReviewWords(null);
      setReloadKey((k) => k + 1);
    }}
  />
) : null}
```

- [ ] **Step 2: Полный прогон + tsc + build**

```bash
cd /Users/zengo/Projects/other/word-training/client && npm test 2>&1 | tail -5 && npx tsc --noEmit && npm run build 2>&1 | tail -4
```

- [ ] **Step 3: Commit**

```bash
cd /Users/zengo/Projects/other/word-training
git add client/src/AppShell.tsx
git commit -m "Подключить режим повторения к AppShell"
```

---

## Self-Review

**Spec coverage:**
- Режим повторения только Тип 1 / Тип 2 ✓
- Настройка направления EN→RU / RU→EN / оба (чередование) ✓
- Ответ верный → SM-2 интервал растёт; ошибка → сброс (сервер уже реализует) ✓ — клиент шлёт `mode:"review", correct`
- Запись результата на каждый ответ ✓
- Экран итогов: верно/всего, «закреплено»/«вернулись» ✓

**Placeholder scan:** нет.

**Type consistency:** `Exercise`/`FeedbackBar` экспортируются из TrainerScreen с теми же сигнатурами. `postReviewResult(wordId: string, correct: boolean)` соответствует серверному контракту (`mode:"review"`, `correct: boolean`). `dueWords: Word[]` — из `DueReview.word`.
