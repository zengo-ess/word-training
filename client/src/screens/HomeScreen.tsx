import { useAuth } from "../auth/AuthContext";

export function HomeScreen() {
  const { logout } = useAuth();
  return (
    <main className="screen">
      <header className="topbar">
        <span className="brand">
          <span className="brand__mark" aria-hidden="true">
            Aa
          </span>
          <span className="brand__name">Словарь</span>
        </span>
        <button className="btn btn--ghost" type="button" onClick={logout}>
          Выйти
        </button>
      </header>

      <section className="card hero">
        <h1 className="hero__title">Тренажёр слов</h1>
        <p className="hero__text">
          Вы вошли. Колоды и тренировки появятся в следующем обновлении.
        </p>
      </section>
    </main>
  );
}
