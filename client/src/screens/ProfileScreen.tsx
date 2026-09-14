import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Page } from "../components/Page";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";

const LANGUAGE_NAME: Record<string, string> = { en: "Английский", de: "Немецкий" };

export function ProfileScreen() {
  const { logout, user, setLanguage } = useAuth();
  const [switching, setSwitching] = useState(false);
  const language = user?.language ?? "en";

  const onToggleLanguage = async (): Promise<void> => {
    setSwitching(true);
    try {
      await setLanguage(language === "en" ? "de" : "en");
    } finally {
      setSwitching(false);
    }
  };

  const settingsRows = [
    { icon: "target", label: "Дневная цель", detail: "20 слов" },
    {
      icon: "globe",
      label: "Язык изучения",
      detail: switching ? "…" : LANGUAGE_NAME[language],
      onClick: () => void onToggleLanguage(),
    },
    { icon: "volume-2", label: "Озвучка слов", detail: "Вкл" },
    { icon: "refresh", label: "Направление повторов", detail: "Оба" },
    { icon: "calendar", label: "Напоминания", detail: "20:00" },
  ] as const;

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
        {settingsRows.map((r, i) => (
          <div
            key={r.label}
            onClick={"onClick" in r ? r.onClick : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              padding: "13px 12px",
              borderBottom: i < settingsRows.length - 1 ? "1px solid var(--line)" : "none",
              cursor: "onClick" in r ? "pointer" : "default",
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
