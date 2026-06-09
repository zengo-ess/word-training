import { Page } from "../components/Page";
import { Button } from "../components/Button";
import { useAuth } from "../auth/AuthContext";

export function ProfileScreen() {
  const { logout } = useAuth();
  return (
    <Page>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, margin: "8px 0 12px" }}>Профиль</h1>
      <Button variant="outline" full onClick={logout}>
        Выйти
      </Button>
    </Page>
  );
}
