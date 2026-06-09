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
                  <div
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}
                  >
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
