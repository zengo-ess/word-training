import { useState, type CSSProperties, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { fetchUsers, type AuthUser } from "../auth/authApi";
import { useAsync } from "../hooks/useAsync";
import { hueFromString } from "../lib/wordVisual";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

type View = { kind: "pick" } | { kind: "password"; user: AuthUser } | { kind: "create" };

const INPUT_STYLE: CSSProperties = {
  width: "100%",
  padding: "13px 15px",
  fontSize: 16,
  color: "var(--ink)",
  background: "var(--surface)",
  border: "1.5px solid var(--line-strong)",
  borderRadius: "var(--r-btn)",
  outline: "none",
};

const LABEL_STYLE: CSSProperties = { display: "flex", flexDirection: "column", gap: 7 };
const LABEL_TEXT_STYLE: CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--ink-soft)" };
const FORM_STYLE: CSSProperties = { display: "flex", flexDirection: "column", gap: 14 };

function Logo() {
  return (
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
  );
}

function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  const hue = hueFromString(name);
  return (
    <span
      aria-hidden="true"
      style={{
        display: "grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: `hsl(${hue}, 70%, 85%)`,
        color: "var(--ink)",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function ErrorAlert({ message }: { message: string }) {
  if (message.length === 0) {
    return null;
  }
  return (
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
      {message}
    </p>
  );
}

export function LoginScreen() {
  const { login, register } = useAuth();
  const [view, setView] = useState<View>({ kind: "pick" });
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const users = useAsync(() => fetchUsers(), []);

  const goTo = (next: View): void => {
    setView(next);
    setPassword("");
    setName("");
    setFamilyCode("");
    setError("");
  };

  const submit = async (action: () => Promise<void>): Promise<void> => {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка запроса");
    } finally {
      setBusy(false);
    }
  };

  const onLogin = (event: FormEvent, userId: string): void => {
    event.preventDefault();
    void submit(() => login(userId, password));
  };

  const onRegister = (event: FormEvent): void => {
    event.preventDefault();
    void submit(() => register(name.trim(), password, familyCode));
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
        <Logo />

        {view.kind === "pick" ? (
          <>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, margin: "4px 0 2px" }}>
                Кто занимается?
              </h1>
              <p style={{ color: "var(--ink-mute)", margin: 0, fontSize: 15 }}>Выберите свой профиль</p>
            </div>

            {users.loading ? (
              <p style={{ color: "var(--ink-mute)", margin: 0, fontSize: 15 }}>Загружаем профили…</p>
            ) : null}
            {users.error ? <ErrorAlert message={users.error} /> : null}

            {users.data && users.data.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
                  gap: 12,
                }}
              >
                {users.data.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    className="btn-press"
                    onClick={() => goTo({ kind: "password", user: profile })}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      padding: "14px 8px",
                      background: "var(--surface-2)",
                      border: "none",
                      borderRadius: "var(--r-card)",
                      cursor: "pointer",
                    }}
                  >
                    <Avatar name={profile.name} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{profile.name}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {users.data && users.data.length === 0 ? (
              <p style={{ color: "var(--ink-mute)", margin: 0, fontSize: 15 }}>
                Профилей пока нет — создайте первый
              </p>
            ) : null}

            {users.loading ? null : (
              <Button variant="soft" full icon="plus" onClick={() => goTo({ kind: "create" })}>
                Создать профиль
              </Button>
            )}
          </>
        ) : null}

        {view.kind === "password" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar name={view.user.name} size={48} />
              <div>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, margin: 0 }}>
                  {view.user.name}
                </h1>
                <p style={{ color: "var(--ink-mute)", margin: 0, fontSize: 14 }}>Введите свой пароль</p>
              </div>
            </div>

            <form onSubmit={(e) => onLogin(e, view.user.id)} style={FORM_STYLE}>
              <label style={LABEL_STYLE}>
                <span style={LABEL_TEXT_STYLE}>Пароль</span>
                <input
                  type="password"
                  aria-label="Пароль"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={INPUT_STYLE}
                />
              </label>
              <Button type="submit" full disabled={busy || password.length === 0}>
                {busy ? "Входим…" : "Войти"}
              </Button>
              <ErrorAlert message={error} />
              <Button variant="ghost" full onClick={() => goTo({ kind: "pick" })}>
                Назад
              </Button>
            </form>
          </>
        ) : null}

        {view.kind === "create" ? (
          <>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, margin: "4px 0 2px" }}>
                Новый профиль
              </h1>
              <p style={{ color: "var(--ink-mute)", margin: 0, fontSize: 15 }}>
                Имя, пароль и код семьи для доступа
              </p>
            </div>

            <form onSubmit={onRegister} style={FORM_STYLE}>
              <label style={LABEL_STYLE}>
                <span style={LABEL_TEXT_STYLE}>Имя</span>
                <input
                  type="text"
                  aria-label="Имя"
                  placeholder="Как вас зовут?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={INPUT_STYLE}
                />
              </label>
              <label style={LABEL_STYLE}>
                <span style={LABEL_TEXT_STYLE}>Пароль</span>
                <input
                  type="password"
                  aria-label="Пароль"
                  placeholder="Минимум 4 символа"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={INPUT_STYLE}
                />
              </label>
              <label style={LABEL_STYLE}>
                <span style={LABEL_TEXT_STYLE}>Код семьи</span>
                <input
                  type="password"
                  aria-label="Код семьи"
                  placeholder="Общий код доступа"
                  value={familyCode}
                  onChange={(e) => setFamilyCode(e.target.value)}
                  style={INPUT_STYLE}
                />
              </label>
              <Button
                type="submit"
                full
                disabled={busy || name.trim().length === 0 || password.length === 0 || familyCode.length === 0}
              >
                {busy ? "Создаём…" : "Создать"}
              </Button>
              <ErrorAlert message={error} />
              <Button variant="ghost" full onClick={() => goTo({ kind: "pick" })}>
                Назад
              </Button>
            </form>
          </>
        ) : null}
      </Card>
    </div>
  );
}
