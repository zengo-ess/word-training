import { useState, useEffect, useMemo } from "react";
import { postTrainingResult } from "../api/trainingApi";
import { buildChoices, buildQueue, shuffle } from "./trainer/trainerLogic";
import { Icon } from "../components/Icon";
import { IconBtn } from "../components/IconBtn";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { WordTile } from "../components/WordTile";
import { hueFromString } from "../lib/wordVisual";
import type { Word } from "../api/types";

const EX_NAMES: Record<number, string> = {
  1: "Перевод EN→RU",
  2: "Перевод RU→EN",
  3: "Вставь пропуск",
  4: "Собери из букв",
  5: "Аудио",
};

function SegBar({ total, done }: { total: number; done: number }) {
  return (
    <div style={{ display: "flex", gap: 4, flex: 1 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 6,
            borderRadius: 99,
            background: i < done ? "var(--primary)" : "var(--track, var(--line))",
            transition: "background 0.3s",
          }}
        />
      ))}
    </div>
  );
}

export function FeedbackBar({ kind, word }: { kind: "correct" | "wrong"; word: Word }) {
  const ok = kind === "correct";
  return (
    <div
      className="fb-enter"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 30,
        zIndex: 80,
        background: ok ? "var(--success)" : "var(--danger)",
        borderRadius: 18,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 12px 30px -8px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={ok ? "check" : "x"} size={20} color="#fff" stroke={3} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15.5, fontWeight: 800, color: "#fff" }}>{ok ? "Верно!" : "Почти!"}</div>
        {!ok ? (
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
            {word.foreign_word} — {word.native_word}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TrainerDone({ count, onDone }: { count: number; onDone: () => void }) {
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
          background: "linear-gradient(135deg, var(--primary), var(--primary-2, var(--primary)))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          boxShadow: "0 18px 40px -12px var(--primary-glow, rgba(0,0,0,0.2))",
        }}
      >
        <Icon name="trophy" size={54} color="#fff" stroke={2} />
      </div>
      <h1
        style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--ink)", margin: "0 0 8px" }}
      >
        Батч выучен! 🎉
      </h1>
      <p
        style={{
          fontSize: 15.5,
          fontWeight: 600,
          color: "var(--ink-soft)",
          margin: "0 0 6px",
          lineHeight: 1.5,
          maxWidth: 280,
        }}
      >
        {count} слов прошли все 5 типов и отправились в умное повторение.
      </p>
      <div style={{ display: "flex", gap: 8, margin: "14px 0 28px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--success-soft, #dcfce7)",
            color: "var(--success, #16a34a)",
            borderRadius: 99,
            padding: "5px 12px",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <Icon name="refresh" size={14} color="var(--success, #16a34a)" stroke={2.4} />
          Повтор через 1 день
        </div>
      </div>
      <Button full variant="primary" icon="sparkles" onClick={onDone}>
        Готово
      </Button>
    </div>
  );
}

function MCQ({
  word,
  pool,
  lang,
  answered,
  onResult,
  children,
}: {
  word: Word;
  pool: Word[];
  lang: "ru" | "en";
  answered: "correct" | "wrong" | null;
  onResult: (correct: boolean) => void;
  children?: React.ReactNode;
}) {
  const { opts, correct } = useMemo(() => buildChoices(word, pool, lang), [word.id, lang]);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    setPicked(null);
  }, [word.id, lang]);

  function choose(o: string) {
    if (answered || picked) return;
    setPicked(o);
    onResult(o === correct);
  }

  return (
    <>
      {children}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: lang === "en" ? "1fr 1fr" : "1fr",
          gap: 10,
          marginTop: "auto",
        }}
      >
        {opts.map((o, i) => {
          let state: "idle" | "correct" | "wrong" | "dim" = "idle";
          if (picked) {
            if (o === correct) state = "correct";
            else if (o === picked) state = "wrong";
            else state = "dim";
          }
          const styles = {
            idle: { background: "var(--surface)", color: "var(--ink)", boxShadow: "var(--shadow-sm)" },
            correct: {
              background: "var(--success-soft, #dcfce7)",
              color: "var(--success-ink, #15803d)",
              boxShadow: "inset 0 0 0 2px var(--success, #16a34a)",
            },
            wrong: {
              background: "var(--danger-soft, #fee2e2)",
              color: "var(--danger-ink, #b91c1c)",
              boxShadow: "inset 0 0 0 2px var(--danger, #ef4444)",
            },
            dim: { background: "var(--surface)", color: "var(--ink-mute)", opacity: 0.5 },
          }[state];
          return (
            <button
              key={i}
              className={picked ? "" : "btn-press"}
              onClick={() => choose(o)}
              style={{
                border: "none",
                cursor: picked ? "default" : "pointer",
                borderRadius: "var(--r-btn)",
                padding: "17px 16px",
                fontSize: 17,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all .2s",
                minHeight: 58,
                ...styles,
              }}
            >
              {state === "correct" ? <Icon name="check" size={18} stroke={3} /> : null}
              {state === "wrong" ? <Icon name="x" size={18} stroke={3} /> : null}
              {o}
            </button>
          );
        })}
      </div>
    </>
  );
}

function FillGap({
  word,
  onResult,
}: {
  word: Word;
  answered: "correct" | "wrong" | null;
  onResult: (correct: boolean) => void;
}) {
  const [val, setVal] = useState("");
  const [locked, setLocked] = useState(false);
  const parts = (word.example_sentence ?? "___").split("___");

  useEffect(() => {
    setVal("");
    setLocked(false);
  }, [word.id]);

  function check() {
    if (locked || !val.trim()) return;
    setLocked(true);
    onResult(val.trim().toLowerCase() === word.foreign_word.toLowerCase());
  }

  return (
    <>
      <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: "var(--ink-mute)", marginBottom: 18 }}>
        Вставьте пропущенное слово
      </div>
      <Card pad={18} style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 19, fontWeight: 600, color: "var(--ink)", lineHeight: 1.6 }}>
          {parts[0]}
          <span
            style={{
              display: "inline-flex",
              minWidth: 70,
              borderBottom: "3px solid var(--primary)",
              textAlign: "center",
              color: "var(--primary)",
              fontWeight: 800,
              justifyContent: "center",
              padding: "0 6px",
            }}
          >
            {val || " "}
          </span>
          {parts[1]}
        </div>
        <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600, color: "var(--ink-mute)" }}>
          = {word.native_word}
        </div>
      </Card>
      <input
        autoFocus
        value={val}
        disabled={locked}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") check();
        }}
        placeholder="введите слово…"
        style={{
          width: "100%",
          boxSizing: "border-box",
          fontSize: 18,
          fontWeight: 700,
          color: "var(--ink)",
          background: "var(--surface)",
          border: "2px solid var(--line)",
          borderRadius: "var(--r-btn)",
          padding: "15px 16px",
          outline: "none",
          marginBottom: 14,
        }}
      />
      <Button full variant="primary" onClick={check} disabled={!val.trim() || locked} style={{ marginTop: "auto" }}>
        Проверить
      </Button>
    </>
  );
}

interface Tile {
  ch: string;
  id: number;
}

function Assemble({
  word,
  onResult,
}: {
  word: Word;
  answered: "correct" | "wrong" | null;
  onResult: (correct: boolean) => void;
}) {
  const target = word.foreign_word;
  const initial = useMemo(() => {
    let s = shuffle(target.split("")).map((ch, i): Tile => ({ ch, id: i }));
    if (s.map((t) => t.ch).join("") === target && target.length > 1) {
      s = shuffle(s);
    }
    return s;
  }, [word.id]);

  const [bank, setBank] = useState<Tile[]>(initial);
  const [slots, setSlots] = useState<Tile[]>([]);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setBank(initial);
    setSlots([]);
    setLocked(false);
  }, [word.id]);

  useEffect(() => {
    if (!locked && slots.length === target.length && slots.length > 0) {
      const guess = slots.map((t) => t.ch).join("");
      setLocked(true);
      setTimeout(() => onResult(guess.toLowerCase() === target.toLowerCase()), 250);
    }
  }, [slots]);

  function place(tile: Tile) {
    if (locked) return;
    setBank((b) => b.filter((t) => t.id !== tile.id));
    setSlots((s) => [...s, tile]);
  }

  function remove(tile: Tile) {
    if (locked) return;
    setSlots((s) => s.filter((t) => t.id !== tile.id));
    setBank((b) => [...b, tile]);
  }

  return (
    <>
      <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: "var(--ink-mute)", marginBottom: 18 }}>
        Соберите слово из букв
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <WordTile icon="book" hue={hueFromString(word.foreign_word)} size={120} />
      </div>
      <div style={{ textAlign: "center", fontSize: 17, fontWeight: 700, color: "var(--primary)", marginBottom: 16 }}>
        {word.native_word}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 7,
          minHeight: 56,
          marginBottom: 4,
          padding: 12,
          background: "var(--surface-2)",
          borderRadius: 16,
        }}
      >
        {slots.length === 0 ? (
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-mute)", alignSelf: "center" }}>
            нажимайте на буквы ниже
          </span>
        ) : null}
        {slots.map((t) => (
          <button
            key={t.id}
            onClick={() => remove(t)}
            className="tile-pop"
            style={{
              border: "none",
              cursor: "pointer",
              width: 40,
              height: 46,
              borderRadius: 11,
              background: "var(--primary)",
              color: "var(--on-primary, #fff)",
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 700,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {t.ch}
          </button>
        ))}
      </div>
      <div style={{ height: 28 }} />
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: "auto" }}>
        {bank.map((t) => (
          <button
            key={t.id}
            onClick={() => place(t)}
            className="btn-press"
            style={{
              border: "none",
              cursor: "pointer",
              width: 46,
              height: 52,
              borderRadius: 13,
              background: "var(--surface)",
              color: "var(--ink)",
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 700,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {t.ch}
          </button>
        ))}
      </div>
    </>
  );
}

export function Exercise({
  layer,
  word,
  pool,
  answered,
  onResult,
}: {
  layer: number;
  word: Word;
  pool: Word[];
  answered: "correct" | "wrong" | null;
  onResult: (correct: boolean) => void;
}) {
  if (layer === 1)
    return (
      <MCQ word={word} pool={pool} lang="ru" answered={answered} onResult={onResult}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            {word.image_url ? (
              <img
                src={word.image_url}
                alt=""
                style={{ width: 140, height: 140, borderRadius: "var(--r-tile)", objectFit: "cover" }}
              />
            ) : (
              <WordTile icon="book" hue={hueFromString(word.foreign_word)} size={140} photo />
            )}
          </div>
          <h2
            style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, color: "var(--ink)", margin: 0 }}
          >
            {word.foreign_word}
          </h2>
          {word.transcription ? (
            <div style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--ink-mute)", marginTop: 4 }}>
              {word.transcription}
            </div>
          ) : null}
        </div>
      </MCQ>
    );

  if (layer === 2)
    return (
      <MCQ word={word} pool={pool} lang="en" answered={answered} onResult={onResult}>
        <div style={{ textAlign: "center", marginBottom: 26, marginTop: 10 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--ink-mute)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            Переведите на английский
          </div>
          <h2
            style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 700, color: "var(--ink)", margin: 0 }}
          >
            {word.native_word}
          </h2>
        </div>
      </MCQ>
    );

  if (layer === 3) return <FillGap word={word} answered={answered} onResult={onResult} />;

  if (layer === 4) return <Assemble word={word} answered={answered} onResult={onResult} />;

  if (layer === 5)
    return (
      <MCQ word={word} pool={pool} lang="ru" answered={answered} onResult={onResult}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <button
              className="btn-press"
              onClick={() => {
                try {
                  window.speechSynthesis.cancel();
                  const u = new SpeechSynthesisUtterance(word.foreign_word);
                  u.lang = "en-US";
                  u.rate = 0.9;
                  window.speechSynthesis.speak(u);
                } catch {
                  /* ignore */
                }
              }}
              style={{
                border: "none",
                cursor: "pointer",
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "var(--primary-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Icon name="volume-2" size={48} color="var(--primary)" stroke={2.2} />
            </button>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-mute)" }}>
            Нажмите, чтобы прослушать
          </div>
        </div>
      </MCQ>
    );

  return null;
}

interface Props {
  batch: Word[];
  onClose: () => void;
  onDone: () => void;
}

export function TrainerScreen({ batch, onClose, onDone }: Props) {
  const byId = useMemo(() => Object.fromEntries(batch.map((w) => [w.id, w])), [batch]);

  const [layer, setLayer] = useState(1);
  const [queue, setQueue] = useState(() => buildQueue(batch, 1));
  const [errors, setErrors] = useState<string[]>([]);
  const [passed, setPassed] = useState(0);
  const [target, setTarget] = useState(() => buildQueue(batch, 1).length);
  const [answered, setAnswered] = useState<"correct" | "wrong" | null>(null);
  const [done, setDone] = useState(false);

  const currentId = queue[0];
  const word = currentId != null ? byId[currentId] : undefined;

  function enterLayer(t: number) {
    let next = t;
    while (next <= 5) {
      const q = buildQueue(batch, next);
      if (q.length) {
        setLayer(next);
        setQueue(q);
        setErrors([]);
        setPassed(0);
        setTarget(q.length);
        return;
      }
      next += 1;
    }
    void Promise.all(batch.map((w) => postTrainingResult(w.id, "learned"))).then(onDone);
    setDone(true);
  }

  function handleResult(correct: boolean) {
    if (answered) return;
    setAnswered(correct ? "correct" : "wrong");
    setTimeout(
      () => {
        setAnswered(null);
        const [head, ...rest] = queue;
        if (correct) {
          const np = passed + 1;
          setPassed(np);
          if (np >= target) {
            enterLayer(layer + 1);
            return;
          }
          if (rest.length === 0 && errors.length > 0) {
            setQueue(shuffle(errors));
            setErrors([]);
          } else {
            setQueue(rest);
          }
        } else {
          const newErrors = [...errors, head];
          if (rest.length === 0) {
            setQueue(shuffle(newErrors));
            setErrors([]);
          } else {
            setQueue(rest);
            setErrors(newErrors);
          }
        }
      },
      correct ? 750 : 1050,
    );
  }

  if (done || batch.length === 0) return <TrainerDone count={batch.length} onDone={onDone} />;
  if (!word) return null;

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
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <IconBtn name="x" aria-label="Закрыть" onClick={onClose} size={36} iconSize={18} />
          <SegBar total={target} done={passed} />
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
            {passed}/{target}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          {([1, 2, 3, 4, 5] as const).map((t) => {
            const active = t === layer;
            const doneL = t < layer;
            return (
              <div key={t} style={{ flex: 1 }}>
                <div
                  style={{
                    height: 32,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: active
                      ? "var(--primary)"
                      : doneL
                        ? "var(--success-soft, #dcfce7)"
                        : "var(--surface-2)",
                    color: active
                      ? "var(--on-primary, #fff)"
                      : doneL
                        ? "var(--success, #16a34a)"
                        : "var(--ink-mute)",
                  }}
                >
                  {doneL ? (
                    <Icon name="check" size={15} stroke={3} />
                  ) : (
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700 }}>{t}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: "var(--ink-mute)", marginTop: 6 }}>
          {EX_NAMES[layer]}
        </div>
      </div>

      <div
        key={`${layer}-${currentId}-${queue.length}`}
        className="ex-enter"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 18px 24px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Exercise layer={layer} word={word} pool={batch} answered={answered} onResult={handleResult} />
      </div>

      {answered ? <FeedbackBar kind={answered} word={word} /> : null}
    </div>
  );
}
