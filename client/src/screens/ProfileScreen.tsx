import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Page } from "../components/Page";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { directionLabel, type Direction } from "../lib/languageLabels";
import type { SettingsPatch } from "../auth/authApi";

const LANGUAGE_NAME: Record<string, string> = { en: "Английский", de: "Немецкий" };
const GOALS = [10, 20, 30, 50];
const DIRECTIONS: Direction[] = ["toNative", "toForeign", "both"];

// Настройки переключаются по кругу прямо в строке списка — отдельных экранов нет
function nextIn<T>(values: T[], current: T): T {
  const index = values.indexOf(current);
  return values[(index + 1) % values.length];
}

interface SettingRow {
  icon: string;
  label: string;
  detail: string;
  patch: SettingsPatch;
}

export function ProfileScreen() {
  const { logout, user, updateSettings } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);

  const language = user?.language ?? "en";
  const dailyGoal = user?.daily_goal ?? 20;
  const ttsEnabled = (user?.tts_enabled ?? 1) === 1;
  const reviewDirection = (user?.review_direction ?? "both") as Direction;

  const apply = async (label: string, patch: SettingsPatch): Promise<void> => {
    setSaving(label);
    try {
      await updateSettings(patch);
    } finally {
      setSaving(null);
    }
  };

  const rows: SettingRow[] = [
    {
      icon: "target",
      label: "Дневная цель",
      detail: `${dailyGoal} слов`,
      patch: { dailyGoal: nextIn(GOALS, dailyGoal) },
    },
    {
      icon: "globe",
      label: "Язык изучения",
      detail: LANGUAGE_NAME[language] ?? LANGUAGE_NAME.en,
      patch: { language: language === "en" ? "de" : "en" },
    },
    {
      icon: "volume-2",
      label: "Озвучка слов",
      detail: ttsEnabled ? "Вкл" : "Выкл",
      patch: { ttsEnabled: !ttsEnabled },
    },
    {
      icon: "refresh",
      label: "Направление повторов",
      detail: directionLabel(language, reviewDirection),
      patch: { reviewDirection: nextIn(DIRECTIONS, reviewDirection) },
    },
  ];

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
          <span style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "#fff" }}>
            {(user?.name ?? "Я").charAt(0).toUpperCase()}
          </span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--ink)" }}>
            {user?.name ?? "Профиль"}
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
        {rows.map((r, i) => (
          <button
            key={r.label}
            type="button"
            onClick={() => void apply(r.label, r.patch)}
            disabled={saving !== null}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              textAlign: "left",
              font: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 13,
              padding: "13px 12px",
              borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none",
              cursor: saving === null ? "pointer" : "default",
            }}
          >
            <Icon name={r.icon} size={20} color="var(--ink-soft)" stroke={2.2} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{r.label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-mute)" }}>
              {saving === r.label ? "…" : r.detail}
            </span>
            <Icon name="chevron-right" size={17} color="var(--ink-mute)" stroke={2.4} />
          </button>
        ))}
      </Card>

      <Button variant="outline" full onClick={logout}>
        Выйти
      </Button>
    </Page>
  );
}
