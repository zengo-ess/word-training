# Frontend: Design System & App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести дизайн-систему хэндоффа (`docs/design/handoff/`) в продакшн-клиент: токены/шрифты/анимации (светлая тема), `lucide-react`, общие UI-компоненты, и каркас приложения с таб-баром, оверлеями и нижним шитом. Рескин экрана входа. Табы пока с заглушками — реальные экраны в следующих планах.

**Architecture:** Дизайн-токены — CSS-переменные в `styles.css` (только светлая тема, акцент ocean `#3E84E0`, шрифты Comfortaa+Nunito). UI-примитивы — TS-компоненты с инлайновыми стилями поверх CSS-переменных (как в прототипе `app/ui.jsx`, 1:1 по виду). Навигация — состояние в `AppShell` (как `app/app.jsx`): `tab` + стек оверлеев + `sheetWord`, объект `nav` ({tab, deck, word, learn, review, addWord, back}). Оверлеи рендерятся поверх табов и прячут нижнюю навигацию; шит — поверх всего. `App` остаётся гейтом: нет токена → `LoginScreen`, есть → `AppShell`. react-router из Плана 5 больше не используется (его экраны/тесты удаляются и пересоберутся в Плане 8 под новую модель).

**Tech Stack:** React 18, TypeScript, lucide-react, vitest + @testing-library/react.

**Источник истины:** `docs/design/handoff/` — README.md, токены в `Тренажёр английских слов.html`, компоненты `app/ui.jsx`, навигация `app/app.jsx`. Сверяться при реализации.

---

## File Structure

```
client/
  index.html                         # МОДИФИЦ.: шрифты Comfortaa + Nunito
  package.json                       # МОДИФИЦ.: + lucide-react
  src/
    styles.css                       # ПЕРЕПИСЫВАЕТСЯ: токены хэндоффа (светлая тема) + анимации
    components/
      Icon.tsx                       # обёртка над lucide-react по имени
      Button.tsx  Card.tsx  Pill.tsx
      ProgressBar.tsx  Ring.tsx  IconBtn.tsx
      WordTile.tsx  Page.tsx  BottomNav.tsx
      __tests__/*.test.tsx
    AppShell.tsx                     # каркас: табы + оверлеи + шит (заменяет AuthedApp)
    App.tsx                          # МОДИФИЦ.: гейт → AppShell
    screens/
      LoginScreen.tsx                # РЕСКИН под токены
      HomeScreen.tsx DecksTab.tsx StatsScreen.tsx ProfileScreen.tsx  # ЗАГЛУШКИ (реальные — позже)
    AuthedApp.tsx                    # УДАЛЯЕТСЯ
    screens/DecksScreen.tsx          # УДАЛЯЕТСЯ (пересоберём в Плане 8)
    screens/DeckScreen.tsx           # УДАЛЯЕТСЯ (пересоберём в Плане 8)
    screens/__tests__/DecksScreen.test.tsx  # УДАЛЯЕТСЯ
    screens/__tests__/DeckScreen.test.tsx   # УДАЛЯЕТСЯ
```

**Конвенции:** только `import`; никогда `required`; `id`/`key`/`testId` — guid; тест-файлы начинаются с двух eslint-disable строк; НЕ интеграционные тесты; НЕ тестируем `displayName`; импорты без расширений; коммит в `main`. `useAsync`, `api/http`, `api/decksApi`, `api/types`, `auth/*` — НЕ трогаем (пригодятся в Плане 8).

---

### Task 1: Токены, шрифты, анимации, lucide + Icon

**Files:**
- Modify: `client/index.html` (шрифты)
- Modify: `client/package.json` (+ lucide-react), затем `npm install`
- Modify: `client/src/styles.css` (полный rewrite — токены светлой темы + база + анимации)
- Create: `client/src/components/Icon.tsx`
- Test: `client/src/components/__tests__/Icon.test.tsx`

- [ ] **Step 1: Заменить ссылку на шрифты в `client/index.html`** — заменить весь блок `<link ... Unbounded ...>` (и preconnect остаются) на Comfortaa+Nunito:

Замени строку со стилем шрифтов (Unbounded/Golos) на:

```html
    <link
      href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800;900&display=swap"
      rel="stylesheet"
    />
```
И обнови `<meta name="theme-color" content="#FBF4EA" />` (был `#FBF6EC`).

- [ ] **Step 2: Добавить зависимость** — в `client/package.json` в `dependencies` добавь `"lucide-react": "^0.456.0"`, затем `cd client && npm install` (ожидать успех).

- [ ] **Step 3: Переписать `client/src/styles.css`** целиком:

```css
/* ===== Дизайн-система (хэндофф): светлая тема, акцент ocean ===== */
:root {
  --backdrop: #ece2d4;
  --bg: #fbf4ea;
  --surface: #ffffff;
  --surface-2: #f4ece0;
  --ink: #3a2e26;
  --ink-soft: #6e5f53;
  --ink-mute: #a6968a;
  --line: #efe6d9;
  --line-strong: #e2d5c5;
  --track: #ece2d4;
  --nav-bg: rgba(255, 252, 247, 0.86);
  --nav-line: #efe6d9;

  --primary: #3e84e0;
  --primary-2: #2e6bd0;
  --on-primary: #ffffff;
  --primary-soft: #e1ecfb;
  --primary-ink: #2557a8;
  --primary-glow: rgba(62, 132, 224, 0.5);

  --amber: #f2a93b;
  --amber-soft: #fcefd2;
  --amber-ink: #946410;
  --success: #4fae6f;
  --success-soft: #def1e2;
  --success-ink: #2e7a48;
  --danger: #e5654b;
  --danger-soft: #fbe2db;
  --danger-ink: #b23a23;

  --r-card: 22px;
  --r-btn: 16px;
  --r-tile: 18px;

  --shadow-sm: 0 2px 10px -2px rgba(120, 80, 40, 0.1), 0 1px 2px rgba(120, 80, 40, 0.05);
  --shadow-md: 0 10px 26px -8px rgba(120, 80, 40, 0.16);

  --font: "Nunito", system-ui, -apple-system, sans-serif;
  --font-display: "Comfortaa", "Nunito", sans-serif;
  --mono: ui-monospace, "SF Mono", Menlo, monospace;

  color-scheme: light;
}

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}

#root {
  position: relative;
  max-width: 460px;
  margin: 0 auto;
  min-height: 100dvh;
  background: var(--bg);
}

button {
  font-family: var(--font);
}
input {
  font-family: var(--font);
}
::selection {
  background: var(--primary-soft);
}

/* Прокрутка без полосы */
.page-scroll::-webkit-scrollbar {
  width: 0;
}
.page-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Нажатия */
.btn-press {
  transition: transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.btn-press:active {
  transform: scale(0.94);
}
.card-tap {
  transition: transform 0.12s, box-shadow 0.15s;
  cursor: pointer;
}
.card-tap:active {
  transform: scale(0.985);
}

/* Анимации (только transform, без opacity:0 — контент виден на любом кадре) */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.spin {
  animation: spin 0.9s linear infinite;
  display: inline-flex;
}
@keyframes fadeUp {
  from {
    transform: translateY(10px);
  }
  to {
    transform: translateY(0);
  }
}
.fade-up {
  animation: fadeUp 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes exEnter {
  from {
    transform: translateX(18px);
  }
  to {
    transform: translateX(0);
  }
}
.ex-enter {
  animation: exEnter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes fbEnter {
  from {
    transform: translateY(24px);
  }
  to {
    transform: translateY(0);
  }
}
.fb-enter {
  animation: fbEnter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes pop {
  0% {
    transform: scale(0.5);
  }
  60% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}
.pop {
  animation: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes tilePop {
  from {
    transform: scale(0.6);
  }
  to {
    transform: scale(1);
  }
}
.tile-pop {
  animation: tilePop 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes sheetUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
.sheet-up {
  animation: sheetUp 0.32s cubic-bezier(0.32, 0.72, 0, 1);
}
@keyframes bdIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.sheet-backdrop {
  animation: bdIn 0.25s ease;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
  }
}
```

- [ ] **Step 4: Реализовать `client/src/components/Icon.tsx`**

```tsx
import {
  Home,
  Layers,
  Plus,
  BarChart3,
  Settings,
  Sparkles,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Flame,
  Search,
  Lock,
  Trophy,
  Target,
  Clock,
  Calendar,
  RefreshCw,
  BookOpen,
  Star,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  home: Home,
  layers: Layers,
  plus: Plus,
  chart: BarChart3,
  settings: Settings,
  sparkles: Sparkles,
  check: Check,
  x: X,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "volume-2": Volume2,
  flame: Flame,
  search: Search,
  lock: Lock,
  trophy: Trophy,
  target: Target,
  clock: Clock,
  calendar: Calendar,
  refresh: RefreshCw,
  book: BookOpen,
  star: Star,
};

export interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
  color?: string;
}

export function Icon({ name, size = 22, stroke = 2.2, color = "currentColor" }: IconProps) {
  const Cmp = MAP[name] ?? HelpCircle;
  return <Cmp size={size} strokeWidth={stroke} color={color} />;
}
```

- [ ] **Step 5: Тест `client/src/components/__tests__/Icon.test.tsx`**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Icon } from "../Icon";

describe("Icon", () => {
  it("рендерит svg по известному имени", () => {
    const { container } = render(<Icon name="home" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("рендерит запасную иконку для неизвестного имени", () => {
    const { container } = render(<Icon name="нет-такой" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Проверка** — `cd client && npx vitest run src/components/__tests__/Icon.test.tsx` → PASS (2). Затем `npx tsc --noEmit` — учти, что `AuthedApp.tsx`/`DecksScreen`/`DeckScreen` ещё существуют и компилируются (Icon их не ломает); если зелёно — отлично, если падает не из-за нашего кода — не трогай (их удалит Task 5). Достаточно зелёного теста Icon.

- [ ] **Step 7: Commit**

```bash
git add client/index.html client/package.json client/package-lock.json client/src/styles.css client/src/components/Icon.tsx client/src/components/__tests__/Icon.test.tsx
git commit -m "Перенести дизайн-токены хэндоффа, шрифты, анимации и lucide Icon"
```

---

### Task 2: Button, Card, Pill

**Files:**
- Create: `client/src/components/Button.tsx`, `Card.tsx`, `Pill.tsx`
- Test: `client/src/components/__tests__/Button.test.tsx`

- [ ] **Step 1: Тест `Button.test.tsx`**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../Button";

describe("Button", () => {
  it("рендерит текст и реагирует на клик", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Войти</Button>);
    await user.click(screen.getByRole("button", { name: "Войти" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("не вызывает onClick когда disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Войти
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Войти" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Запустить — FAIL (нет модуля). Затем реализовать `client/src/components/Button.tsx`**

```tsx
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";

type Variant = "primary" | "soft" | "ghost" | "surface" | "success" | "outline";
type Size = "lg" | "md" | "sm";

export interface ButtonProps {
  children?: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: string;
  iconRight?: string;
  full?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  style?: CSSProperties;
}

const VARIANTS: Record<Variant, CSSProperties> = {
  primary: {
    background: "var(--primary)",
    color: "var(--on-primary)",
    boxShadow: "0 6px 16px -6px var(--primary-glow), inset 0 -2px 0 rgba(0,0,0,0.12)",
  },
  soft: { background: "var(--primary-soft)", color: "var(--primary-ink)" },
  ghost: { background: "transparent", color: "var(--ink-soft)" },
  surface: { background: "var(--surface)", color: "var(--ink)", boxShadow: "var(--shadow-sm)" },
  success: { background: "var(--success)", color: "#fff", boxShadow: "0 6px 16px -6px var(--success)" },
  outline: { background: "transparent", color: "var(--ink)", boxShadow: "inset 0 0 0 2px var(--line)" },
};

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "lg",
  icon,
  iconRight,
  full,
  disabled,
  type = "button",
  style = {},
}: ButtonProps) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "var(--font)",
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
    borderRadius: "var(--r-btn)",
    transition: "transform .12s, box-shadow .12s, background .15s, opacity .15s",
    width: full ? "100%" : "auto",
    opacity: disabled ? 0.45 : 1,
    whiteSpace: "nowrap",
    fontSize: size === "lg" ? 17 : size === "sm" ? 14 : 16,
    padding: size === "lg" ? "16px 22px" : size === "sm" ? "9px 14px" : "12px 18px",
  };
  const iconSize = size === "lg" ? 20 : 18;
  return (
    <button
      className="btn-press"
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ ...base, ...VARIANTS[variant], ...style }}
    >
      {icon ? <Icon name={icon} size={iconSize} stroke={2.4} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={iconSize} stroke={2.4} /> : null}
    </button>
  );
}
```

- [ ] **Step 3: Реализовать `client/src/components/Card.tsx`**

```tsx
import type { CSSProperties, ReactNode } from "react";

export interface CardProps {
  children?: ReactNode;
  onClick?: () => void;
  pad?: number;
  style?: CSSProperties;
  className?: string;
}

export function Card({ children, onClick, pad = 16, style = {}, className = "" }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`${onClick ? "card-tap" : ""} ${className}`.trim()}
      style={{
        background: "var(--surface)",
        borderRadius: "var(--r-card)",
        padding: pad,
        boxShadow: "var(--shadow-sm)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Реализовать `client/src/components/Pill.tsx`**

```tsx
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";

type Tone = "neutral" | "primary" | "success" | "amber" | "danger";

export interface PillProps {
  children?: ReactNode;
  tone?: Tone;
  icon?: string;
  style?: CSSProperties;
}

const TONES: Record<Tone, CSSProperties> = {
  neutral: { background: "var(--surface-2)", color: "var(--ink-soft)" },
  primary: { background: "var(--primary-soft)", color: "var(--primary-ink)" },
  success: { background: "var(--success-soft)", color: "var(--success-ink)" },
  amber: { background: "var(--amber-soft)", color: "var(--amber-ink)" },
  danger: { background: "var(--danger-soft)", color: "var(--danger-ink)" },
};

export function Pill({ children, tone = "neutral", icon, style = {} }: PillProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--font)",
        whiteSpace: "nowrap",
        fontWeight: 700,
        fontSize: 12.5,
        padding: "5px 10px",
        borderRadius: 999,
        ...TONES[tone],
        ...style,
      }}
    >
      {icon ? <Icon name={icon} size={13} stroke={2.6} /> : null}
      {children}
    </span>
  );
}
```

- [ ] **Step 5: Запустить тест Button** — `cd client && npx vitest run src/components/__tests__/Button.test.tsx` → PASS (2).

- [ ] **Step 6: Commit**

```bash
git add client/src/components/Button.tsx client/src/components/Card.tsx client/src/components/Pill.tsx client/src/components/__tests__/Button.test.tsx
git commit -m "Добавить UI-компоненты Button, Card, Pill"
```

---

### Task 3: ProgressBar, Ring, IconBtn

**Files:**
- Create: `client/src/components/ProgressBar.tsx`, `Ring.tsx`, `IconBtn.tsx`
- Test: `client/src/components/__tests__/ProgressBar.test.tsx`

- [ ] **Step 1: Тест `ProgressBar.test.tsx`**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ProgressBar } from "../ProgressBar";

describe("ProgressBar", () => {
  it("ограничивает заполнение в пределах 0..100%", () => {
    const { container } = render(<ProgressBar value={150} max={100} />);
    const fill = container.firstElementChild?.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });

  it("считает процент от value/max", () => {
    const { container } = render(<ProgressBar value={5} max={20} />);
    const fill = container.firstElementChild?.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("25%");
  });
});
```

- [ ] **Step 2: Реализовать `client/src/components/ProgressBar.tsx`**

```tsx
export interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  bg?: string;
}

export function ProgressBar({
  value,
  max = 100,
  color = "var(--primary)",
  height = 8,
  bg = "var(--track)",
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ height, background: bg, borderRadius: 999, overflow: "hidden", width: "100%" }}>
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 999,
          transition: "width .5s cubic-bezier(.4,0,.2,1)",
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: Реализовать `client/src/components/Ring.tsx`**

```tsx
import type { ReactNode } from "react";

export interface RingProps {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}

export function Ring({ value, max = 100, size = 64, stroke = 7, color = "var(--primary)", children }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Реализовать `client/src/components/IconBtn.tsx`**

```tsx
import type { CSSProperties } from "react";
import { Icon } from "./Icon";

type Variant = "surface" | "plain" | "ghost";

export interface IconBtnProps {
  name: string;
  onClick?: () => void;
  size?: number;
  iconSize?: number;
  variant?: Variant;
  style?: CSSProperties;
  "aria-label"?: string;
}

const VARIANTS: Record<Variant, CSSProperties> = {
  surface: { background: "var(--surface)", boxShadow: "var(--shadow-sm)", color: "var(--ink)" },
  plain: { background: "var(--surface-2)", color: "var(--ink-soft)" },
  ghost: { background: "transparent", color: "var(--ink-soft)" },
};

export function IconBtn({
  name,
  onClick,
  size = 40,
  iconSize = 20,
  variant = "surface",
  style = {},
  "aria-label": ariaLabel,
}: IconBtnProps) {
  return (
    <button
      className="btn-press"
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...VARIANTS[variant],
        ...style,
      }}
    >
      <Icon name={name} size={iconSize} stroke={2.3} />
    </button>
  );
}
```

- [ ] **Step 5: Запустить тест ProgressBar** — `cd client && npx vitest run src/components/__tests__/ProgressBar.test.tsx` → PASS (2).

- [ ] **Step 6: Commit**

```bash
git add client/src/components/ProgressBar.tsx client/src/components/Ring.tsx client/src/components/IconBtn.tsx client/src/components/__tests__/ProgressBar.test.tsx
git commit -m "Добавить UI-компоненты ProgressBar, Ring, IconBtn"
```

---

### Task 4: WordTile, Page, BottomNav

**Files:**
- Create: `client/src/components/WordTile.tsx`, `Page.tsx`, `BottomNav.tsx`
- Test: `client/src/components/__tests__/BottomNav.test.tsx`

- [ ] **Step 1: Тест `BottomNav.test.tsx`**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomNav } from "../BottomNav";

describe("BottomNav", () => {
  it("переключает вкладку по клику", async () => {
    const onTab = vi.fn();
    const user = userEvent.setup();
    render(<BottomNav tab="home" onTab={onTab} onLearn={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Колоды" }));
    expect(onTab).toHaveBeenCalledWith("decks");
  });

  it("центральная кнопка запускает обучение", async () => {
    const onLearn = vi.fn();
    const user = userEvent.setup();
    render(<BottomNav tab="home" onTab={vi.fn()} onLearn={onLearn} />);
    await user.click(screen.getByRole("button", { name: "Учить" }));
    expect(onLearn).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Реализовать `client/src/components/WordTile.tsx`**

```tsx
import { Icon } from "./Icon";

export interface WordTileProps {
  icon: string;
  hue?: number;
  size?: number;
  round?: number;
  photo?: boolean;
}

export function WordTile({ icon, hue = 55, size = 88, round, photo }: WordTileProps) {
  const px = size;
  const iconSize = px * 0.42;
  const radius = round != null ? round : "var(--r-tile)";
  return (
    <div
      style={{
        width: px,
        height: px,
        borderRadius: radius,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(150deg, oklch(0.94 0.06 ${hue}), oklch(0.88 0.09 ${hue}))`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          background: `radial-gradient(120% 90% at 78% 18%, oklch(0.97 0.05 ${hue}) 0%, transparent 55%)`,
        }}
      />
      <Icon name={icon} size={iconSize} color={`oklch(0.45 0.13 ${hue})`} stroke={px > 120 ? 2 : 2.2} />
      {photo ? (
        <div
          style={{
            position: "absolute",
            bottom: 6,
            right: 6,
            fontFamily: "var(--mono)",
            fontSize: 9,
            letterSpacing: 0.3,
            color: `oklch(0.42 0.1 ${hue})`,
            background: "rgba(255,255,255,0.65)",
            padding: "2px 6px",
            borderRadius: 6,
            textTransform: "uppercase",
          }}
        >
          фото
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Реализовать `client/src/components/Page.tsx`** (в реальном приложении нет iOS-фрейма: скролл-контейнер с отступом снизу под нав-бар)

```tsx
import type { ReactNode } from "react";

export interface PageProps {
  children?: ReactNode;
  withNav?: boolean;
  pad?: boolean;
}

export function Page({ children, withNav = true, pad = true }: PageProps) {
  return (
    <div
      className="page-scroll"
      style={{
        minHeight: "100dvh",
        paddingTop: 20,
        paddingBottom: withNav ? 96 : 28,
        paddingLeft: pad ? 18 : 0,
        paddingRight: pad ? 18 : 0,
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Реализовать `client/src/components/BottomNav.tsx`** (фиксированный бар внизу колонки, центральная приподнятая кнопка)

```tsx
import { Icon } from "./Icon";

export type Tab = "home" | "decks" | "stats" | "profile";

export interface BottomNavProps {
  tab: Tab;
  onTab: (t: Tab) => void;
  onLearn: () => void;
}

const ITEMS: { key: Tab; icon: string; label: string }[] = [
  { key: "home", icon: "home", label: "Главная" },
  { key: "decks", icon: "layers", label: "Колоды" },
  { key: "stats", icon: "chart", label: "Прогресс" },
  { key: "profile", icon: "settings", label: "Профиль" },
];

export function BottomNav({ tab, onTab, onLearn }: BottomNavProps) {
  return (
    <nav
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: 0,
        width: "100%",
        maxWidth: 460,
        zIndex: 40,
        paddingBottom: 18,
        paddingTop: 8,
        background: "var(--nav-bg)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderTop: "1px solid var(--nav-line)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 12px" }}>
        {ITEMS.slice(0, 2).map((it) => (
          <NavBtn key={it.key} item={it} active={tab === it.key} onClick={() => onTab(it.key)} />
        ))}

        <button
          className="btn-press"
          type="button"
          aria-label="Учить"
          onClick={onLearn}
          style={{
            border: "none",
            cursor: "pointer",
            width: 58,
            height: 58,
            borderRadius: 20,
            marginTop: -22,
            background: "var(--primary)",
            color: "var(--on-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 22px -8px var(--primary-glow), inset 0 -3px 0 rgba(0,0,0,0.14)",
          }}
        >
          <Icon name="sparkles" size={26} stroke={2.4} />
        </button>

        {ITEMS.slice(2).map((it) => (
          <NavBtn key={it.key} item={it} active={tab === it.key} onClick={() => onTab(it.key)} />
        ))}
      </div>
    </nav>
  );
}

function NavBtn({
  item,
  active,
  onClick,
}: {
  item: { icon: string; label: string };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="btn-press"
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        padding: "4px 6px",
        width: 60,
        color: active ? "var(--primary)" : "var(--ink-mute)",
      }}
    >
      <Icon name={item.icon} size={23} stroke={active ? 2.6 : 2.1} />
      <span style={{ fontFamily: "var(--font)", fontSize: 10.5, fontWeight: active ? 800 : 600 }}>{item.label}</span>
    </button>
  );
}
```

- [ ] **Step 5: Запустить тест BottomNav** — `cd client && npx vitest run src/components/__tests__/BottomNav.test.tsx` → PASS (2).

- [ ] **Step 6: Commit**

```bash
git add client/src/components/WordTile.tsx client/src/components/Page.tsx client/src/components/BottomNav.tsx client/src/components/__tests__/BottomNav.test.tsx
git commit -m "Добавить UI-компоненты WordTile, Page, BottomNav"
```

---

### Task 5: Каркас приложения + рескин входа + заглушки табов

**Files:**
- Create: `client/src/AppShell.tsx`
- Create: `client/src/screens/HomeScreen.tsx`, `DecksTab.tsx`, `StatsScreen.tsx`, `ProfileScreen.tsx` (заглушки)
- Modify: `client/src/screens/LoginScreen.tsx` (рескин)
- Modify: `client/src/App.tsx`
- Modify: `client/src/__tests__/App.test.tsx`
- Delete: `client/src/AuthedApp.tsx`, `client/src/screens/DecksScreen.tsx`, `client/src/screens/DeckScreen.tsx`, и их тесты

- [ ] **Step 1: Удалить устаревшие файлы Плана 5 (модель навигации сменилась)**

```bash
cd client && git rm src/AuthedApp.tsx src/screens/DecksScreen.tsx src/screens/DeckScreen.tsx src/screens/__tests__/DecksScreen.test.tsx src/screens/__tests__/DeckScreen.test.tsx
```

- [ ] **Step 2: Создать заглушки-табы** — 4 файла одинаковой формы. `client/src/screens/HomeScreen.tsx`:

```tsx
import { Page } from "../components/Page";

export function HomeScreen() {
  return (
    <Page>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, margin: "8px 0 4px" }}>
        Привет! 👋
      </h1>
      <p style={{ color: "var(--ink-soft)" }}>Дашборд появится в следующем обновлении.</p>
    </Page>
  );
}
```

`client/src/screens/DecksTab.tsx`:

```tsx
import { Page } from "../components/Page";

export function DecksTab() {
  return (
    <Page>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, margin: "8px 0 4px" }}>Колоды</h1>
      <p style={{ color: "var(--ink-soft)" }}>Список колод появится в следующем обновлении.</p>
    </Page>
  );
}
```

`client/src/screens/StatsScreen.tsx`:

```tsx
import { Page } from "../components/Page";

export function StatsScreen() {
  return (
    <Page>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, margin: "8px 0 4px" }}>Прогресс</h1>
      <p style={{ color: "var(--ink-soft)" }}>Статистика появится в следующем обновлении.</p>
    </Page>
  );
}
```

`client/src/screens/ProfileScreen.tsx`:

```tsx
import { Page } from "../components/Page";
import { Button } from "../components/Button";
import { useAuth } from "../auth/AuthContext";

export function ProfileScreen() {
  const { logout } = useAuth();
  return (
    <Page>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, margin: "8px 0 12px" }}>Профиль</h1>
      <Button variant="outline" full onClick={logout}>
        Выйти
      </Button>
    </Page>
  );
}
```

- [ ] **Step 3: Создать `client/src/AppShell.tsx`** (навигация состоянием: табы + стек оверлеев + шит; пока оверлеи/шит не используются — задел на Планы 8-11)

```tsx
import { useState } from "react";
import { BottomNav, type Tab } from "./components/BottomNav";
import { HomeScreen } from "./screens/HomeScreen";
import { DecksTab } from "./screens/DecksTab";
import { StatsScreen } from "./screens/StatsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";

export function AppShell() {
  const [tab, setTab] = useState<Tab>("home");

  return (
    <>
      {tab === "home" ? <HomeScreen /> : null}
      {tab === "decks" ? <DecksTab /> : null}
      {tab === "stats" ? <StatsScreen /> : null}
      {tab === "profile" ? <ProfileScreen /> : null}

      <BottomNav
        tab={tab}
        onTab={setTab}
        onLearn={() => {
          /* запуск тренажёра — План 10 */
        }}
      />
    </>
  );
}
```

- [ ] **Step 4: Рескин `client/src/screens/LoginScreen.tsx`** (новые токены/компоненты; семантику сохраняем: заголовок «Вход», `aria-label="Пароль"`, кнопка «Войти», `role="alert"`)

```tsx
import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

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
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 22,
      }}
    >
      <Card pad={24} className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 40,
              height: 40,
              borderRadius: 13,
              background: "var(--primary)",
              color: "var(--on-primary)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 17,
            }}
            aria-hidden="true"
          >
            Aa
          </span>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>Словарь</span>
        </span>

        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, margin: "4px 0 2px" }}>
            Вход
          </h1>
          <p style={{ color: "var(--ink-mute)", margin: 0, fontSize: 15 }}>Тренажёр английских слов</p>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)" }}>Пароль</span>
            <input
              type="password"
              aria-label="Пароль"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "13px 15px",
                fontSize: 16,
                color: "var(--ink)",
                background: "var(--surface)",
                border: "1.5px solid var(--line-strong)",
                borderRadius: "var(--r-btn)",
                outline: "none",
              }}
            />
          </label>
          <Button type="submit" full disabled={loading || password.length === 0}>
            {loading ? "Входим…" : "Войти"}
          </Button>
          {error.length > 0 ? (
            <p
              role="alert"
              style={{
                margin: 0,
                padding: "11px 14px",
                borderRadius: "var(--r-btn)",
                background: "var(--danger-soft)",
                color: "var(--danger-ink)",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {error}
            </p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Заменить `client/src/App.tsx`**

```tsx
import { useAuth } from "./auth/AuthContext";
import { LoginScreen } from "./screens/LoginScreen";
import { AppShell } from "./AppShell";

export function App() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppShell /> : <LoginScreen />;
}
```

- [ ] **Step 6: Заменить `client/src/__tests__/App.test.tsx`** (мок AppShell вместо AuthedApp)

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

vi.mock("../AppShell", () => ({
  AppShell: () => <div>app-shell</div>,
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
    expect(screen.getByText("app-shell")).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Полный прогон, типы, сборка**

Run: `cd client && npm test && npm run build`
Expected: все тесты PASS (Icon, Button, ProgressBar, BottomNav, App, http, token, authApi, AuthContext, LoginScreen, useAsync, decksApi); `tsc --noEmit` чисто; `vite build` собирает `dist/`.

Примечание: тест `LoginScreen.test.tsx` из Плана 4 проверяет `getByLabelText("Пароль")`, кнопку «Войти», `role="alert"` и блокировку кнопки — рескин это сохраняет, тест должен оставаться зелёным. `decksApi.test.ts`/`useAsync.test.tsx` не затронуты.

- [ ] **Step 8: Ручная проверка**

Подними клиент (`cd client && npm run dev`) и бэкенд (для входа). Войди — увидишь таб-бар (Главная/Колоды + центральная кнопка + Прогресс/Профиль) и экран «Привет! 👋». Переключи вкладки. Если есть preview-инструменты — сними скриншоты входа и дашборд-заглушки с таб-баром.

- [ ] **Step 9: Commit**

```bash
git add client/src/AppShell.tsx client/src/App.tsx client/src/__tests__/App.test.tsx client/src/screens/LoginScreen.tsx client/src/screens/HomeScreen.tsx client/src/screens/DecksTab.tsx client/src/screens/StatsScreen.tsx client/src/screens/ProfileScreen.tsx
git commit -m "Собрать каркас с таб-баром, заглушки табов и рескин входа"
```

---

## Self-Review

**Spec/handoff coverage (фундамент):**
- Токены светлой темы (ocean), шрифты Comfortaa+Nunito, тёплые тени, soft-скругления, анимации — Task 1 ✓
- lucide-react + Icon-обёртка — Task 1 ✓
- UI-примитивы (Button/Card/Pill/ProgressBar/Ring/IconBtn/WordTile/Page/BottomNav) 1:1 с `app/ui.jsx` — Tasks 2-4 ✓
- Каркас: табы + центральная кнопка + задел под оверлеи/шит (модель из `app/app.jsx`) — Task 5 ✓
- Вход остаётся гейтом, рескин под токены — Task 5 ✓

**Вне scope (следующие планы):** реальные экраны колод/деталь/шит/добавление (План 8), дашборд/статистика/профиль (План 9), тренажёр (10), повтор (11); бэкенд-добавки прогресса/статистики/стрика (План 7). Тёмная тема и пикер акцентов — отложены (только дефолт).

**Placeholder scan:** в коде плейсхолдеров нет; экраны-заглушки табов — намеренные (помечены, заменяются в Планах 8-9).

**Удаления:** `AuthedApp`, `DecksScreen`, `DeckScreen` и их тесты удаляются (Task 5), т.к. модель навигации сменилась с react-router на состояние. `useAsync`, `api/*`, `auth/*` сохраняются для переиспользования.

**Type consistency:** `Tab` (BottomNav) используется в `AppShell`. `Icon name` — строковые имена из карты `MAP`. `Button`/`Card`/`Pill`/`IconBtn` props согласованы с использованием в LoginScreen/ProfileScreen. `nav`-модель (deck/learn/review/addWord/back) пока не реализована в AppShell — вводится в Плане 8 (помечено комментарием).
