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
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--primary-ink, var(--primary))",
              }}
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
              Продолжить
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {inProgressDecks.slice(0, 3).map((d) => {
              const pct = Math.round((d.learned / d.total) * 100);
              return (
                <Card
                  key={d.id}
                  onClick={() => onOpenDeck(d)}
                  pad={13}
                  style={{ display: "flex", alignItems: "center", gap: 13, cursor: "pointer" }}
                >
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
