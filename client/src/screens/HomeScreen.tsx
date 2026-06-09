import { Page } from "../components/Page";

export function HomeScreen() {
  return (
    <Page>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, margin: "8px 0 4px" }}>
        Привет! 👋
      </h1>
      <p style={{ color: "var(--ink-soft)" }}>Дашборд появится в следующем обновлении.</p>
    </Page>
  );
}
