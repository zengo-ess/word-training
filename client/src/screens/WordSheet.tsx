import { Card } from "../components/Card";
import { IconBtn } from "../components/IconBtn";
import { Icon } from "../components/Icon";
import { WordTile } from "../components/WordTile";
import { hueFromString, playWord } from "../lib/wordVisual";
import { pronunciationRu } from "../lib/pronunciation";
import { useAuth } from "../auth/AuthContext";
import type { WordWithProgress } from "../api/types";

const STAT_LABEL: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: "var(--ink-mute)" };
const STAT_NUM: React.CSSProperties = { fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--ink)" };

interface Props {
  word: WordWithProgress;
  onClose: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function WordSheet({ word, onClose, onDelete, onEdit }: Props) {
  const { user } = useAuth();
  const language = user?.language ?? "en";
  const learned = word.progress?.learned_at != null;
  const type = word.progress?.current_type ?? 1;
  const example = word.example_sentence ? word.example_sentence.replace("___", word.foreign_word) : null;
  const pronunciation = pronunciationRu(word.foreign_word, language);

  const handleDelete = (): void => {
    if (!onDelete) return;
    if (window.confirm(`Удалить слово «${word.foreign_word}»?`)) {
      onDelete();
    }
  };

  return (
    <div
      data-testid="sheet-backdrop"
      className="sheet-backdrop"
      onClick={onClose}
      style={{ position: "absolute", inset: 0, zIndex: 70, background: "rgba(20,12,6,0.4)", display: "flex", alignItems: "flex-end" }}
    >
      <div
        className="sheet-up"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", background: "var(--bg)", borderRadius: "28px 28px 0 0", padding: "12px 18px 30px", maxHeight: "86%", overflowY: "auto" }}
      >
        <div style={{ width: 40, height: 5, borderRadius: 99, background: "var(--line-strong)", margin: "0 auto 16px" }} />
        {onEdit || onDelete ? (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 4 }}>
            {onEdit ? <IconBtn name="edit" aria-label="Изменить слово" variant="ghost" onClick={onEdit} /> : null}
            {onDelete ? <IconBtn name="trash" aria-label="Удалить слово" variant="ghost" onClick={handleDelete} /> : null}
          </div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          {word.image_url ? (
            <img src={word.image_url} alt="" style={{ width: 168, height: 168, borderRadius: "var(--r-tile)", objectFit: "cover" }} />
          ) : (
            <WordTile icon="book" hue={hueFromString(word.foreign_word)} size={168} photo />
          )}
        </div>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, margin: 0 }}>{word.foreign_word}</h2>
            <IconBtn name="volume-2" aria-label="Озвучить" size={38} iconSize={19} onClick={() => playWord(word, language)} />
          </div>
          {word.transcription ? (
            <div style={{ fontFamily: "var(--mono)", fontSize: 15, color: "var(--ink-mute)", marginTop: 4 }}>{word.transcription}</div>
          ) : null}
          {pronunciation ? (
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-mute)", marginTop: 2 }}>[{pronunciation}]</div>
          ) : null}
          <div style={{ fontSize: 19, fontWeight: 700, color: "var(--primary)", marginTop: 6 }}>{word.native_word}</div>
        </div>

        {example ? (
          <Card pad={15} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
              Пример
            </div>
            <div style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.5 }}>{example}</div>
          </Card>
        ) : (
          <Card pad={14} style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="sparkles" size={18} color="var(--ink-mute)" stroke={2} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-mute)" }}>
              У своих слов пример предложения не заполняется автоматически
            </span>
          </Card>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <Card pad={12} style={{ flex: 1, textAlign: "center" }}>
            <div style={STAT_NUM}>{word.progress?.total_reviews ?? 0}</div>
            <div style={STAT_LABEL}>повторов</div>
          </Card>
          <Card pad={12} style={{ flex: 1, textAlign: "center" }}>
            <div style={STAT_NUM}>{learned ? `${word.progress?.interval_days ?? 0}д` : "—"}</div>
            <div style={STAT_LABEL}>интервал</div>
          </Card>
          <Card pad={12} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ ...STAT_NUM, color: learned ? "var(--success)" : "var(--primary)" }}>{learned ? "SR" : `Т${type}`}</div>
            <div style={STAT_LABEL}>статус</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
