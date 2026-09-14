import { fetchDeckWords } from "../api/decksApi";
import { useAsync } from "../hooks/useAsync";
import { Page } from "../components/Page";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { IconBtn } from "../components/IconBtn";
import { Pill } from "../components/Pill";
import { Icon } from "../components/Icon";
import { ProgressBar } from "../components/ProgressBar";
import { WordTile } from "../components/WordTile";
import { hueFromString } from "../lib/wordVisual";
import type { Deck, WordWithProgress } from "../api/types";

interface Props {
  deck: Deck;
  onBack: () => void;
  onWord: (word: WordWithProgress) => void;
  onAddWord: () => void;
  onLearn: () => void;
  onReview: () => void;
}

function WordRow({ word, onClick }: { word: WordWithProgress; onClick: () => void }) {
  const learned = word.progress?.learned_at != null;
  const type = word.progress?.current_type ?? 1;
  return (
    <Card pad={11} onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {word.image_url ? (
        <img
          src={word.image_url}
          alt=""
          style={{ width: 46, height: 46, borderRadius: 13, objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <WordTile icon="book" hue={hueFromString(word.foreign_word)} size={46} round={13} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>{word.foreign_word}</span>
          {word.transcription ? (
            <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-mute)" }}>
              {word.transcription}
            </span>
          ) : null}
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-soft)" }}>{word.native_word}</div>
      </div>
      {learned ? (
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "var(--success-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="check" size={13} color="var(--success)" stroke={3} />
        </div>
      ) : (
        <Pill tone="primary" style={{ fontSize: 10.5, padding: "3px 8px" }}>
          Тип {type}
        </Pill>
      )}
    </Card>
  );
}

export function DeckDetailScreen({ deck, onBack, onWord, onAddWord, onLearn, onReview }: Props) {
  const { data: words } = useAsync<WordWithProgress[]>(() => fetchDeckWords(deck.id), [deck.id]);
  const builtin = deck.is_builtin === 1;
  const pct = deck.total ? Math.round((deck.learned / deck.total) * 100) : 0;
  const list = words ?? [];
  const newCount = list.filter((w) => w.progress?.learned_at == null).length;

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg)", zIndex: 60, overflowY: "auto" }} className="page-scroll">
      <Page withNav={false}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <IconBtn name="chevron-left" aria-label="Назад" onClick={onBack} />
          {builtin ? <Pill icon="lock">Только чтение</Pill> : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              flexShrink: 0,
              background: builtin ? "var(--surface-2)" : "var(--primary-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name={builtin ? "book" : "star"} size={32} color="var(--primary)" stroke={2.1} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 23, fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
              {deck.name}
            </h1>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-mute)", marginTop: 3 }}>
              {builtin ? "Встроенная колода" : "Личная колода"}
            </div>
          </div>
        </div>

        <Card pad={15} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink-soft)" }}>
              Выучено {deck.learned} из {deck.total}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--primary)" }}>{pct}%</span>
          </div>
          <ProgressBar value={deck.learned} max={deck.total || 1} height={9} color={pct === 100 ? "var(--success)" : "var(--primary)"} />
        </Card>

        {newCount > 0 ? (
          <Button full variant="primary" icon="sparkles" onClick={onLearn} style={{ marginBottom: 10 }}>
            Учить новые ({newCount})
          </Button>
        ) : (
          <Button full variant="soft" icon="refresh" onClick={onReview} style={{ marginBottom: 10 }}>
            Повторить колоду
          </Button>
        )}
        {!builtin ? (
          <Button full variant="outline" icon="plus" onClick={onAddWord} style={{ marginBottom: 18 }}>
            Добавить слово
          </Button>
        ) : (
          <div style={{ height: 8 }} />
        )}

        <div
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--ink-mute)",
            textTransform: "uppercase",
            letterSpacing: 0.4,
            margin: "6px 4px 10px",
          }}
        >
          Слова {list.length ? `(${list.length})` : ""}
        </div>

        {list.length === 0 ? (
          <Card pad={22} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-mute)" }}>В колоде пока нет слов.</div>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {list.map((w) => (
              <WordRow key={w.id} word={w} onClick={() => onWord(w)} />
            ))}
          </div>
        )}
      </Page>
    </div>
  );
}
