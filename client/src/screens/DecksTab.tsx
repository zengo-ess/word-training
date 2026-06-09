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

export function DecksTab({ onOpenDeck }: { onOpenDeck: (deck: Deck) => void }) {
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
      onOpenDeck(deck);
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
          <DeckCard key={d.id} deck={d} onClick={() => onOpenDeck(d)} />
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
          <DeckCard key={d.id} deck={d} onClick={() => onOpenDeck(d)} />
        ))}
      </div>
    </Page>
  );
}
