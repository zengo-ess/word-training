# Frontend: Navigation & Decks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить навигацию (react-router), типизированный слой API колод/слов, экран списка колод с созданием и экран колоды со списком слов — в уже заданной эстетике «бумажные карточки».

**Architecture:** `react-router-dom` v6. Гейт авторизации (`App`) рендерит `AuthedApp` (роутер + топбар) при наличии токена, иначе `LoginScreen`. Доменные API-модули (`decksApi`) поверх `apiRequest`, токен берут из `getToken()`, для тестов принимают `fetchFn`. Загрузка данных — через хук `useAsync` (data/loading/error/reload). Экраны: `DecksScreen` (список + создание), `DeckScreen` (слова колоды). Добавление слова (lookup/картинки) — следующий план.

**Tech Stack:** React 18, react-router-dom 6, TypeScript, vitest + @testing-library/react.

---

## File Structure

```
client/src/
  hooks/
    useAsync.ts                 # {data, loading, error, reload}
    __tests__/useAsync.test.tsx
  api/
    types.ts                    # Deck, Word
    decksApi.ts                 # fetchDecks, createDeck, fetchDeckWords
    __tests__/decksApi.test.ts
  AuthedApp.tsx                 # роутер + топбар (бренд + выход)
  App.tsx                       # МОДИФИЦ.: гейт → AuthedApp / LoginScreen
  screens/
    DecksScreen.tsx
    DeckScreen.tsx
    HomeScreen.tsx              # УДАЛЯЕТСЯ (заменён DecksScreen как "/")
    __tests__/DecksScreen.test.tsx
    __tests__/DeckScreen.test.tsx
  __tests__/App.test.tsx        # МОДИФИЦ.: мок AuthedApp
  styles.css                    # ДОПОЛНЯЕТСЯ: классы списков/карточек колод/слов
```

**Конвенции (глобальные правила):** только `import`; никогда `required`; `id`/`key`/`testId` — guid; тест-файлы начинаются с двух eslint-disable строк; НЕ интеграционные тесты (api/экраны изолируем моками); НЕ тестируем `displayName`; импорты клиента — без расширений; коммит прямо в `main`.

---

### Task 1: Хук useAsync

**Files:**
- Create: `client/src/hooks/useAsync.ts`
- Test: `client/src/hooks/__tests__/useAsync.test.tsx`

- [ ] **Step 1: Написать падающий тест**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAsync } from "../useAsync";

describe("useAsync", () => {
  it("загружает данные и снимает loading", async () => {
    const { result } = renderHook(() => useAsync(() => Promise.resolve(42), []));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe(42);
    expect(result.current.error).toBeUndefined();
  });

  it("ловит ошибку и кладёт сообщение", async () => {
    const { result } = renderHook(() => useAsync(() => Promise.reject(new Error("Бум")), []));
    await waitFor(() => expect(result.current.error).toBe("Бум"));
    expect(result.current.loading).toBe(false);
  });

  it("reload перезапускает загрузку", async () => {
    let count = 0;
    const { result } = renderHook(() =>
      useAsync(() => {
        count += 1;
        return Promise.resolve(count);
      }, []),
    );
    await waitFor(() => expect(result.current.data).toBe(1));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toBe(2));
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd client && npx vitest run src/hooks/__tests__/useAsync.test.tsx`
Expected: FAIL — модуль `useAsync` не найден.

- [ ] **Step 3: Реализовать `client/src/hooks/useAsync.ts`**

```ts
import { useCallback, useEffect, useState } from "react";

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
  reload: () => void;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    fn()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Ошибка");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // deps управляют перезапуском намеренно; fn пересоздаётся каждый рендер
     
  }, [...deps, nonce]);

  return { data, loading, error, reload };
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd client && npx vitest run src/hooks/__tests__/useAsync.test.tsx`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/useAsync.ts client/src/hooks/__tests__/useAsync.test.tsx
git commit -m "Добавить хук useAsync"
```

---

### Task 2: Слой API колод

**Files:**
- Create: `client/src/api/types.ts`
- Create: `client/src/api/decksApi.ts`
- Test: `client/src/api/__tests__/decksApi.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import { fetchDecks, createDeck, fetchDeckWords } from "../decksApi";

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

describe("decksApi", () => {
  it("fetchDecks возвращает массив и шлёт токен", async () => {
    const captured: { value?: Captured } = {};
    const decks = await fetchDecks(mockFetch({ decks: [{ id: "a", name: "Колода", is_builtin: 0, created_at: "x" }] }, captured));
    expect(decks).toHaveLength(1);
    expect(decks[0].name).toBe("Колода");
    expect((captured.value?.init.headers as Record<string, string>).Authorization).toBe("Bearer T");
  });

  it("createDeck постит имя и возвращает колоду", async () => {
    const captured: { value?: Captured } = {};
    const deck = await createDeck("Моя", mockFetch({ deck: { id: "b", name: "Моя", is_builtin: 0, created_at: "x" } }, captured));
    expect(deck.name).toBe("Моя");
    expect(captured.value?.url).toBe("/api/decks");
    expect(captured.value?.init.method).toBe("POST");
    expect(captured.value?.init.body).toBe(JSON.stringify({ name: "Моя" }));
  });

  it("fetchDeckWords обращается к словам колоды", async () => {
    const captured: { value?: Captured } = {};
    const words = await fetchDeckWords("deck-1", mockFetch({ words: [] }, captured));
    expect(words).toEqual([]);
    expect(captured.value?.url).toBe("/api/decks/deck-1/words");
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd client && npx vitest run src/api/__tests__/decksApi.test.ts`
Expected: FAIL — модуль `decksApi` не найден.

- [ ] **Step 3: Реализовать `client/src/api/types.ts`**

```ts
export interface Deck {
  id: string;
  name: string;
  is_builtin: number;
  created_at: string;
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
```

- [ ] **Step 4: Реализовать `client/src/api/decksApi.ts`**

```ts
import { apiRequest } from "./http";
import { getToken } from "../auth/token";
import type { Deck, Word } from "./types";

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

export async function fetchDeckWords(deckId: string, fetchFn: typeof fetch = fetch): Promise<Word[]> {
  const data = await apiRequest<{ words: Word[] }>(
    `/api/decks/${deckId}/words`,
    { token: getToken() },
    fetchFn,
  );
  return data.words;
}
```

- [ ] **Step 5: Запустить тест — убедиться, что проходит**

Run: `cd client && npx vitest run src/api/__tests__/decksApi.test.ts`
Expected: PASS (3 теста).

- [ ] **Step 6: Commit**

```bash
git add client/src/api/types.ts client/src/api/decksApi.ts client/src/api/__tests__/decksApi.test.ts
git commit -m "Добавить слой API колод"
```

---

### Task 3: Роутер, AuthedApp и гейт

**Files:**
- Modify: `client/package.json` (добавить `react-router-dom`)
- Create: `client/src/AuthedApp.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/__tests__/App.test.tsx`
- Delete: `client/src/screens/HomeScreen.tsx`
- Modify: `client/src/styles.css` (добавить базовые классы компоновки)

- [ ] **Step 1: Добавить зависимость и установить**

В `client/package.json` в `dependencies` добавь `"react-router-dom": "^6.26.0"` (рядом с `react`/`react-dom`), затем:

Run: `cd client && npm install`
Expected: установка без ошибок.

- [ ] **Step 2: Создать `client/src/AuthedApp.tsx`** (DecksScreen/DeckScreen появятся в задачах 4-5; импорты на них добавляются здесь сразу)

```tsx
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { DecksScreen } from "./screens/DecksScreen";
import { DeckScreen } from "./screens/DeckScreen";

function TopBar() {
  const { logout } = useAuth();
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <span className="brand__mark" aria-hidden="true">
          Aa
        </span>
        <span className="brand__name">Словарь</span>
      </Link>
      <button className="btn btn--ghost" type="button" onClick={logout}>
        Выйти
      </button>
    </header>
  );
}

export function AuthedApp() {
  return (
    <BrowserRouter>
      <div className="screen">
        <TopBar />
        <Routes>
          <Route path="/" element={<DecksScreen />} />
          <Route path="/decks/:id" element={<DeckScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Заменить `client/src/App.tsx`**

```tsx
import { useAuth } from "./auth/AuthContext";
import { LoginScreen } from "./screens/LoginScreen";
import { AuthedApp } from "./AuthedApp";

export function App() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AuthedApp /> : <LoginScreen />;
}
```

- [ ] **Step 4: Заменить `client/src/__tests__/App.test.tsx`** (мокаем AuthedApp, чтобы гейт-тест не дергал сеть)

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "../App";

const authState = { isAuthenticated: false };

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ ...authState, login: vi.fn(), logout: vi.fn() }),
}));

vi.mock("../AuthedApp", () => ({
  AuthedApp: () => <div>authed-app</div>,
}));

describe("App (гейт авторизации)", () => {
  it("показывает экран входа без авторизации", () => {
    authState.isAuthenticated = false;
    render(<App />);
    expect(screen.getByRole("heading", { name: "Вход" })).toBeInTheDocument();
  });

  it("показывает приложение после авторизации", () => {
    authState.isAuthenticated = true;
    render(<App />);
    expect(screen.getByText("authed-app")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Удалить `client/src/screens/HomeScreen.tsx`**

Run: `cd client && git rm src/screens/HomeScreen.tsx`

- [ ] **Step 6: Дополнить `client/src/styles.css`** — добавь В КОНЕЦ файла:

```css
/* ===== Компоновка списков/групп ===== */
.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.muted-text {
  color: var(--muted);
  font-size: 15px;
  margin: 4px 0;
}

.group-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 6px 0 2px;
}

.pill {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--ink-soft);
  background: var(--paper-2);
  border-radius: 999px;
  padding: 3px 9px;
}

.btn--sm {
  padding: 9px 14px;
  font-size: 14px;
  border-radius: var(--r-sm);
}
```

- [ ] **Step 7: Проверить типы и тесты**

Run: `cd client && npx tsc --noEmit && npm test`
Expected: типы чисто; тесты PASS (App-гейт обновлён; остальные не затронуты). DecksScreen/DeckScreen ещё не существуют — `tsc` это поймает, поэтому задачи 4-5 нужно сделать до зелёного `tsc`. ВАЖНО: если `tsc`/тесты падают только из-за отсутствующих `./screens/DecksScreen` и `./screens/DeckScreen` — это ожидаемо на этом шаге; всё равно закоммить (Step 8), а зелёный прогон будет в конце Task 5. Если есть другие ошибки — почини.

- [ ] **Step 8: Commit**

```bash
git add client/package.json client/package-lock.json client/src/AuthedApp.tsx client/src/App.tsx client/src/__tests__/App.test.tsx client/src/styles.css
git commit -m "Добавить роутер, AuthedApp и обновить гейт авторизации"
```

---

### Task 4: Экран колод (список + создание)

**Files:**
- Create: `client/src/screens/DecksScreen.tsx`
- Test: `client/src/screens/__tests__/DecksScreen.test.tsx`
- Modify: `client/src/styles.css` (классы колод)

- [ ] **Step 1: Написать падающий тест**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DecksScreen } from "../DecksScreen";

const fetchDecksMock = vi.fn();
const createDeckMock = vi.fn();

vi.mock("../../api/decksApi", () => ({
  fetchDecks: () => fetchDecksMock(),
  createDeck: (name: string) => createDeckMock(name),
}));

function renderScreen() {
  return render(
    <MemoryRouter>
      <DecksScreen />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  fetchDecksMock.mockReset();
  createDeckMock.mockReset();
});

describe("DecksScreen", () => {
  it("показывает встроенные и пользовательские колоды", async () => {
    fetchDecksMock.mockResolvedValue([
      { id: "1", name: "Топ 100", is_builtin: 1, created_at: "x" },
      { id: "2", name: "Моя колода", is_builtin: 0, created_at: "x" },
    ]);
    renderScreen();
    await waitFor(() => expect(screen.getByText("Моя колода")).toBeInTheDocument());
    expect(screen.getByText("Топ 100")).toBeInTheDocument();
  });

  it("создаёт колоду и перезагружает список", async () => {
    fetchDecksMock.mockResolvedValue([]);
    createDeckMock.mockResolvedValue({ id: "3", name: "Новая", is_builtin: 0, created_at: "x" });
    const user = userEvent.setup();
    renderScreen();
    await waitFor(() => expect(fetchDecksMock).toHaveBeenCalledTimes(1));

    await user.type(screen.getByLabelText("Название колоды"), "Новая");
    await user.click(screen.getByRole("button", { name: "Создать" }));

    expect(createDeckMock).toHaveBeenCalledWith("Новая");
    await waitFor(() => expect(fetchDecksMock).toHaveBeenCalledTimes(2));
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd client && npx vitest run src/screens/__tests__/DecksScreen.test.tsx`
Expected: FAIL — модуль `DecksScreen` не найден.

- [ ] **Step 3: Реализовать `client/src/screens/DecksScreen.tsx`**

```tsx
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { fetchDecks, createDeck } from "../api/decksApi";
import { useAsync } from "../hooks/useAsync";
import type { Deck } from "../api/types";

function DeckCard({ deck }: { deck: Deck }) {
  return (
    <li>
      <Link to={`/decks/${deck.id}`} className="card deck-card">
        <span className="deck-card__name">{deck.name}</span>
        {deck.is_builtin ? <span className="pill">готовая</span> : null}
      </Link>
    </li>
  );
}

export function DecksScreen() {
  const { data: decks, loading, error, reload } = useAsync<Deck[]>(() => fetchDecks(), []);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const onCreate = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    setCreating(true);
    try {
      await createDeck(trimmed);
      setName("");
      reload();
    } finally {
      setCreating(false);
    }
  };

  const builtin = decks?.filter((d) => d.is_builtin) ?? [];
  const custom = decks?.filter((d) => !d.is_builtin) ?? [];

  return (
    <main className="stack">
      <h1 className="hero__title">Колоды</h1>

      <form className="create-deck" onSubmit={(e) => void onCreate(e)}>
        <input
          className="input"
          aria-label="Название колоды"
          placeholder="Новая колода"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn btn--primary btn--sm" type="submit" disabled={creating || name.trim().length === 0}>
          Создать
        </button>
      </form>

      {loading ? <p className="muted-text">Загрузка…</p> : null}
      {error ? (
        <p role="alert" className="alert">
          {error}
        </p>
      ) : null}

      {custom.length > 0 ? (
        <section className="deck-group">
          <h2 className="group-title">Мои колоды</h2>
          <ul className="deck-list">
            {custom.map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
          </ul>
        </section>
      ) : null}

      {builtin.length > 0 ? (
        <section className="deck-group">
          <h2 className="group-title">Готовые колоды</h2>
          <ul className="deck-list">
            {builtin.map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
          </ul>
        </section>
      ) : null}

      {!loading && decks && decks.length === 0 ? (
        <p className="muted-text">Пока нет колод. Создайте первую!</p>
      ) : null}
    </main>
  );
}
```

- [ ] **Step 4: Дополнить `client/src/styles.css`** — добавь В КОНЕЦ:

```css
/* ===== Колоды ===== */
.create-deck {
  display: flex;
  gap: 10px;
}

.create-deck .input {
  flex: 1;
}

.deck-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.deck-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.deck-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px;
  text-decoration: none;
  color: var(--ink);
  transition:
    transform 0.14s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.deck-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: 0 14px 30px -16px rgba(34, 28, 21, 0.32);
}

.deck-card__name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 18px;
  letter-spacing: -0.01em;
}
```

- [ ] **Step 5: Запустить тест — убедиться, что проходит**

Run: `cd client && npx vitest run src/screens/__tests__/DecksScreen.test.tsx`
Expected: PASS (2 теста).

- [ ] **Step 6: Commit**

```bash
git add client/src/screens/DecksScreen.tsx client/src/screens/__tests__/DecksScreen.test.tsx client/src/styles.css
git commit -m "Добавить экран колод со списком и созданием"
```

---

### Task 5: Экран колоды (список слов) + проверка

**Files:**
- Create: `client/src/screens/DeckScreen.tsx`
- Test: `client/src/screens/__tests__/DeckScreen.test.tsx`
- Modify: `client/src/styles.css` (классы слов)

- [ ] **Step 1: Написать падающий тест**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { DeckScreen } from "../DeckScreen";

const fetchDeckWordsMock = vi.fn();

vi.mock("../../api/decksApi", () => ({
  fetchDeckWords: (id: string) => fetchDeckWordsMock(id),
}));

function renderAt(deckId: string) {
  return render(
    <MemoryRouter initialEntries={[`/decks/${deckId}`]}>
      <Routes>
        <Route path="/decks/:id" element={<DeckScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  fetchDeckWordsMock.mockReset();
});

describe("DeckScreen", () => {
  it("показывает слова колоды", async () => {
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
      },
    ]);
    renderAt("d1");
    await waitFor(() => expect(screen.getByText("apple")).toBeInTheDocument());
    expect(screen.getByText("яблоко")).toBeInTheDocument();
    expect(fetchDeckWordsMock).toHaveBeenCalledWith("d1");
  });

  it("показывает пустое состояние", async () => {
    fetchDeckWordsMock.mockResolvedValue([]);
    renderAt("d2");
    await waitFor(() => expect(screen.getByText("В колоде пока нет слов.")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd client && npx vitest run src/screens/__tests__/DeckScreen.test.tsx`
Expected: FAIL — модуль `DeckScreen` не найден.

- [ ] **Step 3: Реализовать `client/src/screens/DeckScreen.tsx`**

```tsx
import { useParams } from "react-router-dom";
import { fetchDeckWords } from "../api/decksApi";
import { useAsync } from "../hooks/useAsync";
import type { Word } from "../api/types";

function WordCard({ word }: { word: Word }) {
  return (
    <li className="card word-card">
      {word.image_url ? (
        <img className="word-card__img" src={word.image_url} alt="" />
      ) : (
        <span className="word-card__img word-card__img--empty" aria-hidden="true">
          Aa
        </span>
      )}
      <span className="word-card__text">
        <span className="word-card__en">{word.english}</span>
        <span className="word-card__ru">{word.russian}</span>
      </span>
    </li>
  );
}

export function DeckScreen() {
  const { id = "" } = useParams();
  const { data: words, loading, error } = useAsync<Word[]>(() => fetchDeckWords(id), [id]);

  return (
    <main className="stack">
      <h1 className="hero__title">Слова</h1>

      {loading ? <p className="muted-text">Загрузка…</p> : null}
      {error ? (
        <p role="alert" className="alert">
          {error}
        </p>
      ) : null}
      {!loading && words && words.length === 0 ? (
        <p className="muted-text">В колоде пока нет слов.</p>
      ) : null}

      <ul className="word-list">
        {words?.map((word) => (
          <WordCard key={word.id} word={word} />
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: Дополнить `client/src/styles.css`** — добавь В КОНЕЦ:

```css
/* ===== Слова ===== */
.word-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.word-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
}

.word-card__img {
  width: 52px;
  height: 52px;
  border-radius: var(--r-sm);
  object-fit: cover;
  background: var(--paper-2);
  flex-shrink: 0;
}

.word-card__img--empty {
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--muted);
}

.word-card__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.word-card__en {
  font-weight: 600;
  font-size: 17px;
}

.word-card__ru {
  color: var(--ink-soft);
  font-size: 15px;
}
```

- [ ] **Step 5: Запустить тест — убедиться, что проходит**

Run: `cd client && npx vitest run src/screens/__tests__/DeckScreen.test.tsx`
Expected: PASS (2 теста).

- [ ] **Step 6: Полный прогон, типы и сборка**

Run: `cd client && npm test && npm run build`
Expected: все тесты PASS (useAsync, decksApi, App, http, token, authApi, AuthContext, LoginScreen, DecksScreen, DeckScreen); `tsc --noEmit` чисто; `vite build` собирает `dist/`.

- [ ] **Step 7: Ручная проверка end-to-end** (поднять бэкенд + клиент, пройти путь)

Run (бэкенд в фоне):
```bash
cd server
mkdir -p data
rm -f data/p5.sqlite
DB_FILE=data/p5.sqlite APP_PASSWORD=secret123 JWT_SECRET=dev npx tsx src/index.ts &
echo $! > /tmp/p5-server.pid
sleep 1
curl -s localhost:3001/api/health
```
Затем клиент: `cd client && npm run dev` — открыть http://localhost:5173, войти паролем `secret123`, создать колоду «Еда», открыть её (увидеть пустое состояние «В колоде пока нет слов.»). Останови бэкенд: `kill $(cat /tmp/p5-server.pid); rm -f server/data/p5.sqlite`.

Если есть доступ к preview-инструментам — используй их, чтобы снять скриншоты экрана колод и экрана колоды. Иначе опиши наблюдаемое.

- [ ] **Step 8: Commit**

```bash
git add client/src/screens/DeckScreen.tsx client/src/screens/__tests__/DeckScreen.test.tsx client/src/styles.css
git commit -m "Добавить экран колоды со списком слов"
```

---

## Self-Review

**Spec coverage (часть «колоды»):**
- `GET /api/decks` → список встроенных + пользовательских — Task 2, 4 ✓ (разделены на группы)
- `POST /api/decks` создать свою колоду — Task 2, 4 ✓
- `GET /api/decks/:id/words` → слова колоды — Task 2, 5 ✓
- Навигация между экранами — Task 3 (react-router) ✓
- Эстетика «бумажные карточки» — переиспользуем токены/классы + новые `.deck-card`/`.word-card` ✓

**Вне scope (следующий план):** добавление слова (lookup MyMemory + Unsplash + сохранение, кнопка «+ Слово» и маршрут `/decks/:id/add`) — План 6. Поэтому в Task 5 на экране колоды кнопки добавления пока нет.

**Placeholder scan:** плейсхолдеров нет.

**Type consistency:** `Deck`/`Word` (Task 2) используются в `decksApi`, `DecksScreen`, `DeckScreen`. `useAsync<T>` (Task 1) — в обоих экранах. `fetchDecks/createDeck/fetchDeckWords(…, fetchFn?)` согласованы с тестами (моки заменяют модуль `decksApi`). `AuthedApp` импортирует `DecksScreen`/`DeckScreen`, которые появляются в задачах 4-5 (поэтому зелёный `tsc`/`npm test` — в конце Task 5). Маршруты: `/` → DecksScreen, `/decks/:id` → DeckScreen.
