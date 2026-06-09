import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { DecksScreen } from "./screens/DecksScreen";
import { DeckScreen } from "./screens/DeckScreen";

function TopBar() {
  const { logout } = useAuth();
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <span className="brand__mark" aria-hidden="true">
          Aa
        </span>
        <span className="brand__name">Словарь</span>
      </Link>
      <button className="btn btn--ghost" type="button" onClick={logout}>
        Выйти
      </button>
    </header>
  );
}

export function AuthedApp() {
  return (
    <BrowserRouter>
      <div className="screen">
        <TopBar />
        <Routes>
          <Route path="/" element={<DecksScreen />} />
          <Route path="/decks/:id" element={<DeckScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
