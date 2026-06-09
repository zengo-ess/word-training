import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

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
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 22,
      }}
    >
      <Card pad={24} className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 40,
              height: 40,
              borderRadius: 13,
              background: "var(--primary)",
              color: "var(--on-primary)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 17,
            }}
            aria-hidden="true"
          >
            Aa
          </span>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>Словарь</span>
        </span>

        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, margin: "4px 0 2px" }}>
            Вход
          </h1>
          <p style={{ color: "var(--ink-mute)", margin: 0, fontSize: 15 }}>Тренажёр английских слов</p>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)" }}>Пароль</span>
            <input
              type="password"
              aria-label="Пароль"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "13px 15px",
                fontSize: 16,
                color: "var(--ink)",
                background: "var(--surface)",
                border: "1.5px solid var(--line-strong)",
                borderRadius: "var(--r-btn)",
                outline: "none",
              }}
            />
          </label>
          <Button type="submit" full disabled={loading || password.length === 0}>
            {loading ? "Входим…" : "Войти"}
          </Button>
          {error.length > 0 ? (
            <p
              role="alert"
              style={{
                margin: 0,
                padding: "11px 14px",
                borderRadius: "var(--r-btn)",
                background: "var(--danger-soft)",
                color: "var(--danger-ink)",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {error}
            </p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
