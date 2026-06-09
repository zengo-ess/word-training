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
