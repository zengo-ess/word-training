import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { fetchDecks, createDeck } from "../api/decksApi";
import { useAsync } from "../hooks/useAsync";
import type { Deck } from "../api/types";

function DeckCard({ deck }: { deck: Deck }) {
  return (
    <li>
      <Link to={`/decks/${deck.id}`} className="card deck-card">
        <span className="deck-card__name">{deck.name}</span>
        {deck.is_builtin ? <span className="pill">готовая</span> : null}
      </Link>
    </li>
  );
}

export function DecksScreen() {
  const { data: decks, loading, error, reload } = useAsync<Deck[]>(() => fetchDecks(), []);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const onCreate = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    setCreating(true);
    try {
      await createDeck(trimmed);
      setName("");
      reload();
    } finally {
      setCreating(false);
    }
  };

  const builtin = decks?.filter((d) => d.is_builtin) ?? [];
  const custom = decks?.filter((d) => !d.is_builtin) ?? [];

  return (
    <main className="stack">
      <h1 className="hero__title">Колоды</h1>

      <form className="create-deck" onSubmit={(e) => void onCreate(e)}>
        <input
          className="input"
          aria-label="Название колоды"
          placeholder="Новая колода"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="btn btn--primary btn--sm"
          type="submit"
          disabled={creating || name.trim().length === 0}
        >
          Создать
        </button>
      </form>

      {loading ? <p className="muted-text">Загрузка…</p> : null}
      {error ? (
        <p role="alert" className="alert">
          {error}
        </p>
      ) : null}

      {custom.length > 0 ? (
        <section className="deck-group">
          <h2 className="group-title">Мои колоды</h2>
          <ul className="deck-list">
            {custom.map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
          </ul>
        </section>
      ) : null}

      {builtin.length > 0 ? (
        <section className="deck-group">
          <h2 className="group-title">Готовые колоды</h2>
          <ul className="deck-list">
            {builtin.map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
          </ul>
        </section>
      ) : null}

      {!loading && decks && decks.length === 0 ? (
        <p className="muted-text">Пока нет колод. Создайте первую!</p>
      ) : null}
    </main>
  );
}
