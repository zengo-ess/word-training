# Frontend: Decks, Detail, Word Sheet & Add Word Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реальные экраны колод по дизайну: список колод со статистикой + создание, деталь колоды (оверлей), карточка слова (нижний шит), добавление слова (lookup→черновик→картинка→сохранение). Связать с навигацией каркаса (стек оверлеев + шит).

**Architecture:** Слой API расширяется (типы `Deck` со счётчиками, `Progress`, `WordWithProgress`; `wordsApi` для lookup/create/searchImages). Экраны — компоненты на инлайн-стилях по `docs/design/handoff/app/screens-decks.jsx` и `screens-addword.jsx`, адаптированные к реальным данным: прогресс `current_type` 1-based, `learned = progress.learned_at != null`, `interval_days`/`total_reviews`; картинка слова — реальный `image_url` (или плитка-плейсхолдер `WordTile`, если пусто). `AppShell` получает модель `nav` (стек оверлеев + sheetWord) как в `app/app.jsx`. Деталь/шит/добавление — оверлеи/шит поверх табов. `nav.learn/review` — заглушки (Планы 10-11).

**Tech Stack:** React 18, TS, lucide-react, vitest + @testing-library/react. Web Speech API + `<audio>` для озвучки.

**Источник истины:** `docs/design/handoff/app/screens-decks.jsx`, `screens-addword.jsx`, `data.jsx`.

---

## File Structure

```
client/src/
  api/types.ts                 # МОДИФИЦ.: Deck + total/learned; + Progress, WordWithProgress
  api/decksApi.ts              # МОДИФИЦ.: fetchDeckWords → WordWithProgress[]
  api/wordsApi.ts              # НОВЫЙ: lookupWord, createWord, searchImages
  api/__tests__/wordsApi.test.ts
  lib/wordVisual.ts            # hueFromString, playWord (audio_url | Web Speech)
  screens/DecksTab.tsx         # ЗАМЕНА заглушки: реальный список + создание
  screens/DeckDetailScreen.tsx # оверлей детали колоды
  screens/WordSheet.tsx        # нижний шит карточки слова
  screens/AddWordScreen.tsx    # оверлей добавления слова
  screens/__tests__/*.test.tsx
  AppShell.tsx                 # МОДИФИЦ.: nav-модель (стек оверлеев + sheetWord)
```

**Конвенции:** только `import`; никогда `required`; `key` по id с сервера; тест-файлы с двумя eslint-disable; НЕ интеграционные тесты (api — мок fetch/модулей; экраны — мок api-модулей); НЕ тестируем `displayName`; импорты без расширений; коммит в `main`.

---

### Task 1: Слой API (типы + decksApi + wordsApi)

**Files:**
- Modify: `client/src/api/types.ts`
- Modify: `client/src/api/decksApi.ts`
- Create: `client/src/api/wordsApi.ts`
- Test: `client/src/api/__tests__/wordsApi.test.ts`

- [ ] **Step 1: Заменить `client/src/api/types.ts`**

```ts
export interface Deck {
  id: string;
  name: string;
  is_builtin: number;
  created_at: string;
  total: number;
  learned: number;
}

export interface Word {
  id: string;
  deck_id: string;
  english: string;
  russian: string;
  transcription: string | null;
  example_sentence: string | null;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
}

export interface Progress {
  id: string;
  word_id: string;
  current_type: number | null;
  learned_at: string | null;
  ease_factor: number;
  interval_days: number;
  next_review_at: string | null;
  total_reviews: number;
  correct_reviews: number;
}

export interface WordWithProgress extends Word {
  progress: Progress | null;
}
```

- [ ] **Step 2: Обновить `client/src/api/decksApi.ts`** — `fetchDeckWords` возвращает `WordWithProgress[]`:

```ts
import { apiRequest } from "./http";
import { getToken } from "../auth/token";
import type { Deck, WordWithProgress } from "./types";

export async function fetchDecks(fetchFn: typeof fetch = fetch): Promise<Deck[]> {
  const data = await apiRequest<{ decks: Deck[] }>("/api/decks", { token: getToken() }, fetchFn);
  return data.decks;
}

export async function createDeck(name: string, fetchFn: typeof fetch = fetch): Promise<Deck> {
  const data = await apiRequest<{ deck: Deck }>(
    "/api/decks",
    { method: "POST", body: { name }, token: getToken() },
    fetchFn,
  );
  return data.deck;
}

export async function fetchDeckWords(deckId: string, fetchFn: typeof fetch = fetch): Promise<WordWithProgress[]> {
  const data = await apiRequest<{ words: WordWithProgress[] }>(
    `/api/decks/${deckId}/words`,
    { token: getToken() },
    fetchFn,
  );
  return data.words;
}
```

- [ ] **Step 3: Тест `client/src/api/__tests__/wordsApi.test.ts`**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import { lookupWord, createWord, searchImages } from "../wordsApi";

interface Captured {
  url: string;
  init: RequestInit;
}

function mockFetch(body: unknown, captured?: { value?: Captured }): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    if (captured) captured.value = { url, init };
    return { ok: true, status: 200, json: async () => body };
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("wt_token", "T");
});

describe("wordsApi", () => {
  it("lookupWord постит слово и возвращает черновик", async () => {
    const captured: { value?: Captured } = {};
    const draft = await lookupWord(
      "apple",
      mockFetch({ english: "apple", russian: "яблоко", imageUrl: "u", imageCandidates: ["u"] }, captured),
    );
    expect(draft.russian).toBe("яблоко");
    expect(captured.value?.url).toBe("/api/words/lookup");
    expect(captured.value?.init.body).toBe(JSON.stringify({ english: "apple" }));
  });

  it("createWord постит слово и возвращает его", async () => {
    const word = await createWord(
      { deckId: "d1", english: "apple", russian: "яблоко", imageUrl: null },
      mockFetch({ word: { id: "w1", deck_id: "d1", english: "apple", russian: "яблоко" } }),
    );
    expect(word.id).toBe("w1");
  });

  it("searchImages кодирует запрос и возвращает ссылки", async () => {
    const captured: { value?: Captured } = {};
    const images = await searchImages("red apple", mockFetch({ images: ["a", "b"] }, captured));
    expect(images).toEqual(["a", "b"]);
    expect(captured.value?.url).toContain("/api/unsplash/search?q=red%20apple");
  });
});
```

- [ ] **Step 4: Запустить — FAIL. Реализовать `client/src/api/wordsApi.ts`**

```ts
import { apiRequest } from "./http";
import { getToken } from "../auth/token";
import type { Word } from "./types";

export interface WordDraft {
  english: string;
  russian: string;
  imageUrl: string | null;
  imageCandidates: string[];
}

export async function lookupWord(english: string, fetchFn: typeof fetch = fetch): Promise<WordDraft> {
  return apiRequest<WordDraft>(
    "/api/words/lookup",
    { method: "POST", body: { english }, token: getToken() },
    fetchFn,
  );
}

export interface NewWordInput {
  deckId: string;
  english: string;
  russian: string;
  imageUrl: string | null;
}

export async function createWord(input: NewWordInput, fetchFn: typeof fetch = fetch): Promise<Word> {
  const data = await apiRequest<{ word: Word }>(
    "/api/words",
    { method: "POST", body: input, token: getToken() },
    fetchFn,
  );
  return data.word;
}

export async function searchImages(query: string, fetchFn: typeof fetch = fetch): Promise<string[]> {
  const data = await apiRequest<{ images: string[] }>(
    `/api/unsplash/search?q=${encodeURIComponent(query)}`,
    { token: getToken() },
    fetchFn,
  );
  return data.images;
}
```

- [ ] **Step 5:** `cd client && npx vitest run src/api/__tests__/wordsApi.test.ts` → PASS (3). Then `npm test` (full) + `npx tsc --noEmit` (учти: `decksApi.test.ts` из Плана 5 не должен сломаться — он не конструирует `Deck` явно).

- [ ] **Step 6: Commit**

```bash
git add client/src/api/types.ts client/src/api/decksApi.ts client/src/api/wordsApi.ts client/src/api/__tests__/wordsApi.test.ts
git commit -m "Расширить слой API: статистика колод, прогресс слов, wordsApi"
```

---

### Task 2: Визуальные хелперы (hue + озвучка)

**Files:**
- Create: `client/src/lib/wordVisual.ts`
- Test: `client/src/lib/__tests__/wordVisual.test.ts`

- [ ] **Step 1: Тест `client/src/lib/__tests__/wordVisual.test.ts`**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { hueFromString } from "../wordVisual";

describe("hueFromString", () => {
  it("детерминирована и в диапазоне 0..359", () => {
    const h = hueFromString("apple");
    expect(h).toBe(hueFromString("apple"));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(360);
  });

  it("разные строки дают разный оттенок", () => {
    expect(hueFromString("apple")).not.toBe(hueFromString("banana"));
  });
});
```

- [ ] **Step 2: Реализовать `client/src/lib/wordVisual.ts`**

```ts
export function hueFromString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 360;
  }
  return hash;
}

export function playWord(word: { english: string; audio_url: string | null }): void {
  if (word.audio_url) {
    void new Audio(word.audio_url).play().catch(() => undefined);
    return;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(word.english);
    utt.lang = "en-US";
    utt.rate = 0.9;
    window.speechSynthesis.speak(utt);
  }
}
```

- [ ] **Step 3:** `cd client && npx vitest run src/lib/__tests__/wordVisual.test.ts` → PASS (2).

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/wordVisual.ts client/src/lib/__tests__/wordVisual.test.ts
git commit -m "Добавить хелперы оттенка плитки и озвучки слова"
```

---

### Task 3: Экран колод (реальный список + создание)

**Files:**
- Replace: `client/src/screens/DecksTab.tsx`
- Test: `client/src/screens/__tests__/DecksTab.test.tsx`

- [ ] **Step 1: Тест `client/src/screens/__tests__/DecksTab.test.tsx`**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecksTab } from "../DecksTab";

const fetchDecksMock = vi.fn();
const createDeckMock = vi.fn();

vi.mock("../../api/decksApi", () => ({
  fetchDecks: () => fetchDecksMock(),
  createDeck: (name: string) => createDeckMock(name),
}));

beforeEach(() => {
  fetchDecksMock.mockReset();
  createDeckMock.mockReset();
});

describe("DecksTab", () => {
  it("делит колоды на мои и встроенные", async () => {
    fetchDecksMock.mockResolvedValue([
      { id: "1", name: "Базовые", is_builtin: 1, created_at: "x", total: 10, learned: 3 },
      { id: "2", name: "Мои слова", is_builtin: 0, created_at: "x", total: 2, learned: 0 },
    ]);
    render(<DecksTab onOpenDeck={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Мои слова")).toBeInTheDocument());
    expect(screen.getByText("Базовые")).toBeInTheDocument();
    expect(screen.getByText("Мои колоды")).toBeInTheDocument();
    expect(screen.getByText("Встроенные колоды")).toBeInTheDocument();
  });

  it("создаёт колоду и открывает её", async () => {
    fetchDecksMock.mockResolvedValue([]);
    createDeckMock.mockResolvedValue({ id: "9", name: "Новая", is_builtin: 0, created_at: "x", total: 0, learned: 0 });
    const onOpenDeck = vi.fn();
    const user = userEvent.setup();
    render(<DecksTab onOpenDeck={onOpenDeck} />);
    await waitFor(() => expect(fetchDecksMock).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: /Создать колоду/ }));
    await user.type(screen.getByLabelText("Название колоды"), "Новая");
    await user.click(screen.getByRole("button", { name: "Создать" }));

    expect(createDeckMock).toHaveBeenCalledWith("Новая");
    await waitFor(() => expect(onOpenDeck).toHaveBeenCalledWith("9"));
  });
});
```

- [ ] **Step 2: Запустить — FAIL. Реализовать `client/src/screens/DecksTab.tsx`**

```tsx
import { useState, type FormEvent } from "react";
import { fetchDecks, createDeck } from "../api/decksApi";
import { useAsync } from "../hooks/useAsync";
import { Page } from "../components/Page";
import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import { ProgressBar } from "../components/ProgressBar";
import type { Deck } from "../api/types";

function DeckCard({ deck, onClick }: { deck: Deck; onClick: () => void }) {
  const pct = deck.total ? Math.round((deck.learned / deck.total) * 100) : 0;
  const done = pct === 100 && deck.total > 0;
  const builtin = deck.is_builtin === 1;
  return (
    <Card onClick={onClick} pad={15} style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          flexShrink: 0,
          position: "relative",
          background: builtin ? "var(--surface-2)" : "var(--primary-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={builtin ? "book" : "star"} size={25} color={builtin ? "var(--ink-soft)" : "var(--primary)"} stroke={2.2} />
        {done ? (
          <div
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "var(--success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Icon name="check" size={13} color="#fff" stroke={3.2} />
          </div>
        ) : null}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 15.5, fontWeight: 800, color: "var(--ink)" }}>{deck.name}</span>
          {builtin ? <Icon name="lock" size={13} color="var(--ink-mute)" stroke={2.3} /> : null}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-mute)", marginTop: 1 }}>
          {deck.learned}/{deck.total} слов
        </div>
        <div style={{ marginTop: 8 }}>
          <ProgressBar
            value={deck.learned}
            max={deck.total || 1}
            height={5}
            color={done ? "var(--success)" : "var(--primary)"}
          />
        </div>
      </div>
    </Card>
  );
}

const GROUP_LABEL: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: "var(--ink-mute)",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  margin: "0 4px 10px",
};

export function DecksTab({ onOpenDeck }: { onOpenDeck: (id: string) => void }) {
  const { data: decks, loading, reload } = useAsync<Deck[]>(() => fetchDecks(), []);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const custom = decks?.filter((d) => d.is_builtin === 0) ?? [];
  const builtin = decks?.filter((d) => d.is_builtin === 1) ?? [];

  const onCreate = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    setBusy(true);
    try {
      const deck = await createDeck(trimmed);
      setName("");
      setCreating(false);
      reload();
      onOpenDeck(deck.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, margin: "4px 0 16px" }}>Колоды</h1>

      {loading ? <p style={{ color: "var(--ink-mute)" }}>Загрузка…</p> : null}

      <div style={GROUP_LABEL}>Мои колоды</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {custom.map((d) => (
          <DeckCard key={d.id} deck={d} onClick={() => onOpenDeck(d.id)} />
        ))}
      </div>

      {creating ? (
        <form onSubmit={(e) => void onCreate(e)} style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <input
            aria-label="Название колоды"
            placeholder="Название колоды"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              flex: 1,
              fontSize: 16,
              padding: "12px 14px",
              border: "2px solid var(--line)",
              borderRadius: "var(--r-btn)",
              background: "var(--surface)",
              outline: "none",
            }}
          />
          <button
            type="submit"
            className="btn-press"
            disabled={busy || name.trim().length === 0}
            style={{
              border: "none",
              borderRadius: "var(--r-btn)",
              padding: "0 18px",
              fontWeight: 800,
              background: "var(--primary)",
              color: "var(--on-primary)",
              cursor: "pointer",
              opacity: busy || name.trim().length === 0 ? 0.45 : 1,
            }}
          >
            Создать
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="btn-press"
          style={{
            width: "100%",
            border: "2px dashed var(--line-strong)",
            background: "transparent",
            borderRadius: "var(--r-card)",
            padding: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 14.5,
            fontWeight: 800,
            color: "var(--ink-soft)",
            marginBottom: 24,
          }}
        >
          <Icon name="plus" size={19} stroke={2.6} /> Создать колоду
        </button>
      )}

      <div style={GROUP_LABEL}>Встроенные колоды</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {builtin.map((d) => (
          <DeckCard key={d.id} deck={d} onClick={() => onOpenDeck(d.id)} />
        ))}
      </div>
    </Page>
  );
}
```

- [ ] **Step 3:** `cd client && npx vitest run src/screens/__tests__/DecksTab.test.tsx` → PASS (2). Then full `npm test`.

- [ ] **Step 4: Commit**

```bash
git add client/src/screens/DecksTab.tsx client/src/screens/__tests__/DecksTab.test.tsx
git commit -m "Сделать реальный экран колод со статистикой и созданием"
```

---

### Task 4: Деталь колоды (оверлей)

**Files:**
- Create: `client/src/screens/DeckDetailScreen.tsx`
- Test: `client/src/screens/__tests__/DeckDetailScreen.test.tsx`

- [ ] **Step 1: Тест `client/src/screens/__tests__/DeckDetailScreen.test.tsx`**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeckDetailScreen } from "../DeckDetailScreen";
import type { Deck } from "../api/types";

const fetchDeckWordsMock = vi.fn();
vi.mock("../../api/decksApi", () => ({
  fetchDeckWords: (id: string) => fetchDeckWordsMock(id),
}));

const customDeck: Deck = { id: "d1", name: "Мои слова", is_builtin: 0, created_at: "x", total: 1, learned: 0 };

beforeEach(() => {
  fetchDeckWordsMock.mockReset();
});

describe("DeckDetailScreen", () => {
  it("показывает слова и кнопку добавления для своей колоды", async () => {
    fetchDeckWordsMock.mockResolvedValue([
      {
        id: "w1",
        deck_id: "d1",
        english: "apple",
        russian: "яблоко",
        transcription: null,
        example_sentence: null,
        image_url: null,
        audio_url: null,
        created_at: "x",
        progress: null,
      },
    ]);
    render(
      <DeckDetailScreen
        deck={customDeck}
        onBack={vi.fn()}
        onWord={vi.fn()}
        onAddWord={vi.fn()}
        onLearn={vi.fn()}
        onReview={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.getByText("apple")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Добавить слово/ })).toBeInTheDocument();
  });

  it("назад вызывает onBack", async () => {
    fetchDeckWordsMock.mockResolvedValue([]);
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(
      <DeckDetailScreen deck={customDeck} onBack={onBack} onWord={vi.fn()} onAddWord={vi.fn()} onLearn={vi.fn()} onReview={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: "Назад" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Запустить — FAIL. Реализовать `client/src/screens/DeckDetailScreen.tsx`**

```tsx
import { fetchDeckWords } from "../api/decksApi";
import { useAsync } from "../hooks/useAsync";
import { Page } from "../components/Page";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { IconBtn } from "../components/IconBtn";
import { Pill } from "../components/Pill";
import { Icon } from "../components/Icon";
import { ProgressBar } from "../components/ProgressBar";
import { WordTile } from "../components/WordTile";
import { hueFromString } from "../lib/wordVisual";
import type { Deck, WordWithProgress } from "../api/types";

interface Props {
  deck: Deck;
  onBack: () => void;
  onWord: (word: WordWithProgress) => void;
  onAddWord: () => void;
  onLearn: () => void;
  onReview: () => void;
}

function WordRow({ word, onClick }: { word: WordWithProgress; onClick: () => void }) {
  const learned = word.progress?.learned_at != null;
  const type = word.progress?.current_type ?? 1;
  return (
    <Card pad={11} onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {word.image_url ? (
        <img
          src={word.image_url}
          alt=""
          style={{ width: 46, height: 46, borderRadius: 13, objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <WordTile icon="book" hue={hueFromString(word.english)} size={46} round={13} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>{word.english}</span>
          {word.transcription ? (
            <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-mute)" }}>
              {word.transcription}
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-soft)" }}>{word.russian}</div>
      </div>
      {learned ? (
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "var(--success-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="check" size={13} color="var(--success)" stroke={3} />
        </div>
      ) : (
        <Pill tone="primary" style={{ fontSize: 10.5, padding: "3px 8px" }}>
          Тип {type}
        </Pill>
      )}
    </Card>
  );
}

export function DeckDetailScreen({ deck, onBack, onWord, onAddWord, onLearn, onReview }: Props) {
  const { data: words } = useAsync<WordWithProgress[]>(() => fetchDeckWords(deck.id), [deck.id]);
  const builtin = deck.is_builtin === 1;
  const pct = deck.total ? Math.round((deck.learned / deck.total) * 100) : 0;
  const list = words ?? [];
  const newCount = list.filter((w) => w.progress?.learned_at == null).length;

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg)", zIndex: 60, overflowY: "auto" }} className="page-scroll">
      <Page withNav={false}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <IconBtn name="chevron-left" aria-label="Назад" onClick={onBack} />
          {builtin ? <Pill icon="lock">Только чтение</Pill> : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              flexShrink: 0,
              background: builtin ? "var(--surface-2)" : "var(--primary-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name={builtin ? "book" : "star"} size={32} color="var(--primary)" stroke={2.1} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 23, fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
              {deck.name}
            </h1>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-mute)", marginTop: 3 }}>
              {builtin ? "Встроенная колода" : "Личная колода"}
            </div>
          </div>
        </div>

        <Card pad={15} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink-soft)" }}>
              Выучено {deck.learned} из {deck.total}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--primary)" }}>{pct}%</span>
          </div>
          <ProgressBar value={deck.learned} max={deck.total || 1} height={9} color={pct === 100 ? "var(--success)" : "var(--primary)"} />
        </Card>

        {newCount > 0 ? (
          <Button full variant="primary" icon="sparkles" onClick={onLearn} style={{ marginBottom: 10 }}>
            Учить новые ({newCount})
          </Button>
        ) : (
          <Button full variant="soft" icon="refresh" onClick={onReview} style={{ marginBottom: 10 }}>
            Повторить колоду
          </Button>
        )}
        {!builtin ? (
          <Button full variant="outline" icon="plus" onClick={onAddWord} style={{ marginBottom: 18 }}>
            Добавить слово
          </Button>
        ) : (
          <div style={{ height: 8 }} />
        )}

        <div
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--ink-mute)",
            textTransform: "uppercase",
            letterSpacing: 0.4,
            margin: "6px 4px 10px",
          }}
        >
          Слова {list.length ? `(${list.length})` : ""}
        </div>

        {list.length === 0 ? (
          <Card pad={22} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-mute)" }}>В колоде пока нет слов.</div>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {list.map((w) => (
              <WordRow key={w.id} word={w} onClick={() => onWord(w)} />
            ))}
          </div>
        )}
      </Page>
    </div>
  );
}
```

- [ ] **Step 3:** `cd client && npx vitest run src/screens/__tests__/DeckDetailScreen.test.tsx` → PASS (2). Then full `npm test`.

- [ ] **Step 4: Commit**

```bash
git add client/src/screens/DeckDetailScreen.tsx client/src/screens/__tests__/DeckDetailScreen.test.tsx
git commit -m "Добавить экран детали колоды (оверлей)"
```

---

### Task 5: Карточка слова (нижний шит)

**Files:**
- Create: `client/src/screens/WordSheet.tsx`
- Test: `client/src/screens/__tests__/WordSheet.test.tsx`

- [ ] **Step 1: Тест `client/src/screens/__tests__/WordSheet.test.tsx`**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WordSheet } from "../WordSheet";
import type { WordWithProgress } from "../api/types";

vi.mock("../../lib/wordVisual", () => ({
  hueFromString: () => 55,
  playWord: vi.fn(),
}));

const word: WordWithProgress = {
  id: "w1",
  deck_id: "d1",
  english: "apple",
  russian: "яблоко",
  transcription: "/ˈæpəl/",
  example_sentence: "I eat an ___ daily.",
  image_url: null,
  audio_url: null,
  created_at: "x",
  progress: { id: "p", word_id: "w1", current_type: null, learned_at: "2026-06-01", ease_factor: 2.3, interval_days: 3, next_review_at: "x", total_reviews: 4, correct_reviews: 3 },
};

describe("WordSheet", () => {
  it("показывает слово, перевод и пример", () => {
    render(<WordSheet word={word} onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "apple" })).toBeInTheDocument();
    expect(screen.getByText("яблоко")).toBeInTheDocument();
    expect(screen.getByText("I eat an apple daily.")).toBeInTheDocument();
  });

  it("клик по фону закрывает шит", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<WordSheet word={word} onClose={onClose} />);
    await user.click(screen.getByTestId("sheet-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Запустить — FAIL. Реализовать `client/src/screens/WordSheet.tsx`**

```tsx
import { Card } from "../components/Card";
import { IconBtn } from "../components/IconBtn";
import { Icon } from "../components/Icon";
import { WordTile } from "../components/WordTile";
import { hueFromString, playWord } from "../lib/wordVisual";
import type { WordWithProgress } from "../api/types";

const STAT_LABEL: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: "var(--ink-mute)" };
const STAT_NUM: React.CSSProperties = { fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--ink)" };

export function WordSheet({ word, onClose }: { word: WordWithProgress; onClose: () => void }) {
  const learned = word.progress?.learned_at != null;
  const type = word.progress?.current_type ?? 1;
  const example = word.example_sentence ? word.example_sentence.replace("___", word.english) : null;

  return (
    <div
      data-testid="sheet-backdrop"
      className="sheet-backdrop"
      onClick={onClose}
      style={{ position: "absolute", inset: 0, zIndex: 70, background: "rgba(20,12,6,0.4)", display: "flex", alignItems: "flex-end" }}
    >
      <div
        className="sheet-up"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", background: "var(--bg)", borderRadius: "28px 28px 0 0", padding: "12px 18px 30px", maxHeight: "86%", overflowY: "auto" }}
      >
        <div style={{ width: 40, height: 5, borderRadius: 99, background: "var(--line-strong)", margin: "0 auto 16px" }} />
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          {word.image_url ? (
            <img src={word.image_url} alt="" style={{ width: 168, height: 168, borderRadius: "var(--r-tile)", objectFit: "cover" }} />
          ) : (
            <WordTile icon="book" hue={hueFromString(word.english)} size={168} photo />
          )}
        </div>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, margin: 0 }}>{word.english}</h2>
            <IconBtn name="volume-2" aria-label="Озвучить" size={38} iconSize={19} onClick={() => playWord(word)} />
          </div>
          {word.transcription ? (
            <div style={{ fontFamily: "var(--mono)", fontSize: 15, color: "var(--ink-mute)", marginTop: 4 }}>{word.transcription}</div>
          ) : null}
          <div style={{ fontSize: 19, fontWeight: 700, color: "var(--primary)", marginTop: 6 }}>{word.russian}</div>
        </div>

        {example ? (
          <Card pad={15} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
              Пример
            </div>
            <div style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.5 }}>{example}</div>
          </Card>
        ) : (
          <Card pad={14} style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="sparkles" size={18} color="var(--ink-mute)" stroke={2} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-mute)" }}>
              У своих слов пример и транскрипция не заполняются автоматически
            </span>
          </Card>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <Card pad={12} style={{ flex: 1, textAlign: "center" }}>
            <div style={STAT_NUM}>{word.progress?.total_reviews ?? 0}</div>
            <div style={STAT_LABEL}>повторов</div>
          </Card>
          <Card pad={12} style={{ flex: 1, textAlign: "center" }}>
            <div style={STAT_NUM}>{learned ? `${word.progress?.interval_days ?? 0}д` : "—"}</div>
            <div style={STAT_LABEL}>интервал</div>
          </Card>
          <Card pad={12} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ ...STAT_NUM, color: learned ? "var(--success)" : "var(--primary)" }}>{learned ? "SR" : `Т${type}`}</div>
            <div style={STAT_LABEL}>статус</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3:** `cd client && npx vitest run src/screens/__tests__/WordSheet.test.tsx` → PASS (2). Then full `npm test`.

- [ ] **Step 4: Commit**

```bash
git add client/src/screens/WordSheet.tsx client/src/screens/__tests__/WordSheet.test.tsx
git commit -m "Добавить нижний шит карточки слова"
```

---

### Task 6: Добавление слова + связка навигации каркаса

**Files:**
- Create: `client/src/screens/AddWordScreen.tsx`
- Test: `client/src/screens/__tests__/AddWordScreen.test.tsx`
- Modify: `client/src/AppShell.tsx`

- [ ] **Step 1: Тест `client/src/screens/__tests__/AddWordScreen.test.tsx`**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddWordScreen } from "../AddWordScreen";

const lookupMock = vi.fn();
const createMock = vi.fn();
vi.mock("../../api/wordsApi", () => ({
  lookupWord: (en: string) => lookupMock(en),
  createWord: (input: unknown) => createMock(input),
  searchImages: vi.fn(),
}));

beforeEach(() => {
  lookupMock.mockReset();
  createMock.mockReset();
});

describe("AddWordScreen", () => {
  it("ищет перевод, затем сохраняет слово", async () => {
    lookupMock.mockResolvedValue({ english: "apple", russian: "яблоко", imageUrl: null, imageCandidates: [] });
    createMock.mockResolvedValue({ id: "w1" });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<AddWordScreen deckId="d1" onClose={vi.fn()} onSaved={onSaved} />);

    await user.type(screen.getByLabelText("Английское слово"), "apple");
    await user.click(screen.getByRole("button", { name: "Найти" }));

    await waitFor(() => expect(screen.getByLabelText("Перевод")).toHaveValue("яблоко"));
    await user.click(screen.getByRole("button", { name: /Сохранить/ }));

    expect(createMock).toHaveBeenCalledWith({ deckId: "d1", english: "apple", russian: "яблоко", imageUrl: null });
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });
});
```

- [ ] **Step 2: Запустить — FAIL. Реализовать `client/src/screens/AddWordScreen.tsx`**

```tsx
import { useState, type FormEvent } from "react";
import { lookupWord, createWord, searchImages } from "../api/wordsApi";
import { Page } from "../components/Page";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { IconBtn } from "../components/IconBtn";
import { Pill } from "../components/Pill";
import { Icon } from "../components/Icon";

interface Props {
  deckId: string;
  onClose: () => void;
  onSaved: () => void;
}

const LABEL: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: "var(--ink-mute)",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  marginLeft: 4,
};

const TEXT_INPUT: React.CSSProperties = {
  flex: 1,
  fontSize: 17,
  fontWeight: 700,
  color: "var(--ink)",
  background: "var(--surface)",
  border: "2px solid var(--line)",
  borderRadius: "var(--r-btn)",
  padding: "13px 15px",
  outline: "none",
};

export function AddWordScreen({ deckId, onClose, onSaved }: Props) {
  const [english, setEnglish] = useState("");
  const [russian, setRussian] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [imageQuery, setImageQuery] = useState("");
  const [stage, setStage] = useState<"input" | "loading" | "ready">("input");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onLookup = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const word = english.trim();
    if (word.length === 0) return;
    setStage("loading");
    setError("");
    try {
      const draft = await lookupWord(word);
      setRussian(draft.russian);
      setImageUrl(draft.imageUrl);
      setCandidates(draft.imageCandidates);
      setImageQuery(word);
      setStage("ready");
    } catch {
      setError("Не удалось получить данные слова");
      setStage("input");
    }
  };

  const onSearchImages = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const q = imageQuery.trim();
    if (q.length === 0) return;
    try {
      setCandidates(await searchImages(q));
    } catch {
      /* картинки опциональны */
    }
  };

  const onSave = async (): Promise<void> => {
    setBusy(true);
    setError("");
    try {
      await createWord({ deckId, english: english.trim(), russian: russian.trim(), imageUrl });
      onSaved();
    } catch {
      setError("Не удалось сохранить слово");
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg)", zIndex: 65, overflowY: "auto" }} className="page-scroll">
      <Page withNav={false}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <IconBtn name="x" aria-label="Закрыть" onClick={onClose} variant="plain" />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700 }}>Новое слово</span>
          <div style={{ width: 40 }} />
        </div>

        <label style={LABEL}>Английское слово</label>
        <form onSubmit={(e) => void onLookup(e)} style={{ display: "flex", gap: 10, marginTop: 8, marginBottom: 18 }}>
          <input
            aria-label="Английское слово"
            value={english}
            onChange={(e) => {
              setEnglish(e.target.value);
              setStage("input");
            }}
            placeholder="dream"
            style={{ ...TEXT_INPUT, fontSize: 18 }}
          />
          <Button type="submit" variant="primary" size="md" disabled={english.trim().length === 0 || stage === "loading"}>
            Найти
          </Button>
        </form>

        {stage === "loading" ? (
          <Card pad={18} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span className="spin">
              <Icon name="refresh" size={20} color="var(--primary)" stroke={2.4} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-soft)" }}>Ищу перевод и картинку…</span>
          </Card>
        ) : null}

        {stage === "ready" ? (
          <div className="fade-up">
            <label style={LABEL}>Перевод</label>
            <div style={{ display: "flex", margin: "8px 0 6px" }}>
              <input aria-label="Перевод" value={russian} onChange={(e) => setRussian(e.target.value)} style={TEXT_INPUT} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, marginLeft: 4 }}>
              <Pill tone="primary" icon="sparkles" style={{ fontSize: 11 }}>
                MyMemory
              </Pill>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)" }}>черновик — поправьте при необходимости</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 4px 10px" }}>
              <label style={{ ...LABEL, marginLeft: 0 }}>Картинка</label>
              <form onSubmit={(e) => void onSearchImages(e)} style={{ display: "flex", gap: 6 }}>
                <input
                  aria-label="Поиск картинки"
                  value={imageQuery}
                  onChange={(e) => setImageQuery(e.target.value)}
                  style={{ ...TEXT_INPUT, fontSize: 13, padding: "6px 10px", fontWeight: 600 }}
                />
                <Button type="submit" variant="ghost" size="sm">
                  Искать
                </Button>
              </form>
            </div>
            {candidates.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 22 }}>
                {candidates.map((url) => (
                  <button
                    key={url}
                    type="button"
                    className="btn-press"
                    aria-label="Выбрать картинку"
                    aria-pressed={url === imageUrl}
                    onClick={() => setImageUrl(url)}
                    style={{
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      borderRadius: "var(--r-tile)",
                      background: "transparent",
                      outline: url === imageUrl ? "3px solid var(--primary)" : "3px solid transparent",
                      outlineOffset: 2,
                    }}
                  >
                    <img src={url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "var(--r-tile)", display: "block" }} />
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ marginBottom: 22 }} />
            )}

            <Card pad={13} style={{ display: "flex", gap: 10, marginBottom: 20, background: "var(--surface-2)", boxShadow: "none" }}>
              <Icon name="sparkles" size={18} color="var(--ink-mute)" stroke={2} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", lineHeight: 1.45 }}>
                Транскрипция и пример для своих слов не подтягиваются. Тип 3 (пропуск) для слова без примера будет пропущен.
              </span>
            </Card>

            <Button full variant="primary" icon="check" disabled={busy || russian.trim().length === 0} onClick={() => void onSave()}>
              {busy ? "Сохраняем…" : "Сохранить слово"}
            </Button>
          </div>
        ) : null}

        {error.length > 0 ? (
          <p role="alert" style={{ marginTop: 14, color: "var(--danger-ink)", fontWeight: 700 }}>
            {error}
          </p>
        ) : null}
      </Page>
    </div>
  );
}
```

- [ ] **Step 3: Запустить тест AddWord** → PASS (1).

- [ ] **Step 4: Связать навигацию в `client/src/AppShell.tsx`** (стек оверлеев + шит)

```tsx
import { useState } from "react";
import { BottomNav, type Tab } from "./components/BottomNav";
import { HomeScreen } from "./screens/HomeScreen";
import { DecksTab } from "./screens/DecksTab";
import { StatsScreen } from "./screens/StatsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { DeckDetailScreen } from "./screens/DeckDetailScreen";
import { WordSheet } from "./screens/WordSheet";
import { AddWordScreen } from "./screens/AddWordScreen";
import type { Deck, WordWithProgress } from "./api/types";

type Overlay = { type: "deck"; deck: Deck } | { type: "add"; deckId: string };

export function AppShell() {
  const [tab, setTab] = useState<Tab>("home");
  const [stack, setStack] = useState<Overlay[]>([]);
  const [sheetWord, setSheetWord] = useState<WordWithProgress | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const top = stack[stack.length - 1] ?? null;
  const back = () => setStack((s) => s.slice(0, -1));
  const openDeck = (deck: Deck) => setStack((s) => [...s, { type: "deck", deck }]);

  return (
    <>
      {tab === "home" ? <HomeScreen /> : null}
      {tab === "decks" ? <DecksTab key={reloadKey} onOpenDeck={(id) => openDeckById(id)} /> : null}
      {tab === "stats" ? <StatsScreen /> : null}
      {tab === "profile" ? <ProfileScreen /> : null}

      {top === null ? (
        <BottomNav
          tab={tab}
          onTab={(t) => {
            setStack([]);
            setTab(t);
          }}
          onLearn={() => {
            /* запуск тренажёра — План 10 */
          }}
        />
      ) : null}

      {top?.type === "deck" ? (
        <DeckDetailScreen
          key={top.deck.id}
          deck={top.deck}
          onBack={back}
          onWord={(w) => setSheetWord(w)}
          onAddWord={() => setStack((s) => [...s, { type: "add", deckId: top.deck.id }])}
          onLearn={() => {
            /* План 10 */
          }}
          onReview={() => {
            /* План 11 */
          }}
        />
      ) : null}

      {top?.type === "add" ? (
        <AddWordScreen
          deckId={top.deckId}
          onClose={back}
          onSaved={() => {
            back();
            setReloadKey((k) => k + 1);
          }}
        />
      ) : null}

      {sheetWord ? <WordSheet word={sheetWord} onClose={() => setSheetWord(null)} /> : null}
    </>
  );

  // Открыть колоду по id (нужны её данные). Подтягиваем из DecksTab через onOpenDeck,
  // но проще: DecksTab отдаёт Deck. Здесь — заглушка, заменяется ниже.
  function openDeckById(id: string) {
    void id;
  }
}
```

ВАЖНО: `DecksTab.onOpenDeck` сейчас отдаёт только `id`. Чтобы открыть деталь, нужен объект `Deck`. Поменяй контракт `DecksTab`: `onOpenDeck: (deck: Deck) => void` (передавать целиком колоду из карточки). Соответственно в `DecksTab.tsx` поменяй проп и вызовы `onClick={() => onOpenDeck(d)}`, а после `createDeck` — `onOpenDeck(deck)`. И в тесте DecksTab (Task 3) `onOpenDeck` будет вызван с объектом — обнови ассерт: `expect(onOpenDeck).toHaveBeenCalledWith(expect.objectContaining({ id: "9" }))`.

Затем в `AppShell` убери `openDeckById`-заглушку и используй:
```tsx
{tab === "decks" ? <DecksTab key={reloadKey} onOpenDeck={openDeck} /> : null}
```

- [ ] **Step 5: Полный прогон + типы + сборка**

Run: `cd client && npm test && npm run build`
Expected: всё зелёное; `tsc` чисто; `vite build` ок.

- [ ] **Step 6: Ручная проверка** — подними бэкенд + клиент, войди, открой вкладку «Колоды», создай колоду, открой, добавь слово (без Unsplash-ключа перевод придёт из MyMemory, картинок не будет — это ок), сохрани, увидь слово, тапни — откроется шит. Если есть preview-инструменты — сними скриншоты.

- [ ] **Step 7: Commit**

```bash
git add client/src/screens/AddWordScreen.tsx client/src/screens/__tests__/AddWordScreen.test.tsx client/src/AppShell.tsx client/src/screens/DecksTab.tsx client/src/screens/__tests__/DecksTab.test.tsx
git commit -m "Добавить экран добавления слова и связать навигацию каркаса"
```

---

## Self-Review

**Покрытие дизайна (колоды/деталь/шит/добавление):**
- Список колод (мои/встроенные) со статистикой X/Y + создание — Task 3 ✓
- Деталь колоды (оверлей): hero, прогресс, CTA, список слов с статусом/типом — Task 4 ✓
- Карточка слова (нижний шит): тайл/фото, озвучка, пример, мини-статы — Task 5 ✓
- Добавление слова: lookup (MyMemory+Unsplash) → черновик → выбор картинки → сохранение — Task 6 ✓
- Связка навигации: стек оверлеев + шит, нижняя навигация прячется под оверлеем — Task 6 ✓

**Адаптации к реальным данным:** `learned = progress.learned_at != null`; `current_type` 1-based → «Тип N»; `interval_days`/`total_reviews`; картинка — реальный `image_url` или плитка-плейсхолдер; озвучка — `audio_url` иначе Web Speech.

**Вне scope:** `nav.learn`/`nav.review` (Планы 10-11), дашборд/статистика/профиль реальные (План 9).

**Placeholder scan:** в финальном коде плейсхолдеров нет (заглушка `openDeckById` удаляется в Step 4 по инструкции — контракт `onOpenDeck` меняется на `Deck`).

**Type consistency:** `Deck`/`WordWithProgress`/`Progress` (Task 1) → все экраны. `WordDraft`/`NewWordInput` (wordsApi) → AddWord. `hueFromString`/`playWord` (Task 2) → DeckDetail/WordSheet. `onOpenDeck(deck: Deck)` согласован между DecksTab и AppShell. Оверлеи: `{type:'deck',deck}` / `{type:'add',deckId}`.
