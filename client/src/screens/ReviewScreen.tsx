import { useState } from "react";
import { postReviewResult } from "../api/trainingApi";
import { Exercise, FeedbackBar } from "./TrainerScreen";
import { Page } from "../components/Page";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { IconBtn } from "../components/IconBtn";
import { Icon } from "../components/Icon";
import { Pill } from "../components/Pill";
import { ProgressBar } from "../components/ProgressBar";
import type { Word } from "../api/types";

type Direction = "enru" | "ruen" | "both";

const DIRS: { key: Direction; label: string; sub: string }[] = [
  { key: "enru", label: "EN → RU", sub: "Только Тип 1" },
  { key: "ruen", label: "RU → EN", sub: "Только Тип 2" },
  { key: "both", label: "Оба", sub: "Чередуем Тип 1 и Тип 2" },
];

const TYPE_SHORT: Record<number, string> = { 1: "EN → RU", 2: "RU → EN" };

interface Props {
  dueWords: Word[];
  onClose: () => void;
  onDone: () => void;
}

export function ReviewScreen({ dueWords, onClose, onDone }: Props) {
  const [dir, setDir] = useState<Direction>("both");
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState<"correct" | "wrong" | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [started, setStarted] = useState(false);

  const word = dueWords[idx];
  const layer = dir === "enru" ? 1 : dir === "ruen" ? 2 : idx % 2 === 0 ? 1 : 2;

  function handleResult(correct: boolean) {
    if (answered) return;
    setAnswered(correct ? "correct" : "wrong");
    void postReviewResult(word.id, correct);
    setTimeout(
      () => {
        setAnswered(null);
        setResults((r) => [...r, correct]);
        setIdx((i) => i + 1);
      },
      correct ? 700 : 1000,
    );
  }

  if (!started) {
    return (
      <div
        style={{ position: "absolute", inset: 0, background: "var(--bg)", zIndex: 60, overflowY: "auto" }}
        className="page-scroll"
      >
        <Page withNav={false}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <IconBtn name="x" aria-label="Закрыть" onClick={onClose} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>
              Повторение
            </span>
            <div style={{ width: 40 }} />
          </div>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              className="pop"
              style={{
                width: 88,
                height: 88,
                borderRadius: 26,
                margin: "0 auto 16px",
                background: "var(--amber-soft, #fff8e1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="refresh" size={42} color="var(--amber-ink, #b45309)" stroke={2.2} />
            </div>
            <h1
              style={{ fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 700, color: "var(--ink)", margin: "0 0 4px" }}
            >
              {dueWords.length} слов на повтор
            </h1>
            <p style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink-soft)", margin: 0 }}>
              Закрепим то, что подошло по сроку
            </p>
          </div>

          <div
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--ink-mute)",
              textTransform: "uppercase",
              letterSpacing: 0.4,
              margin: "0 4px 10px",
            }}
          >
            Направление
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {DIRS.map((d) => (
              <Card
                key={d.key}
                onClick={() => setDir(d.key)}
                pad={15}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  cursor: "pointer",
                  boxShadow: dir === d.key ? "inset 0 0 0 2.5px var(--primary)" : "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: dir === d.key ? "var(--primary)" : "var(--surface-2)",
                  }}
                >
                  {dir === d.key ? <Icon name="check" size={13} color="#fff" stroke={3.2} /> : null}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>{d.label}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-mute)" }}>{d.sub}</div>
                </div>
              </Card>
            ))}
          </div>
          <Button full variant="primary" iconRight="chevron-right" onClick={() => setStarted(true)}>
            Начать повтор
          </Button>
        </Page>
      </div>
    );
  }

  if (idx >= dueWords.length) {
    const correct = results.filter(Boolean).length;
    const wrong = dueWords.length - correct;
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--bg)",
          zIndex: 60,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 30,
          textAlign: "center",
        }}
      >
        <div
          className="pop"
          style={{
            width: 110,
            height: 110,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--amber, #f59e0b), var(--primary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 22,
            boxShadow: "0 18px 40px -12px var(--primary-glow, rgba(0,0,0,0.2))",
          }}
        >
          <Icon name="check" size={56} color="#fff" stroke={2.6} />
        </div>
        <h1
          style={{ fontFamily: "var(--font-display)", fontSize: 27, fontWeight: 700, color: "var(--ink)", margin: "0 0 8px" }}
        >
          Повтор завершён!
        </h1>
        <p style={{ fontSize: 15.5, fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 20px" }}>
          {correct} из {dueWords.length} верно · интервалы обновлены
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap", justifyContent: "center" }}>
          <Pill tone="success" icon="check">
            {correct} закреплено
          </Pill>
          {wrong > 0 ? (
            <Pill tone="danger" icon="refresh">
              {wrong} вернулись
            </Pill>
          ) : null}
        </div>
        <Button full variant="primary" onClick={onDone} style={{ maxWidth: 320 }}>
          Готово
        </Button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--bg)",
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ paddingTop: 54, paddingLeft: 16, paddingRight: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <IconBtn name="x" aria-label="Закрыть" onClick={onClose} size={36} iconSize={18} />
          <div style={{ flex: 1 }}>
            <ProgressBar value={idx} max={dueWords.length} height={8} color="var(--amber, #f59e0b)" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
            {idx}/{dueWords.length}
          </span>
        </div>
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <Pill tone="amber" icon="refresh">
            Повторение · {TYPE_SHORT[layer]}
          </Pill>
        </div>
      </div>

      <div
        key={idx}
        className="ex-enter"
        style={{ flex: 1, overflowY: "auto", padding: "14px 18px 24px", display: "flex", flexDirection: "column" }}
      >
        <Exercise layer={layer} word={word} pool={dueWords} answered={answered} onResult={handleResult} />
      </div>

      {answered ? <FeedbackBar kind={answered} word={word} /> : null}
    </div>
  );
}
