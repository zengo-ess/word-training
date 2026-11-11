import { useEffect, useRef, useState } from "react";
import type { Word } from "../api/types";
import { playWord, stopWordPlayback } from "../lib/wordVisual";
import { Icon } from "./Icon";
import { IconBtn } from "./IconBtn";

export function WordAudioButton({ word, language, large = false }: { word: Pick<Word, "id" | "foreign_word" | "audio_url">; language: string; large?: boolean }) {
  const [error, setError] = useState("");
  const request = useRef(0);
  useEffect(() => {
    setError("");
    return () => { request.current += 1; stopWordPlayback(); };
  }, [word.id, word.audio_url]);
  const play = () => {
    setError("");
    const id = ++request.current;
    const failed = (cause: unknown) => {
      if (id === request.current && !(cause instanceof DOMException && cause.name === "AbortError")) {
        setError(cause instanceof Error ? cause.message : "Не удалось включить звук. Попробуйте ещё раз.");
      }
    };
    try { void Promise.resolve(playWord(word, language)).catch(failed); } catch (cause) { failed(cause); }
  };
  return <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
    {large ? <button type="button" aria-label="Прослушать слово" className="btn-press" onClick={play}
      style={{ border: "none", cursor: "pointer", width: 120, height: 120, borderRadius: "50%", background: "var(--primary-soft)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-sm)" }}>
      <Icon name="volume-2" size={48} color="var(--primary)" stroke={2.2} />
    </button> : <IconBtn name="volume-2" aria-label="Озвучить" size={38} iconSize={19} onClick={play} />}
    {error ? <span role="alert" style={{ maxWidth: 260, fontSize: 12, fontWeight: 600, color: "var(--danger-ink)", textAlign: "center" }}>{error}</span> : null}
  </span>;
}
