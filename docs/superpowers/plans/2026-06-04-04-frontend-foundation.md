# Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Поднять фронтенд на Vite + React + TypeScript: HTTP-клиент, авторизацию по паролю (хранение JWT, контекст), экран входа и каркас приложения с гейтом авторизации.

**Architecture:** `client/` со своим `package.json`. Vite + React 18 + TS (bundler-резолюция — импорты БЕЗ расширений). Тонкий `apiRequest` (fetch-обёртка с инъекцией `fetch`, JSON, токен, ошибки). Слой авторизации: хранение токена в `localStorage`, `authApi.login`, `AuthProvider` + `useAuth`. `App` — гейт: нет токена → `LoginScreen`, есть → `HomeScreen` (заглушка с выходом). Тесты — vitest + jsdom + @testing-library/react, компоненты изолированы (моки модулей), без интеграционных тестов. Роутинг (react-router) и реальные экраны — следующий план.

**Tech Stack:** Vite 5, React 18, TypeScript, vitest, jsdom, @testing-library/react.

---

## File Structure

```
/client
  package.json
  tsconfig.json
  vite.config.ts            # plugins react, proxy /api+/uploads → :3001, vitest test config
  index.html
  /src
    main.tsx                # точка входа: AuthProvider + App
    App.tsx                 # гейт авторизации
    styles.css              # mobile-first база
    test-setup.tsx          # @testing-library/jest-dom (общий setup тестов)
    /api
      http.ts               # apiRequest<T>
      __tests__/http.test.ts
    /auth
      token.ts              # get/save/clear токена (localStorage)
      authApi.ts            # login(password)
      AuthContext.tsx       # AuthProvider + useAuth
      __tests__/token.test.ts
      __tests__/authApi.test.ts
      __tests__/AuthContext.test.tsx
    /screens
      LoginScreen.tsx
      HomeScreen.tsx
      __tests__/LoginScreen.test.tsx
```

**Конвенции (глобальные правила пользователя):**
- Только `import`, никогда `require`. Никогда слова `required`.
- Импорты в client — БЕЗ расширений (Vite/bundler), в отличие от server.
- Все `id`/`key`/`testId` — guid, не `"1"`/`"test"`.
- Тест-файлы начинаются с двух строк:
  ```
  /* eslint-disable @typescript-eslint/no-unsafe-call */
  /* eslint-disable sonarjs/no-duplicate-string */
  ```
- НЕ интеграционные тесты (компоненты изолируем, зависимости мокаем). НЕ тестируем `displayName`.
- Общий setup тестов — `src/test-setup.tsx` (здесь только `@testing-library/jest-dom`; `@fractal` в этом проекте не используется).
- Коммитим прямо в `main`.

---

### Task 1: Каркас клиента (Vite + React + TS + vitest)

**Files:**
- Create: `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts`, `client/index.html`
- Create: `client/src/main.tsx`, `client/src/App.tsx`, `client/src/styles.css`, `client/src/test-setup.tsx`
- Test: `client/src/__tests__/App.test.tsx`

- [ ] **Step 1: Создать `client/package.json`**

```json
{
  "name": "word-training-client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Создать `client/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 3: Создать `client/vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/uploads": "http://localhost:3001",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.tsx"],
  },
});
```

- [ ] **Step 4: Создать `client/index.html`**

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Тренажёр слов</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Создать `client/src/test-setup.tsx`**

```tsx
import "@testing-library/jest-dom";
```

- [ ] **Step 6: Создать `client/src/styles.css`**

```css
:root {
  --bg: #f5f6f8;
  --card: #ffffff;
  --text: #1c1d22;
  --muted: #6b6f76;
  --accent: #4c6ef5;
  --danger: #e03131;
  --radius: 12px;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  min-height: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
}

#root {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
}

button {
  font: inherit;
  border: none;
  border-radius: var(--radius);
  padding: 12px 16px;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: default;
}

input {
  font: inherit;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d0d3d9;
  border-radius: var(--radius);
  background: var(--card);
}
```

- [ ] **Step 7: Создать `client/src/App.tsx`** (временная заглушка — Task 6 заменит на гейт авторизации)

```tsx
export function App() {
  return <h1>Тренажёр слов</h1>;
}
```

- [ ] **Step 8: Создать `client/src/main.tsx`** (Task 6 обернёт в AuthProvider)

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
```

- [ ] **Step 9: Создать smoke-тест `client/src/__tests__/App.test.tsx`**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "../App";

describe("App", () => {
  it("рендерит заголовок приложения", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Тренажёр слов" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Установить зависимости**

Run: `cd client && npm install`
Expected: установка без ошибок, появляется `package-lock.json`.

- [ ] **Step 11: Прогнать тест и сборку**

Run: `cd client && npm test && npm run build`
Expected: smoke-тест PASS; `tsc --noEmit` без ошибок; `vite build` собирает `dist/`.

- [ ] **Step 12: Commit**

```bash
git add client/package.json client/tsconfig.json client/vite.config.ts client/index.html client/src/main.tsx client/src/App.tsx client/src/styles.css client/src/test-setup.tsx client/src/__tests__/App.test.tsx client/package-lock.json
git commit -m "Инициализировать клиент: Vite + React + TS + vitest"
```

Заметка: `client/node_modules/` и `client/dist/` уже покрыты корневым `.gitignore` (`node_modules/`, `dist/`).

---

### Task 2: HTTP-клиент

**Files:**
- Create: `client/src/api/http.ts`
- Test: `client/src/api/__tests__/http.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { apiRequest } from "../http";

interface Captured {
  url: string;
  init: RequestInit;
}

function mockFetch(
  status: number,
  body: unknown,
  captured?: { value?: Captured },
): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    if (captured) {
      captured.value = { url, init };
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  }) as unknown as typeof fetch;
}

describe("apiRequest", () => {
  it("возвращает распарсенный JSON при успехе", async () => {
    const data = await apiRequest<{ hello: string }>("/api/x", {}, mockFetch(200, { hello: "мир" }));
    expect(data.hello).toBe("мир");
  });

  it("шлёт тело JSON и Content-Type для POST", async () => {
    const captured: { value?: Captured } = {};
    await apiRequest("/api/x", { method: "POST", body: { a: 1 } }, mockFetch(200, {}, captured));
    expect(captured.value?.init.method).toBe("POST");
    expect(captured.value?.init.body).toBe(JSON.stringify({ a: 1 }));
    expect((captured.value?.init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("добавляет Bearer-токен", async () => {
    const captured: { value?: Captured } = {};
    await apiRequest("/api/x", { token: "T" }, mockFetch(200, {}, captured));
    expect((captured.value?.init.headers as Record<string, string>).Authorization).toBe("Bearer T");
  });

  it("возвращает undefined при 204", async () => {
    const data = await apiRequest<undefined>("/api/x", { method: "DELETE" }, mockFetch(204, null));
    expect(data).toBeUndefined();
  });

  it("бросает ошибку с status и сообщением из тела при не-ok", async () => {
    await expect(
      apiRequest("/api/x", {}, mockFetch(401, { error: "Неверный пароль" })),
    ).rejects.toMatchObject({ status: 401, message: "Неверный пароль" });
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd client && npx vitest run src/api/__tests__/http.test.ts`
Expected: FAIL — модуль `http` не найден.

- [ ] **Step 3: Реализовать `client/src/api/http.ts`**

```ts
export interface ApiError extends Error {
  status: number;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

async function extractError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown };
    if (data && typeof data.error === "string") {
      return data.error;
    }
  } catch {
    // тело не JSON — используем дефолт ниже
  }
  return "Ошибка запроса";
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  fetchFn: typeof fetch = fetch,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetchFn(path, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = new Error(await extractError(response)) as ApiError;
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd client && npx vitest run src/api/__tests__/http.test.ts`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add client/src/api/http.ts client/src/api/__tests__/http.test.ts
git commit -m "Добавить HTTP-клиент фронтенда"
```

---

### Task 3: Хранение токена и authApi

**Files:**
- Create: `client/src/auth/token.ts`
- Create: `client/src/auth/authApi.ts`
- Test: `client/src/auth/__tests__/token.test.ts`
- Test: `client/src/auth/__tests__/authApi.test.ts`

- [ ] **Step 1: Написать падающие тесты**

`client/src/auth/__tests__/token.test.ts`:

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import { getToken, saveToken, clearToken } from "../token";

beforeEach(() => {
  localStorage.clear();
});

describe("token storage", () => {
  it("сохраняет и читает токен", () => {
    saveToken("abc");
    expect(getToken()).toBe("abc");
  });

  it("getToken возвращает null без токена", () => {
    expect(getToken()).toBeNull();
  });

  it("clearToken удаляет токен", () => {
    saveToken("abc");
    clearToken();
    expect(getToken()).toBeNull();
  });
});
```

`client/src/auth/__tests__/authApi.test.ts`:

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { login } from "../authApi";

function mockFetch(status: number, body: unknown): typeof fetch {
  return (async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe("login", () => {
  it("возвращает токен при успехе", async () => {
    const token = await login("secret", mockFetch(200, { token: "JWT" }));
    expect(token).toBe("JWT");
  });

  it("пробрасывает ошибку при неверном пароле", async () => {
    await expect(login("bad", mockFetch(401, { error: "Неверный пароль" }))).rejects.toThrow(
      "Неверный пароль",
    );
  });
});
```

- [ ] **Step 2: Запустить тесты — убедиться, что падают**

Run: `cd client && npx vitest run src/auth/__tests__/token.test.ts src/auth/__tests__/authApi.test.ts`
Expected: FAIL — модули не найдены.

- [ ] **Step 3: Реализовать `client/src/auth/token.ts`**

```ts
const TOKEN_KEY = "wt_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
```

- [ ] **Step 4: Реализовать `client/src/auth/authApi.ts`**

```ts
import { apiRequest } from "../api/http";

export async function login(password: string, fetchFn: typeof fetch = fetch): Promise<string> {
  const data = await apiRequest<{ token: string }>(
    "/api/auth/login",
    { method: "POST", body: { password } },
    fetchFn,
  );
  return data.token;
}
```

- [ ] **Step 5: Запустить тесты — убедиться, что проходят**

Run: `cd client && npx vitest run src/auth/__tests__/token.test.ts src/auth/__tests__/authApi.test.ts`
Expected: PASS (token 3 + authApi 2).

- [ ] **Step 6: Commit**

```bash
git add client/src/auth/token.ts client/src/auth/authApi.ts client/src/auth/__tests__/token.test.ts client/src/auth/__tests__/authApi.test.ts
git commit -m "Добавить хранение токена и authApi"
```

---

### Task 4: Контекст авторизации

**Files:**
- Create: `client/src/auth/AuthContext.tsx`
- Test: `client/src/auth/__tests__/AuthContext.test.tsx`

- [ ] **Step 1: Написать падающий тест**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";

vi.mock("../authApi", () => ({
  login: vi.fn(async (password: string) => (password === "ok" ? "JWT" : Promise.reject(new Error("Неверный пароль")))),
}));

function Probe() {
  const { isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="state">{isAuthenticated ? "in" : "out"}</span>
      <button type="button" onClick={() => void login("ok")}>
        войти
      </button>
      <button type="button" onClick={logout}>
        выйти
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("AuthProvider / useAuth", () => {
  it("стартует разлогиненным и логинится с сохранением токена", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId("state")).toHaveTextContent("out");

    await act(async () => {
      screen.getByRole("button", { name: "войти" }).click();
    });

    expect(screen.getByTestId("state")).toHaveTextContent("in");
    expect(localStorage.getItem("wt_token")).toBe("JWT");
  });

  it("logout очищает токен и состояние", async () => {
    localStorage.setItem("wt_token", "JWT");
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByTestId("state")).toHaveTextContent("in");

    await act(async () => {
      screen.getByRole("button", { name: "выйти" }).click();
    });

    expect(screen.getByTestId("state")).toHaveTextContent("out");
    expect(localStorage.getItem("wt_token")).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd client && npx vitest run src/auth/__tests__/AuthContext.test.tsx`
Expected: FAIL — модуль `AuthContext` не найден.

- [ ] **Step 3: Реализовать `client/src/auth/AuthContext.tsx`**

```tsx
import { createContext, useContext, useState, type ReactNode } from "react";
import { clearToken, getToken, saveToken } from "./token";
import { login as loginApi } from "./authApi";

interface AuthValue {
  isAuthenticated: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken());

  const login = async (password: string): Promise<void> => {
    const newToken = await loginApi(password);
    saveToken(newToken);
    setToken(newToken);
  };

  const logout = (): void => {
    clearToken();
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: token !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth вызван вне AuthProvider");
  }
  return ctx;
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd client && npx vitest run src/auth/__tests__/AuthContext.test.tsx`
Expected: PASS (2 теста).

- [ ] **Step 5: Commit**

```bash
git add client/src/auth/AuthContext.tsx client/src/auth/__tests__/AuthContext.test.tsx
git commit -m "Добавить контекст авторизации"
```

---

### Task 5: Экран входа

**Files:**
- Create: `client/src/screens/LoginScreen.tsx`
- Test: `client/src/screens/__tests__/LoginScreen.test.tsx`

- [ ] **Step 1: Написать падающий тест**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginScreen } from "../LoginScreen";

const loginMock = vi.fn();

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false, login: loginMock, logout: vi.fn() }),
}));

beforeEach(() => {
  loginMock.mockReset();
});

describe("LoginScreen", () => {
  it("вызывает login с введённым паролем", async () => {
    loginMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.type(screen.getByLabelText("Пароль"), "secret");
    await user.click(screen.getByRole("button", { name: "Войти" }));

    expect(loginMock).toHaveBeenCalledWith("secret");
  });

  it("показывает ошибку при неудачном входе", async () => {
    loginMock.mockRejectedValue(new Error("Неверный пароль"));
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.type(screen.getByLabelText("Пароль"), "bad");
    await user.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Неверный пароль");
    });
  });

  it("кнопка заблокирована при пустом пароле", () => {
    render(<LoginScreen />);
    expect(screen.getByRole("button", { name: "Войти" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `cd client && npx vitest run src/screens/__tests__/LoginScreen.test.tsx`
Expected: FAIL — модуль `LoginScreen` не найден.

- [ ] **Step 3: Реализовать `client/src/screens/LoginScreen.tsx`**

```tsx
import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";

export function LoginScreen() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(password);
    } catch {
      setError("Неверный пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login" onSubmit={(e) => void onSubmit(e)}>
      <h1>Вход</h1>
      <input
        type="password"
        aria-label="Пароль"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" disabled={loading || password.length === 0}>
        {loading ? "Вход…" : "Войти"}
      </button>
      {error.length > 0 && (
        <p role="alert" className="login__error">
          {error}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `cd client && npx vitest run src/screens/__tests__/LoginScreen.test.tsx`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add client/src/screens/LoginScreen.tsx client/src/screens/__tests__/LoginScreen.test.tsx
git commit -m "Добавить экран входа"
```

---

### Task 6: Гейт авторизации и сборка приложения

**Files:**
- Create: `client/src/screens/HomeScreen.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/main.tsx`
- Test: `client/src/__tests__/App.test.tsx` (заменить)

- [ ] **Step 1: Создать `client/src/screens/HomeScreen.tsx`** (заглушка с выходом — реальные экраны в следующем плане)

```tsx
import { useAuth } from "../auth/AuthContext";

export function HomeScreen() {
  const { logout } = useAuth();
  return (
    <section className="home">
      <h1>Тренажёр слов</h1>
      <p>Вы вошли. Колоды и тренировки появятся в следующем обновлении.</p>
      <button type="button" onClick={logout}>
        Выйти
      </button>
    </section>
  );
}
```

- [ ] **Step 2: Заменить `client/src/App.tsx`** на гейт авторизации

```tsx
import { useAuth } from "./auth/AuthContext";
import { LoginScreen } from "./screens/LoginScreen";
import { HomeScreen } from "./screens/HomeScreen";

export function App() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <HomeScreen /> : <LoginScreen />;
}
```

- [ ] **Step 3: Заменить `client/src/main.tsx`** — обернуть в AuthProvider

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./auth/AuthContext";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  );
}
```

- [ ] **Step 4: Заменить `client/src/__tests__/App.test.tsx`** — проверить гейт

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

describe("App (гейт авторизации)", () => {
  it("показывает экран входа без авторизации", () => {
    authState.isAuthenticated = false;
    render(<App />);
    expect(screen.getByRole("heading", { name: "Вход" })).toBeInTheDocument();
  });

  it("показывает домашний экран после авторизации", () => {
    authState.isAuthenticated = true;
    render(<App />);
    expect(screen.getByRole("button", { name: "Выйти" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Прогнать весь сьют, типы и сборку**

Run: `cd client && npm test && npm run build`
Expected: все тесты PASS (App, http, token, authApi, AuthContext, LoginScreen); `tsc --noEmit` чисто; `vite build` собирает `dist/`.

- [ ] **Step 6: Ручная проверка отдачи фронта**

Run:
```bash
cd client
npm run build
npx vite preview --port 4173 &
PREVIEW_PID=$!
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" localhost:4173/
curl -s localhost:4173/ | grep -o '<title>[^<]*</title>'
kill $PREVIEW_PID
```
Expected: `200` и `<title>Тренажёр слов</title>`.

- [ ] **Step 7: Commit**

```bash
git add client/src/screens/HomeScreen.tsx client/src/App.tsx client/src/main.tsx client/src/__tests__/App.test.tsx
git commit -m "Собрать гейт авторизации и каркас приложения"
```

---

## Self-Review

**Spec coverage (для этого плана — фундамент фронтенда):**
- Vite + React + TS, mobile-first (`viewport`, узкий контейнер, базовый CSS) — Task 1 ✓
- Прокси `/api` и `/uploads` на бэкенд `:3001` — Task 1 (`vite.config.ts`) ✓
- Вход по паролю → JWT, хранение токена — Tasks 2-5 ✓
- Гейт: без токена — экран входа, с токеном — приложение — Task 6 ✓

**Вне scope (следующие планы):** экран колод и добавление слова (План 5), 5 типов упражнений (План 6), повторения/статистика (План 7), роутинг между экранами (вводится в Плане 5), сборка в Docker (План деплоя). Здесь нет `react-router` намеренно (YAGNI до появления нескольких экранов).

**Placeholder scan:** плейсхолдеров нет — весь код приведён целиком.

**Type consistency:** `apiRequest<T>(path, options, fetchFn?)` (Task 2) используется в `authApi.login` (Task 3). `AuthValue { isAuthenticated, login, logout }` (Task 4) используется в `LoginScreen`/`HomeScreen`/`App` (Tasks 5-6). Импорты клиента — без расширений (Vite). Тестовый мок `useAuth` повторяет сигнатуру контекста. `getToken/saveToken/clearToken` (Task 3) используются в `AuthContext` (Task 4).
