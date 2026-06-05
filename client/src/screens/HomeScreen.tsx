import { useAuth } from "../auth/AuthContext";

export function HomeScreen() {
  const { logout } = useAuth();
  return (
    <section className="home">
      <h1>Тренажёр слов</h1>
      <p>Вы вошли. Колоды и тренировки появятся в следующем обновлении.</p>
      <button type="button" onClick={logout}>
        Выйти
      </button>
    </section>
  );
}
