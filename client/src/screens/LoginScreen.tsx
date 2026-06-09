import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";

export function LoginScreen() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(password);
    } catch {
      setError("Неверный пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="screen screen--center">
      <div className="login-stack">
        <form className="card login" onSubmit={(e) => void onSubmit(e)}>
          <span className="brand">
            <span className="brand__mark" aria-hidden="true">
              Aa
            </span>
            <span className="brand__name">Словарь</span>
          </span>

          <h1 className="login__title">Вход</h1>
          <p className="login__subtitle">Тренажёр английских слов</p>

          <label className="field">
            <span className="field__label">Пароль</span>
            <input
              className="input"
              type="password"
              aria-label="Пароль"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button className="btn btn--primary" type="submit" disabled={loading || password.length === 0}>
            {loading ? "Входим…" : "Войти"}
          </button>

          {error.length > 0 && (
            <p role="alert" className="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
