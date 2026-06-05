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
    <form className="login" onSubmit={(e) => void onSubmit(e)}>
      <h1>Вход</h1>
      <input
        type="password"
        aria-label="Пароль"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" disabled={loading || password.length === 0}>
        {loading ? "Вход…" : "Войти"}
      </button>
      {error.length > 0 && (
        <p role="alert" className="login__error">
          {error}
        </p>
      )}
    </form>
  );
}
