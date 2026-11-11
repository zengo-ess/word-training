import { useEffect, useState } from "react";
import type { Deck } from "../api/types";
import { getStoredUser } from "../auth/token";
import { Button } from "../components/Button";
import { downloadDeck } from "./download";
import { getOfflineDeck } from "./storage";

export function openOfflineLibrary(): void {
  window.dispatchEvent(new Event("wt-open-offline"));
}

export function OfflineEntry() {
  return <Button full size="sm" variant="soft" onClick={openOfflineLibrary} style={{ marginBottom: 16 }}>Скачанные колоды</Button>;
}

export function DownloadDeck({ deck }: { deck: Deck }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const user = getStoredUser();
    if (user && "indexedDB" in window) {
      void getOfflineDeck(user.id, deck.id).then(record => { if (active) setSaved(Boolean(record)); }).catch(() => undefined);
    }
    return () => { active = false; };
  }, [deck.id]);
  const download = async () => {
    setBusy(true); setError(""); setProgress("Подготовка…");
    try {
      await downloadDeck(deck, (done, total) => setProgress(total ? `Скачивание: ${done} из ${total}` : "Сохраняю карточки…"));
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof DOMException && cause.name === "QuotaExceededError"
        ? "На устройстве не хватает места. Удалите ненужные загрузки и попробуйте снова."
        : cause instanceof TypeError || (cause instanceof DOMException && cause.name === "TimeoutError")
          ? "Не удалось скачать колоду. Проверьте соединение и попробуйте снова."
          : cause instanceof Error ? cause.message : "Не удалось скачать колоду.");
    } finally {
      setBusy(false); setProgress("");
    }
  };
  return (
    <div style={{ marginBottom: 18 }}>
      {saved ? <div style={{ color: "var(--success-ink)", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Доступна оффлайн</div> : null}
      <Button full size="sm" variant="soft" disabled={busy} onClick={() => void download()}>
        {busy ? progress : saved ? "Обновить скачанную колоду" : "Скачать для оффлайна"}
      </Button>
      <div role="status" style={{ fontSize: 13, color: error ? "var(--danger-ink)" : "var(--ink-soft)", marginTop: 7 }}>
        {error || "Для просмотра без интернета. Прогресс не записывается."}
      </div>
    </div>
  );
}
