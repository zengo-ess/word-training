import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { updateWord, searchImages, uploadImage } from "../api/wordsApi";
import { useAuth } from "../auth/AuthContext";
import { Page } from "../components/Page";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { IconBtn } from "../components/IconBtn";
import { Icon } from "../components/Icon";
import { pronunciationRu } from "../lib/pronunciation";
import type { WordWithProgress } from "../api/types";

const LANGUAGE_LABEL: Record<string, string> = { en: "Английское", de: "Немецкое" };

interface Props {
  word: WordWithProgress;
  onClose: () => void;
  onSaved: () => void;
}

const LABEL: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: "var(--ink-mute)",
  textTransform: "uppercase",
  letterSpacing: 0.4,
  marginLeft: 4,
};

const TEXT_INPUT: React.CSSProperties = {
  flex: 1,
  fontSize: 17,
  fontWeight: 700,
  color: "var(--ink)",
  background: "var(--surface)",
  border: "2px solid var(--line)",
  borderRadius: "var(--r-btn)",
  padding: "13px 15px",
  outline: "none",
};

export function EditWordScreen({ word, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const language = user?.language ?? "en";
  const [foreignWord, setForeignWord] = useState(word.foreign_word);
  const [nativeWord, setNativeWord] = useState(word.native_word);
  const [transcription, setTranscription] = useState<string | null>(word.transcription);
  const [imageUrl, setImageUrl] = useState<string | null>(word.image_url);
  const [candidates, setCandidates] = useState<string[]>(word.image_url ? [word.image_url] : []);
  const [imageQuery, setImageQuery] = useState(word.foreign_word);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onSearchImages = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const q = imageQuery.trim();
    if (q.length === 0) return;
    try {
      setCandidates(await searchImages(q));
    } catch {
      /* картинки опциональны */
    }
  };

  const onFileSelected = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadImage(file);
      setCandidates((prev) => [url, ...prev]);
      setImageUrl(url);
    } catch {
      setError("Не удалось загрузить картинку");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onSave = async (): Promise<void> => {
    setBusy(true);
    setError("");
    try {
      await updateWord(word.id, {
        foreignWord: foreignWord.trim(),
        nativeWord: nativeWord.trim(),
        imageUrl,
        transcription,
      });
      onSaved();
    } catch {
      setError("Не удалось сохранить изменения");
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg)", zIndex: 65, overflowY: "auto" }} className="page-scroll">
      <Page withNav={false}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <IconBtn name="x" aria-label="Закрыть" onClick={onClose} variant="plain" />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700 }}>Изменить слово</span>
          <div style={{ width: 40 }} />
        </div>

        <label style={LABEL}>{LANGUAGE_LABEL[language]} слово</label>
        <div style={{ display: "flex", margin: "8px 0 18px" }}>
          <input
            aria-label={`${LANGUAGE_LABEL[language]} слово`}
            value={foreignWord}
            onChange={(e) => setForeignWord(e.target.value)}
            style={{ ...TEXT_INPUT, fontSize: 18 }}
          />
        </div>

        <label style={LABEL}>Перевод</label>
        <div style={{ display: "flex", margin: "8px 0 20px" }}>
          <input aria-label="Перевод" value={nativeWord} onChange={(e) => setNativeWord(e.target.value)} style={TEXT_INPUT} />
        </div>

        <label style={LABEL}>Транскрипция</label>
        <div style={{ display: "flex", margin: "8px 0 6px" }}>
          <input
            aria-label="Транскрипция"
            value={transcription ?? ""}
            onChange={(e) => setTranscription(e.target.value || null)}
            placeholder={language === "en" ? "/driːm/" : "необязательно"}
            style={{ ...TEXT_INPUT, fontFamily: "var(--mono)", fontSize: 15 }}
          />
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-mute)", marginBottom: 20, marginLeft: 4 }}>
          Произношение (рус. буквами): {pronunciationRu(foreignWord, language) || "—"}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 4px 10px", flexWrap: "wrap", gap: 8 }}>
          <label style={{ ...LABEL, marginLeft: 0 }}>Картинка</label>
          <div style={{ display: "flex", gap: 6 }}>
            <form onSubmit={(e) => void onSearchImages(e)} style={{ display: "flex", gap: 6 }}>
              <input
                aria-label="Поиск картинки"
                value={imageQuery}
                onChange={(e) => setImageQuery(e.target.value)}
                style={{ ...TEXT_INPUT, fontSize: 13, padding: "6px 10px", fontWeight: 600 }}
              />
              <Button type="submit" variant="ghost" size="sm">
                Искать
              </Button>
            </form>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void onFileSelected(e)}
              style={{ display: "none" }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploadingPhoto}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingPhoto ? "Загружаю…" : "Своё фото"}
            </Button>
          </div>
        </div>
        {candidates.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 22 }}>
            {candidates.map((url) => (
              <button
                key={url}
                type="button"
                className="btn-press"
                aria-label="Выбрать картинку"
                aria-pressed={url === imageUrl}
                onClick={() => setImageUrl(url)}
                style={{
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  borderRadius: "var(--r-tile)",
                  background: "transparent",
                  outline: url === imageUrl ? "3px solid var(--primary)" : "3px solid transparent",
                  outlineOffset: 2,
                }}
              >
                <img src={url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "var(--r-tile)", display: "block" }} />
              </button>
            ))}
          </div>
        ) : (
          <div style={{ marginBottom: 22 }} />
        )}

        <Card pad={13} style={{ display: "flex", gap: 10, marginBottom: 20, background: "var(--surface-2)", boxShadow: "none" }}>
          <Icon name="sparkles" size={18} color="var(--ink-mute)" stroke={2} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", lineHeight: 1.45 }}>
            Пример предложения при редактировании не меняется.
          </span>
        </Card>

        <Button
          full
          variant="primary"
          icon="check"
          disabled={busy || foreignWord.trim().length === 0 || nativeWord.trim().length === 0}
          onClick={() => void onSave()}
        >
          {busy ? "Сохраняем…" : "Сохранить изменения"}
        </Button>

        {error.length > 0 ? (
          <p role="alert" style={{ marginTop: 14, color: "var(--danger-ink)", fontWeight: 700 }}>
            {error}
          </p>
        ) : null}
      </Page>
    </div>
  );
}
