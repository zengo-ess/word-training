import { useParams } from "react-router-dom";
import { fetchDeckWords } from "../api/decksApi";
import { useAsync } from "../hooks/useAsync";
import type { Word } from "../api/types";

function WordCard({ word }: { word: Word }) {
  return (
    <li className="card word-card">
      {word.image_url ? (
        <img className="word-card__img" src={word.image_url} alt="" />
      ) : (
        <span className="word-card__img word-card__img--empty" aria-hidden="true">
          Aa
        </span>
      )}
      <span className="word-card__text">
        <span className="word-card__en">{word.english}</span>
        <span className="word-card__ru">{word.russian}</span>
      </span>
    </li>
  );
}

export function DeckScreen() {
  const { id = "" } = useParams();
  const { data: words, loading, error } = useAsync<Word[]>(() => fetchDeckWords(id), [id]);

  return (
    <main className="stack">
      <h1 className="hero__title">Слова</h1>

      {loading ? <p className="muted-text">Загрузка…</p> : null}
      {error ? (
        <p role="alert" className="alert">
          {error}
        </p>
      ) : null}
      {!loading && words && words.length === 0 ? (
        <p className="muted-text">В колоде пока нет слов.</p>
      ) : null}

      <ul className="word-list">
        {words?.map((word) => (
          <WordCard key={word.id} word={word} />
        ))}
      </ul>
    </main>
  );
}
