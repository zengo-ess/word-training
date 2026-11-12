import { useState, useEffect, useMemo, useRef } from "react";
import { postTrainingResult } from "../api/trainingApi";
import { availableTypes, buildChoices, buildQueue, shuffle, shuffleQueue } from "./trainer/trainerLogic";
import { Icon } from "../components/Icon";
import { IconBtn } from "../components/IconBtn";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { WordTile } from "../components/WordTile";
import { hueFromString } from "../lib/wordVisual";
import { WordAudioButton } from "../components/WordAudioButton";
import { getSpellingParts } from "../lib/spellingParts";
import { useAuth } from "../auth/AuthContext";
import { exerciseNames, langNameAccusative } from "../lib/languageLabels";
import type { Word } from "../api/types";

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

function TrainerDone({ count, spellingOnly, onDone }: { count: number; spellingOnly: boolean; onDone: () => void }) {
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
        {spellingOnly ? "Тренировка завершена!" : "Батч выучен! 🎉"}
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
        {spellingOnly ? `Собрано слов: ${count}` : `${count} слов прошли все доступные этапы и отправились в умное повторение.`}
      </p>
      {!spellingOnly ? <div style={{ display: "flex", gap: 8, margin: "14px 0 28px" }}>
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
      </div> : null}
      <Button full variant="primary" icon="sparkles" onClick={onDone} style={spellingOnly ? { marginTop: 24 } : undefined}>
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

/** Плитка с буквой или словом для сборки ответа. */
interface Tile {
  ch: string;
  id: number;
}

function Assemble({
  word,
  answered,
  language,
  ttsEnabled,
  onResult,
}: {
  word: Word;
  answered: "correct" | "wrong" | null;
  language: string;
  ttsEnabled: boolean;
  onResult: (correct: boolean) => void;
}) {
  const target = word.foreign_word.trim().replace(/\s+/g, " ");
  const separator = target.includes(" ") ? " " : "";
  const isPhrase = separator === " ";
  const spellingParts = getSpellingParts(target, language);
  const pieces = useMemo(() => [...(spellingParts ?? target.split(separator))], [target, separator, spellingParts]);
  const initial = useMemo(() => shuffleQueue(pieces, pieces).map((ch, id): Tile => ({ ch, id })), [pieces]);

  const [bank, setBank] = useState<Tile[]>(initial);
  const [slots, setSlots] = useState<Tile[]>([]);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setBank(initial);
    setSlots([]);
    setLocked(false);
  }, [word.id]);

  function place(tile: Tile) {
    if (locked) return;
    const next = [...slots, tile];
    setBank((b) => b.filter((t) => t.id !== tile.id));
    setSlots(next);
    if (next.length === pieces.length) {
      setLocked(true);
      const guess = next.map((t) => t.ch).join(separator);
      onResult(guess.toLowerCase() === target.toLowerCase());
    }
  }

  function remove(tile: Tile) {
    if (locked) return;
    setSlots((s) => s.filter((t) => t.id !== tile.id));
    setBank((b) => [...b, tile]);
  }

  return (
    <>
      <div style={{ textAlign: "center", fontSize: 14, fontWeight: 700, color: "var(--ink-mute)", marginBottom: 18 }}>
        {isPhrase ? "Соберите фразу из слов" : spellingParts ? "Соберите слово из частей" : "Соберите слово из букв"}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        {word.image_url ? (
          <img src={word.image_url} alt={word.native_word} style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 16 }} />
        ) : (
          <WordTile icon="book" hue={hueFromString(word.foreign_word)} size={120} />
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center", fontSize: 17, fontWeight: 700, color: "var(--primary)", marginBottom: 16 }}>
        <span>{word.native_word}</span>
        {ttsEnabled ? <WordAudioButton word={word} language={language} /> : null}
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
            {isPhrase ? "нажимайте на слова ниже" : "нажимайте на плитки ниже"}
          </span>
        ) : null}
        {slots.map((t) => (
          <button
            key={t.id}
            onClick={() => remove(t)}
            disabled={locked}
            className="tile-pop"
            style={{
              border: "none",
              cursor: "pointer",
              minWidth: 40,
              width: isPhrase || spellingParts ? "auto" : 40,
              padding: isPhrase || spellingParts ? "0 10px" : 0,
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
      {answered === "wrong" ? (
        <div role="status" style={{ textAlign: "center", margin: "12px 0", fontWeight: 700 }}>
          <div>Правильный ответ</div>
          <span lang={language} style={{ fontSize: 22 }}>
            {pieces.map((piece, index) => (
              <span key={index}>
                {index > 0 ? separator : ""}
                {slots[index]?.ch.toLowerCase() !== piece.toLowerCase() ? <mark>{piece}</mark> : piece}
              </span>
            ))}
          </span>
        </div>
      ) : <div style={{ height: 28 }} />}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: "auto" }}>
        {bank.map((t) => (
          <button
            key={t.id}
            onClick={() => place(t)}
            disabled={locked}
            className="btn-press"
            style={{
              border: "none",
              cursor: "pointer",
              minWidth: 46,
              width: isPhrase || spellingParts ? "auto" : 46,
              padding: isPhrase || spellingParts ? "0 10px" : 0,
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
  const { user } = useAuth();
  const language = user?.language ?? "en";
  const ttsEnabled = (user?.tts_enabled ?? 1) === 1;

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
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <h2
              style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, color: "var(--ink)", margin: 0 }}
            >
              {word.foreign_word}
            </h2>
            {ttsEnabled ? (
              <WordAudioButton word={word} language={language} />
            ) : null}
          </div>
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
            Переведите на {langNameAccusative(language)}
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

  if (layer === 4) return <Assemble word={word} answered={answered} language={language} ttsEnabled={ttsEnabled} onResult={onResult} />;

  if (layer === 5)
    return (
      <MCQ word={word} pool={pool} lang="ru" answered={answered} onResult={onResult}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <WordAudioButton word={word} language={language} large />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-mute)" }}>
            Нажмите, чтобы прослушать
          </div>
        </div>
      </MCQ>
    );

  return null;
}

/** A training session using the regular sequence or just the assembly exercise. */
interface Props {
  batch: Word[];
  spellingOnly?: boolean;
  onClose: () => void;
  onDone: () => void;
}

export function TrainerScreen({ batch, spellingOnly = false, onClose, onDone }: Props) {
  const { user } = useAuth();
  const language = user?.language ?? "en";
  const ttsEnabled = (user?.tts_enabled ?? 1) === 1;
  const byId = useMemo(() => Object.fromEntries(batch.map((w) => [w.id, w])), [batch]);
  const modeNames = exerciseNames(language);
  if (batch.some((w) => /\s/.test(w.foreign_word.trim()))) {
    modeNames[4] = "Собери слово или фразу";
  }

  // Тип 3 временно скрыт, тип 5 недоступен при выключенной озвучке.
  const types = useMemo(() => spellingOnly ? [4] : availableTypes(batch, ttsEnabled), [batch, spellingOnly, ttsEnabled]);
  const firstType = types[0] ?? 1;

  const [layer, setLayer] = useState(firstType);
  const [initialQueue] = useState(() => shuffleQueue(buildQueue(batch, firstType, ttsEnabled)));
  const previousOrder = useRef(initialQueue);
  const [queue, setQueue] = useState(initialQueue);
  const [errors, setErrors] = useState<string[]>([]);
  const [passed, setPassed] = useState(0);
  const [target, setTarget] = useState(initialQueue.length);
  const [completed, setCompleted] = useState<Set<number>>(() => new Set());
  const [answered, setAnswered] = useState<"correct" | "wrong" | null>(null);
  const [done, setDone] = useState(false);

  const [attempt, setAttempt] = useState(0);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(feedbackTimer.current), []);
  const waitsForContinue = layer === 4 && answered === "wrong";

  const currentId = queue[0];
  const word = currentId != null ? byId[currentId] : undefined;

  function startLayer(t: number) {
    const q = shuffleQueue(buildQueue(batch, t, ttsEnabled), previousOrder.current);
    previousOrder.current = q;
    setLayer(t);
    setQueue(q);
    setErrors([]);
    setPassed(0);
    setTarget(q.length);
  }

  function finishBatch() {
    if (!spellingOnly) void Promise.all(batch.map((w) => postTrainingResult(w.id, "learned"))).then(onDone);
    setDone(true);
  }

  // Шаг пройден: помечаем его и идём к следующему непройденному по кругу.
  // Батч закрывается только когда пройдены все доступные шаги — иначе ручной
  // прыжок вперёд отправлял бы слова в повторение мимо пропущенных шагов.
  function completeLayer() {
    const nextCompleted = new Set(completed).add(layer);
    setCompleted(nextCompleted);

    const from = types.indexOf(layer);
    for (let i = 1; i <= types.length; i += 1) {
      const candidate = types[(from + i) % types.length];
      if (!nextCompleted.has(candidate)) {
        startLayer(candidate);
        return;
      }
    }
    finishBatch();
  }

  // Ручной переход по клику на шаг — можно прыгнуть на любой доступный шаг
  // в любой момент, пройденность при этом не теряется
  function goToLayer(t: number) {
    clearTimeout(feedbackTimer.current);
    setAttempt((n) => n + 1);
    setAnswered(null);
    startLayer(t);
  }

  function advance(correct: boolean) {
    setAttempt((n) => n + 1);
    setAnswered(null);
    const [head, ...rest] = queue;
    if (correct) {
      const np = passed + 1;
      setPassed(np);
      if (np >= target) {
        completeLayer();
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
  }

  function handleResult(correct: boolean) {
    if (answered) return;
    setAnswered(correct ? "correct" : "wrong");
    if (layer === 4 && !correct) return;
    feedbackTimer.current = setTimeout(() => advance(correct), correct ? 750 : 1050);
  }

  if (done || batch.length === 0) return <TrainerDone count={batch.length} spellingOnly={spellingOnly} onDone={onDone} />;
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
        {!spellingOnly ? <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          {types.map((t, index) => {
            const active = t === layer;
            const doneL = completed.has(t);
            return (
              <button
                key={t}
                type="button"
                className="btn-press"
                aria-label={`Режим: ${modeNames[t]}`}
                aria-pressed={active}
                onClick={() => goToLayer(t)}
                style={{ flex: 1, border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
              >
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
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700 }}>{index + 1}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div> : null}
        <div style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: "var(--ink-mute)", marginTop: 6 }}>
          {modeNames[layer]}
        </div>
      </div>

      <div
        key={`${layer}-${currentId}-${attempt}`}
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
        {waitsForContinue ? <Button full variant="primary" onClick={() => advance(false)} style={{ marginTop: 16 }}>Дальше</Button> : null}
      </div>

      {answered && !waitsForContinue ? <FeedbackBar kind={answered} word={word} /> : null}
    </div>
  );
}
