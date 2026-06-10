# Frontend: Home Dashboard, Stats & Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить три заглушки (HomeScreen, StatsScreen, ProfileScreen) реальными экранами по дизайну `docs/design/handoff/app/screens-home.jsx`, подключёнными к `/api/stats`.

**Architecture:** Бэкенд получает поле `week` (7 булевых флагов последних дней) в ответе `/api/stats`. Клиент: новый `statsApi.ts` + тип `Stats` в `types.ts`. Три экрана получают props из `AppShell`: `onLearn`, `onReview` (заглушки, Планы 10-11), `onOpenDeck: (deck: Deck) => void`. Все три экрана — инлайн-стили по хэндоффу; никакой новой логики навигации, только отображение.

**Tech Stack:** React 18, TS, lucide-react, vitest + @testing-library/react.

**Источник истины:** `docs/design/handoff/app/screens-home.jsx`

---

## File Structure

```
server/src/stats/stats.service.ts          # МОДИФИЦ.: добавить week: boolean[]
client/src/api/types.ts                    # МОДИФИЦ.: добавить Stats interface
client/src/api/statsApi.ts                 # НОВЫЙ: fetchStats()
client/src/api/__tests__/statsApi.test.ts  # НОВЫЙ: тест fetchStats
client/src/screens/HomeScreen.tsx          # ЗАМЕНА заглушки
client/src/screens/StatsScreen.tsx         # ЗАМЕНА заглушки
client/src/screens/ProfileScreen.tsx       # ЗАМЕНА заглушки
client/src/screens/__tests__/HomeScreen.test.tsx   # НОВЫЙ
client/src/screens/__tests__/StatsScreen.test.tsx  # НОВЫЙ
client/src/screens/__tests__/ProfileScreen.test.tsx # НОВЫЙ
client/src/AppShell.tsx                    # МОДИФИЦ.: props для HomeScreen/StatsScreen
```

**Конвенции:** только `import`; тест-файлы с двумя eslint-disable; НЕ интеграционные тесты; НЕ тестируем `displayName`; коммит в `main`.

---

### Task 1: Добавить week в Stats API + создать statsApi на клиенте

**Files:**
- Modify: `server/src/stats/stats.service.ts`
- Modify: `client/src/api/types.ts`
- Create: `client/src/api/statsApi.ts`
- Test: `client/src/api/__tests__/statsApi.test.ts`

- [ ] **Step 1: Добавить `week` в `server/src/stats/stats.service.ts`**

Заменить весь файл:

```ts
import type Database from "better-sqlite3";
import { listDecksWithStats, type DeckWithStats } from "../decks/deckStats.repository.js";
import { computeStreak, isoDay } from "./studyDays.js";

export const DAILY_GOAL = 20;

export interface Stats {
  learned: number;
  inProgress: number;
  dueToday: number;
  learnedToday: number;
  dailyGoal: number;
  streak: number;
  week: boolean[];
  decks: DeckWithStats[];
}

export function getStats(db: Database.Database, now: Date): Stats {
  const nowIso = now.toISOString();
  const today = isoDay(now);

  const learned = (
    db.prepare("SELECT COUNT(*) AS c FROM progress WHERE learned_at IS NOT NULL").get() as { c: number }
  ).c;
  const inProgress = (
    db.prepare("SELECT COUNT(*) AS c FROM progress WHERE learned_at IS NULL").get() as { c: number }
  ).c;
  const dueToday = (
    db
      .prepare("SELECT COUNT(*) AS c FROM progress WHERE learned_at IS NOT NULL AND next_review_at <= ?")
      .get(nowIso) as { c: number }
  ).c;
  const learnedToday = (
    db
      .prepare("SELECT COUNT(*) AS c FROM progress WHERE learned_at IS NOT NULL AND substr(learned_at, 1, 10) = ?")
      .get(today) as { c: number }
  ).c;

  const studyRows = db.prepare("SELECT day FROM study_days").all() as { day: string }[];
  const studyDays = new Set(studyRows.map((r) => r.day));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    d.setUTCDate(d.getUTCDate() - (6 - i));
    return studyDays.has(isoDay(d));
  });

  return {
    learned,
    inProgress,
    dueToday,
    learnedToday,
    dailyGoal: DAILY_GOAL,
    streak: computeStreak(db, now),
    week,
    decks: listDecksWithStats(db),
  };
}
```

- [ ] **Step 2: Запустить серверные тесты**

```bash
cd /Users/zengo/Projects/other/word-training/server && npm test 2>&1 | tail -10
```
Ожидается: все тесты PASS.

- [ ] **Step 3: Добавить `Stats` в `client/src/api/types.ts`**

Дописать в конец файла:

```ts
export interface Stats {
  learned: number;
  inProgress: number;
  dueToday: number;
  learnedToday: number;
  dailyGoal: number;
  streak: number;
  week: boolean[];
  decks: Deck[];
}
```

- [ ] **Step 4: Создать тест `client/src/api/__tests__/statsApi.test.ts`**

```ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, beforeEach } from "vitest";
import { fetchStats } from "../statsApi";

function mockFetch(body: unknown): typeof fetch {
  return (async () => ({
    ok: true,
    status: 200,
    json: async () => body,
  })) as unknown as typeof fetch;
}

const STATS = {
  learned: 10,
  inProgress: 3,
  dueToday: 5,
  learnedToday: 2,
  dailyGoal: 20,
  streak: 7,
  week: [true, true, false, true, true, true, false],
  decks: [],
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("wt_token", "T");
});

describe("statsApi", () => {
  it("fetchStats возвращает данные", async () => {
    const stats = await fetchStats(mockFetch(STATS));
    expect(stats.streak).toBe(7);
    expect(stats.week).toHaveLength(7);
    expect(stats.dueToday).toBe(5);
  });
});
```

- [ ] **Step 5: Запустить тест — FAIL.**

```bash
cd /Users/zengo/Projects/other/word-training/client && npx vitest run src/api/__tests__/statsApi.test.ts 2>&1 | tail -10
```

- [ ] **Step 6: Создать `client/src/api/statsApi.ts`**

```ts
import { apiRequest } from "./http";
import { getToken } from "../auth/token";
import type { Stats } from "./types";

export async function fetchStats(fetchFn: typeof fetch = fetch): Promise<Stats> {
  return apiRequest<Stats>("/api/stats", { token: getToken() }, fetchFn);
}
```

- [ ] **Step 7: Запустить тест — PASS (1). Полный прогон.**

```bash
cd /Users/zengo/Projects/other/word-training/client && npx vitest run src/api/__tests__/statsApi.test.ts 2>&1 | tail -5
cd /Users/zengo/Projects/other/word-training/client && npm test 2>&1 | tail -5
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
cd /Users/zengo/Projects/other/word-training
git add server/src/stats/stats.service.ts \
        client/src/api/types.ts \
        client/src/api/statsApi.ts \
        client/src/api/__tests__/statsApi.test.ts
git commit -m "Добавить week в Stats API и statsApi на клиенте"
```

---

### Task 2: HomeScreen реальный

**Files:**
- Replace: `client/src/screens/HomeScreen.tsx`
- Create: `client/src/screens/__tests__/HomeScreen.test.tsx`
- Modify: `client/src/AppShell.tsx`

- [ ] **Step 1: Создать тест `client/src/screens/__tests__/HomeScreen.test.tsx`**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HomeScreen } from "../HomeScreen";

const fetchStatsMock = vi.fn();
vi.mock("../../api/statsApi", () => ({
  fetchStats: () => fetchStatsMock(),
}));

const STATS = {
  learned: 47,
  inProgress: 8,
  dueToday: 14,
  learnedToday: 11,
  dailyGoal: 20,
  streak: 12,
  week: [true, true, false, true, true, true, false],
  decks: [
    { id: "d1", name: "Базовые", is_builtin: 1, created_at: "x", total: 10, learned: 5 },
  ],
};

beforeEach(() => {
  fetchStatsMock.mockReset();
});

describe("HomeScreen", () => {
  it("показывает стрик и счётчик повторений", async () => {
    fetchStatsMock.mockResolvedValue(STATS);
    render(<HomeScreen onLearn={vi.fn()} onReview={vi.fn()} onOpenDeck={vi.fn()} onProfile={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("12")).toBeInTheDocument());
    expect(screen.getByText("14")).toBeInTheDocument();
  });

  it("показывает колоду в секции Продолжить", async () => {
    fetchStatsMock.mockResolvedValue({
      ...STATS,
      decks: [{ id: "d1", name: "Базовые", is_builtin: 1, created_at: "x", total: 10, learned: 5 }],
    });
    render(<HomeScreen onLearn={vi.fn()} onReview={vi.fn()} onOpenDeck={vi.fn()} onProfile={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Базовые")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Запустить — FAIL.**

```bash
cd /Users/zengo/Projects/other/word-training/client && npx vitest run src/screens/__tests__/HomeScreen.test.tsx 2>&1 | tail -10
```

- [ ] **Step 3: Создать `client/src/screens/HomeScreen.tsx`**

```tsx
import { fetchStats } from "../api/statsApi";
import { useAsync } from "../hooks/useAsync";
import { Page } from "../components/Page";
import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import { IconBtn } from "../components/IconBtn";
import { ProgressBar } from "../components/ProgressBar";
import { Ring } from "../components/Ring";
import type { Deck, Stats } from "../api/types";

const WEEK_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function StreakStrip({ week }: { week: boolean[] }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
      {week.map((active, i) => {
        const isToday = i === week.length - 1;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.22)",
                boxShadow: isToday ? "0 0 0 2.5px rgba(255,255,255,0.65)" : "none",
              }}
            >
              {active ? <Icon name="flame" size={16} color="var(--primary)" stroke={1.5} /> : null}
            </div>
            <span style={{ fontFamily: "var(--font)", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
              {WEEK_LABELS[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(now: Date): string {
  return now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
}

interface Props {
  onLearn: () => void;
  onReview: () => void;
  onOpenDeck: (deck: Deck) => void;
  onProfile: () => void;
}

function HomeContent({ s, onLearn, onReview, onOpenDeck, onProfile }: Props & { s: Stats }) {
  const inProgressDecks = s.decks.filter((d) => d.learned > 0 && d.learned < d.total);

  return (
    <Page>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-mute)", textTransform: "capitalize" }}>
            {formatDate(new Date())}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 27, fontWeight: 700, color: "var(--ink)", margin: "2px 0 0" }}>
            Привет! 👋
          </h1>
        </div>
        <IconBtn name="settings" aria-label="Профиль" onClick={onProfile} />
      </div>

      {/* streak hero */}
      <div
        style={{
          borderRadius: "var(--r-card)",
          padding: 18,
          marginBottom: 14,
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, var(--primary), var(--primary-2, var(--primary)))",
          boxShadow: "0 14px 30px -12px var(--primary-glow, rgba(0,0,0,0.2))",
        }}
      >
        <div style={{ position: "absolute", top: -30, right: -20, opacity: 0.16 }}>
          <Icon name="flame" size={150} color="#fff" stroke={0} />
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 700, color: "#fff", lineHeight: 1 }}
            >
              {s.streak}
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>дней подряд</span>
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "rgba(255,255,255,0.82)", margin: "4px 0 16px" }}>
            {s.streak > 0 ? "Отличный темп — не теряй огонёк 🔥" : "Начни сегодня — зажги стрик! 🔥"}
          </div>
          <StreakStrip week={s.week} />
        </div>
      </div>

      {/* daily goal */}
      <Card pad={16} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Ring value={s.learnedToday} max={s.dailyGoal} size={74} stroke={8}>
            <div style={{ textAlign: "center", lineHeight: 1 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--ink)" }}>
                {s.learnedToday}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-mute)" }}>из {s.dailyGoal}</div>
            </div>
          </Ring>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>Цель на сегодня</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginTop: 2 }}>
              {s.learnedToday >= s.dailyGoal
                ? "Цель выполнена! 🎉"
                : `Ещё ${s.dailyGoal - s.learnedToday} слов до цели`}
            </div>
          </div>
        </div>
      </Card>

      {/* two CTAs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
        <Card onClick={onReview} pad={15} style={{ display: "flex", flexDirection: "column", gap: 10, cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "var(--amber-soft, #fff8e1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="refresh" size={20} color="var(--amber-ink, #b45309)" stroke={2.4} />
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>
              {s.dueToday}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>Повторить</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)" }}>слов готово к повтору</div>
          </div>
        </Card>
        <Card
          onClick={onLearn}
          pad={15}
          style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--primary-soft)", cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="sparkles" size={20} color="var(--on-primary, #fff)" stroke={2.4} />
            </div>
            <span
              style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--primary-ink, var(--primary))" }}
            >
              {s.inProgress}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--primary-ink, var(--primary))" }}>Учить новые</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--primary-ink, var(--primary))", opacity: 0.7 }}>
              слов в процессе
            </div>
          </div>
        </Card>
      </div>

      {/* continue learning */}
      {inProgressDecks.length > 0 ? (
        <>
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}
          >
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
              Продолжить
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {inProgressDecks.slice(0, 3).map((d) => {
              const pct = Math.round((d.learned / d.total) * 100);
              return (
                <Card key={d.id} onClick={() => onOpenDeck(d)} pad={13} style={{ display: "flex", alignItems: "center", gap: 13, cursor: "pointer" }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      background: "var(--surface-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={d.is_builtin ? "book" : "star"} size={23} color="var(--primary)" stroke={2.2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: "var(--ink)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {d.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <ProgressBar value={d.learned} max={d.total} height={6} />
                      <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-soft)" }}>{pct}%</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      ) : null}
    </Page>
  );
}

export function HomeScreen({ onLearn, onReview, onOpenDeck, onProfile }: Props) {
  const { data: stats, loading } = useAsync<Stats>(() => fetchStats(), []);

  if (loading || !stats) {
    return (
      <Page>
        <p style={{ color: "var(--ink-mute)" }}>Загрузка…</p>
      </Page>
    );
  }

  return <HomeContent s={stats} onLearn={onLearn} onReview={onReview} onOpenDeck={onOpenDeck} onProfile={onProfile} />;
}
```

- [ ] **Step 4: Запустить тест — PASS (2).**

```bash
cd /Users/zengo/Projects/other/word-training/client && npx vitest run src/screens/__tests__/HomeScreen.test.tsx 2>&1 | tail -10
```

- [ ] **Step 5: Обновить `client/src/AppShell.tsx`** — передать props в HomeScreen

Найти строку:
```tsx
{tab === "home" ? <HomeScreen /> : null}
```
Заменить на:
```tsx
{tab === "home" ? (
  <HomeScreen
    onLearn={() => {
      /* План 10 */
    }}
    onReview={() => {
      /* План 11 */
    }}
    onOpenDeck={openDeck}
    onProfile={() => setTab("profile")}
  />
) : null}
```

- [ ] **Step 6: Полный прогон + tsc**

```bash
cd /Users/zengo/Projects/other/word-training/client && npm test 2>&1 | tail -5 && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
cd /Users/zengo/Projects/other/word-training
git add client/src/screens/HomeScreen.tsx \
        client/src/screens/__tests__/HomeScreen.test.tsx \
        client/src/AppShell.tsx
git commit -m "Реализовать дашборд HomeScreen со стриком и статистикой"
```

---

### Task 3: StatsScreen реальный

**Files:**
- Replace: `client/src/screens/StatsScreen.tsx`
- Create: `client/src/screens/__tests__/StatsScreen.test.tsx`
- Modify: `client/src/AppShell.tsx`

- [ ] **Step 1: Создать тест `client/src/screens/__tests__/StatsScreen.test.tsx`**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { StatsScreen } from "../StatsScreen";

const fetchStatsMock = vi.fn();
vi.mock("../../api/statsApi", () => ({
  fetchStats: () => fetchStatsMock(),
}));

const STATS = {
  learned: 47,
  inProgress: 8,
  dueToday: 14,
  learnedToday: 11,
  dailyGoal: 20,
  streak: 12,
  week: [true, true, false, true, true, true, false],
  decks: [
    { id: "d1", name: "Базовые", is_builtin: 1, created_at: "x", total: 10, learned: 5 },
  ],
};

beforeEach(() => {
  fetchStatsMock.mockReset();
});

describe("StatsScreen", () => {
  it("показывает стрик и всего слов", async () => {
    fetchStatsMock.mockResolvedValue(STATS);
    render(<StatsScreen onOpenDeck={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByText("12").length).toBeGreaterThan(0));
    expect(screen.getAllByText("47").length).toBeGreaterThan(0);
  });

  it("показывает колоду в прогрессе", async () => {
    fetchStatsMock.mockResolvedValue(STATS);
    render(<StatsScreen onOpenDeck={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Базовые")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Запустить — FAIL.**

```bash
cd /Users/zengo/Projects/other/word-training/client && npx vitest run src/screens/__tests__/StatsScreen.test.tsx 2>&1 | tail -10
```

- [ ] **Step 3: Заменить `client/src/screens/StatsScreen.tsx`**

```tsx
import { fetchStats } from "../api/statsApi";
import { useAsync } from "../hooks/useAsync";
import { Page } from "../components/Page";
import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import { ProgressBar } from "../components/ProgressBar";
import type { Deck, Stats } from "../api/types";

interface StatRowProps {
  icon: string;
  bgColor: string;
  iconColor: string;
  label: string;
  sub?: string;
  value: string | number;
}

function StatRow({ icon, bgColor, iconColor, label, sub, value }: StatRowProps) {
  return (
    <Card pad={15} style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: bgColor,
        }}
      >
        <Icon name={icon} size={22} color={iconColor} stroke={2.3} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{label}</div>
        {sub ? <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-mute)" }}>{sub}</div> : null}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--ink)" }}>{value}</div>
    </Card>
  );
}

function StatsContent({ s, onOpenDeck }: { s: Stats; onOpenDeck: (deck: Deck) => void }) {
  const goalPct = Math.round((s.learnedToday / s.dailyGoal) * 100);
  const decksWithProgress = s.decks.filter((d) => d.learned > 0);

  return (
    <Page>
      <h1
        style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--ink)", margin: "4px 0 18px" }}
      >
        Прогресс
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <Card pad={16} style={{ textAlign: "center" }}>
          <Icon name="flame" size={26} color="var(--primary)" stroke={1.4} />
          <div
            style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, color: "var(--ink)", marginTop: 6 }}
          >
            {s.streak}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-mute)" }}>дней стрик</div>
        </Card>
        <Card pad={16} style={{ textAlign: "center" }}>
          <Icon name="trophy" size={26} color="var(--amber-ink, #b45309)" stroke={2} />
          <div
            style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, color: "var(--ink)", marginTop: 6 }}
          >
            {s.learned}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-mute)" }}>слов выучено</div>
        </Card>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
        <StatRow
          icon="sparkles"
          bgColor="var(--primary-soft)"
          iconColor="var(--primary)"
          label="В процессе изучения"
          sub="проходят 5 типов"
          value={s.inProgress}
        />
        <StatRow
          icon="refresh"
          bgColor="var(--amber-soft, #fff8e1)"
          iconColor="var(--amber-ink, #b45309)"
          label="Запланировано на сегодня"
          sub="готовы к повтору"
          value={s.dueToday}
        />
        <StatRow
          icon="target"
          bgColor="var(--success-soft, #dcfce7)"
          iconColor="var(--success, #16a34a)"
          label="Цель сегодня"
          sub={`${s.learnedToday} из ${s.dailyGoal} выполнено`}
          value={`${Math.min(100, goalPct)}%`}
        />
      </div>

      {decksWithProgress.length > 0 ? (
        <>
          <h2
            style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: "0 0 12px" }}
          >
            Прогресс по колодам
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {decksWithProgress.map((d) => {
              const pct = Math.round((d.learned / d.total) * 100);
              return (
                <Card key={d.id} pad={14} onClick={() => onOpenDeck(d)} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 800, color: "var(--ink)" }}>{d.name}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-mute)" }}>
                      {d.learned}/{d.total}
                    </span>
                  </div>
                  <ProgressBar
                    value={d.learned}
                    max={d.total}
                    height={8}
                    color={pct === 100 ? "var(--success)" : "var(--primary)"}
                  />
                </Card>
              );
            })}
          </div>
        </>
      ) : null}
    </Page>
  );
}

export function StatsScreen({ onOpenDeck }: { onOpenDeck: (deck: Deck) => void }) {
  const { data: stats, loading } = useAsync<Stats>(() => fetchStats(), []);

  if (loading || !stats) {
    return (
      <Page>
        <p style={{ color: "var(--ink-mute)" }}>Загрузка…</p>
      </Page>
    );
  }

  return <StatsContent s={stats} onOpenDeck={onOpenDeck} />;
}
```

- [ ] **Step 4: Запустить тест — PASS (2).**

```bash
cd /Users/zengo/Projects/other/word-training/client && npx vitest run src/screens/__tests__/StatsScreen.test.tsx 2>&1 | tail -10
```

- [ ] **Step 5: Обновить `client/src/AppShell.tsx`** — передать `onOpenDeck` в StatsScreen

Найти строку:
```tsx
{tab === "stats" ? <StatsScreen /> : null}
```
Заменить на:
```tsx
{tab === "stats" ? <StatsScreen onOpenDeck={openDeck} /> : null}
```

- [ ] **Step 6: Полный прогон + tsc**

```bash
cd /Users/zengo/Projects/other/word-training/client && npm test 2>&1 | tail -5 && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
cd /Users/zengo/Projects/other/word-training
git add client/src/screens/StatsScreen.tsx \
        client/src/screens/__tests__/StatsScreen.test.tsx \
        client/src/AppShell.tsx
git commit -m "Реализовать экран статистики с прогрессом колод"
```

---

### Task 4: ProfileScreen реальный

**Files:**
- Replace: `client/src/screens/ProfileScreen.tsx`
- Create: `client/src/screens/__tests__/ProfileScreen.test.tsx`

- [ ] **Step 1: Создать тест `client/src/screens/__tests__/ProfileScreen.test.tsx`**

```tsx
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileScreen } from "../ProfileScreen";

const logoutMock = vi.fn();
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({ logout: logoutMock }),
}));

describe("ProfileScreen", () => {
  it("показывает заголовок и настройки", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("Профиль")).toBeInTheDocument();
    expect(screen.getByText("Дневная цель")).toBeInTheDocument();
    expect(screen.getByText("Направление повторов")).toBeInTheDocument();
  });

  it("кнопка выйти вызывает logout", async () => {
    logoutMock.mockReset();
    const user = userEvent.setup();
    render(<ProfileScreen />);
    await user.click(screen.getByRole("button", { name: /Выйти/ }));
    expect(logoutMock).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Запустить — FAIL.**

```bash
cd /Users/zengo/Projects/other/word-training/client && npx vitest run src/screens/__tests__/ProfileScreen.test.tsx 2>&1 | tail -10
```

- [ ] **Step 3: Заменить `client/src/screens/ProfileScreen.tsx`**

```tsx
import { useAuth } from "../auth/AuthContext";
import { Page } from "../components/Page";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";

const SETTINGS_ROWS = [
  { icon: "target", label: "Дневная цель", detail: "20 слов" },
  { icon: "volume-2", label: "Озвучка слов", detail: "Вкл" },
  { icon: "refresh", label: "Направление повторов", detail: "Оба" },
  { icon: "calendar", label: "Напоминания", detail: "20:00" },
] as const;

export function ProfileScreen() {
  const { logout } = useAuth();

  return (
    <Page>
      <h1
        style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--ink)", margin: "4px 0 18px" }}
      >
        Профиль
      </h1>

      <Card pad={18} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--primary), var(--primary-2, var(--primary)))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "#fff" }}>Я</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--ink)" }}>
            Моё обучение
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-mute)" }}>Личный словарь</div>
        </div>
      </Card>

      <div
        style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: "var(--ink-mute)",
          textTransform: "uppercase",
          letterSpacing: 0.4,
          margin: "4px 4px 8px",
        }}
      >
        Настройки тренажёра
      </div>

      <Card pad={4} style={{ marginBottom: 20 }}>
        {SETTINGS_ROWS.map((r, i) => (
          <div
            key={r.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              padding: "13px 12px",
              borderBottom: i < SETTINGS_ROWS.length - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <Icon name={r.icon} size={20} color="var(--ink-soft)" stroke={2.2} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{r.label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-mute)" }}>{r.detail}</span>
            <Icon name="chevron-right" size={17} color="var(--ink-mute)" stroke={2.4} />
          </div>
        ))}
      </Card>

      <Button variant="outline" full onClick={logout}>
        Выйти
      </Button>
    </Page>
  );
}
```

- [ ] **Step 4: Запустить тест — PASS (2).**

```bash
cd /Users/zengo/Projects/other/word-training/client && npx vitest run src/screens/__tests__/ProfileScreen.test.tsx 2>&1 | tail -10
```

- [ ] **Step 5: Полный прогон + tsc + build**

```bash
cd /Users/zengo/Projects/other/word-training/client && npm test 2>&1 | tail -5 && npx tsc --noEmit && npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
cd /Users/zengo/Projects/other/word-training
git add client/src/screens/ProfileScreen.tsx \
        client/src/screens/__tests__/ProfileScreen.test.tsx
git commit -m "Реализовать экран профиля с настройками и кнопкой выхода"
```

---

## Self-Review

**Spec coverage:**
- Стрик (дней подряд) ✓ — HomeScreen + StatsScreen
- Прогресс по колодам ✓ — StatsScreen
- Сколько слов изучено / в процессе / запланировано на сегодня ✓ — StatsScreen StatRows
- Week-полоска стрика ✓ — StreakStrip (HomeScreen)
- Дашборд: CTA «Повторить»/«Учить новые» с реальными счётчиками ✓
- «Продолжить» — колоды с прогрессом 0 < x < 100% ✓
- ProfileScreen: logout ✓; настройки (статичные) ✓

**Placeholder scan:** Нет. nav.learn/nav.review — явные заглушки с комментарием «План 10/11».

**Type consistency:** `Stats` (Task 1 types.ts) → используется в HomeScreen, StatsScreen. `Deck` из types.ts — у `stats.decks` тип `Deck[]` → `onOpenDeck(deck: Deck)` совпадает с контрактом AppShell.
