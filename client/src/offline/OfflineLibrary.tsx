import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Page } from "../components/Page";
import { listOfflineDecks, removeOfflineDeck, type OfflineDeck } from "./storage";

function useMedia(cacheName: string, url: string | null): string | undefined {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setSrc(undefined);
    if (url) {
      void caches.open(cacheName).then(cache => cache.match(url)).then(async response => {
        if (response) {
          const blob = await response.blob();
          if (active) { objectUrl = URL.createObjectURL(blob); setSrc(objectUrl); }
        }
      }).catch(() => undefined);
    }
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [cacheName, url]);
  return src;
}

function OfflineCards({ record, onBack }: { record: OfflineDeck; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const word = record.words[index];
  const image = useMedia(record.cacheName, word?.image_url ?? null);
  const audio = useMedia(record.cacheName, word?.audio_url ?? null);
  const move = (delta: number) => { setIndex(value => (value + delta + record.words.length) % record.words.length); setRevealed(false); };
  return (
    <Page withNav={false}>
      <Button size="sm" variant="ghost" onClick={onBack}>К скачанным колодам</Button>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24 }}>{record.deck.name}</h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Оффлайн-просмотр · прогресс не записывается</p>
      {!word ? <p>В этой колоде пока нет слов.</p> : <>
        <div style={{ textAlign: "center", margin: "18px 0" }}>Карточка {index + 1} из {record.words.length}</div>
        <Card pad={24} style={{ textAlign: "center" }}>
          {image ? <img src={image} alt={word.foreign_word} style={{ width: "min(100%, 240px)", aspectRatio: "1", borderRadius: 22, objectFit: "cover" }} /> : null}
          {word.image_url && !image ? <p style={{ color: "var(--ink-mute)" }}>Картинка недоступна. Обновите загрузку при подключении.</p> : null}
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30 }}>{word.foreign_word}</h2>
          <p style={{ fontFamily: "var(--mono)", color: "var(--ink-soft)" }}>{word.transcription}</p>
          {audio ? <audio key={audio} aria-label="Озвучка слова" controls src={audio} style={{ width: "100%", marginBottom: 12 }} /> : null}
          <Button full variant="soft" onClick={() => setRevealed(value => !value)}>{revealed ? "Скрыть перевод" : "Показать перевод"}</Button>
          {revealed ? <div>
            <p style={{ color: "var(--primary)", fontSize: 23, fontWeight: 800 }}>{word.native_word}</p>
            {word.example_sentence ? <p>{word.example_sentence.replace("___", word.foreign_word)}</p> : null}
          </div> : null}
        </Card>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <Button full variant="outline" onClick={() => move(-1)}>Предыдущая</Button>
          <Button full onClick={() => move(1)}>Следующая</Button>
        </div>
      </>}
    </Page>
  );
}

export function OfflineLibrary({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [records, setRecords] = useState<OfflineDeck[]>([]);
  const [selected, setSelected] = useState<OfflineDeck | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    if (!user || !("indexedDB" in window)) { setLoading(false); return; }
    void listOfflineDecks(user.id).then(value => { if (active) setRecords(value); })
      .catch(() => { if (active) setError("Не удалось прочитать скачанные колоды на этом устройстве."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id]);
  const remove = async (record: OfflineDeck) => {
    if (!user) return;
    try {
      await removeOfflineDeck(user.id, record.deck.id);
      setRecords(value => value.filter(item => item.key !== record.key));
    } catch { setError("Не удалось удалить загрузку. Попробуйте ещё раз."); }
  };
  if (selected) return <OfflineCards key={selected.key} record={selected} onBack={() => setSelected(null)} />;
  return (
    <Page withNav={false}>
      <Button size="sm" variant="ghost" onClick={onClose}>К приложению</Button>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 25 }}>Скачанные колоды</h1>
      <p style={{ color: "var(--ink-soft)" }}>Карточки доступны без интернета. Прогресс просмотра не записывается.</p>
      {user ? <p style={{ fontSize: 14 }}>Профиль: {user.name}</p> : null}
      {loading ? <p>Загрузка…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!loading && records.length === 0 ? <Card pad={20}>Здесь пока пусто. Сначала подключитесь к интернету, войдите в профиль и нажмите «Скачать для оффлайна» в нужной колоде.</Card> : null}
      {records.map(record => <Card key={record.key} pad={16} style={{ marginBottom: 12 }}>
        <Button full variant="soft" onClick={() => setSelected(record)}>{record.deck.name} · {record.words.length} слов</Button>
        <p style={{ fontSize: 12, color: "var(--ink-mute)" }}>Скачано {new Date(record.savedAt).toLocaleString("ru-RU")}</p>
        <Button size="sm" variant="ghost" onClick={() => void remove(record)}>Удалить загрузку</Button>
      </Card>)}
    </Page>
  );
}
