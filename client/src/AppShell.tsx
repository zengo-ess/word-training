import { useState } from "react";
import { BottomNav, type Tab } from "./components/BottomNav";
import { HomeScreen } from "./screens/HomeScreen";
import { DecksTab } from "./screens/DecksTab";
import { StatsScreen } from "./screens/StatsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { DeckDetailScreen } from "./screens/DeckDetailScreen";
import { WordSheet } from "./screens/WordSheet";
import { AddWordScreen } from "./screens/AddWordScreen";
import type { Deck, WordWithProgress } from "./api/types";

type Overlay = { type: "deck"; deck: Deck } | { type: "add"; deckId: string };

export function AppShell() {
  const [tab, setTab] = useState<Tab>("home");
  const [stack, setStack] = useState<Overlay[]>([]);
  const [sheetWord, setSheetWord] = useState<WordWithProgress | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const top = stack[stack.length - 1] ?? null;
  const back = () => setStack((s) => s.slice(0, -1));
  const openDeck = (deck: Deck) => setStack((s) => [...s, { type: "deck", deck }]);

  return (
    <>
      {tab === "home" ? (
        <HomeScreen
          onLearn={() => {
            /* План 10 */
          }}
          onReview={() => {
            /* План 11 */
          }}
          onOpenDeck={openDeck}
          onProfile={() => setTab("profile")}
        />
      ) : null}
      {tab === "decks" ? <DecksTab key={reloadKey} onOpenDeck={openDeck} /> : null}
      {tab === "stats" ? <StatsScreen /> : null}
      {tab === "profile" ? <ProfileScreen /> : null}

      {top === null ? (
        <BottomNav
          tab={tab}
          onTab={(t) => {
            setStack([]);
            setTab(t);
          }}
          onLearn={() => {
            /* запуск тренажёра — План 10 */
          }}
        />
      ) : null}

      {top?.type === "deck" ? (
        <DeckDetailScreen
          key={top.deck.id}
          deck={top.deck}
          onBack={back}
          onWord={(w) => setSheetWord(w)}
          onAddWord={() => setStack((s) => [...s, { type: "add", deckId: top.deck.id }])}
          onLearn={() => {
            /* План 10 */
          }}
          onReview={() => {
            /* План 11 */
          }}
        />
      ) : null}

      {top?.type === "add" ? (
        <AddWordScreen
          deckId={top.deckId}
          onClose={back}
          onSaved={() => {
            back();
            setReloadKey((k) => k + 1);
          }}
        />
      ) : null}

      {sheetWord ? <WordSheet word={sheetWord} onClose={() => setSheetWord(null)} /> : null}
    </>
  );
}
