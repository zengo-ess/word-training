import { useState } from "react";
import { BottomNav, type Tab } from "./components/BottomNav";
import { HomeScreen } from "./screens/HomeScreen";
import { DecksTab } from "./screens/DecksTab";
import { StatsScreen } from "./screens/StatsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";

export function AppShell() {
  const [tab, setTab] = useState<Tab>("home");

  return (
    <>
      {tab === "home" ? <HomeScreen /> : null}
      {tab === "decks" ? <DecksTab /> : null}
      {tab === "stats" ? <StatsScreen /> : null}
      {tab === "profile" ? <ProfileScreen /> : null}

      <BottomNav
        tab={tab}
        onTab={setTab}
        onLearn={() => {
          /* запуск тренажёра — План 10 */
        }}
      />
    </>
  );
}
