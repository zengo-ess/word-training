import { Page } from "../components/Page";

export function StatsScreen() {
  return (
    <Page>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, margin: "8px 0 4px" }}>Прогресс</h1>
      <p style={{ color: "var(--ink-soft)" }}>Статистика появится в следующем обновлении.</p>
    </Page>
  );
}
