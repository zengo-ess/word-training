// app.jsx — root: navigation, theming via tweaks, device shell.
const { useState, useEffect, useRef, useMemo } = React;

const ACCENTS = {
  amber:  { primary: '#F47B33', primary2: '#EA5A2B', glow: 'rgba(244,123,51,.5)',  light: { soft: '#FCEBDD', ink: '#B14A18' }, dark: { soft: '#43301F', ink: '#FAB07E' } },
  sunset: { primary: '#F2615A', primary2: '#E0444E', glow: 'rgba(242,97,90,.5)',   light: { soft: '#FCE3E0', ink: '#B83A38' }, dark: { soft: '#43292A', ink: '#F4A39C' } },
  honey:  { primary: '#E5A22B', primary2: '#D38420', glow: 'rgba(229,162,43,.5)',  light: { soft: '#FBEFCF', ink: '#946410' }, dark: { soft: '#3F3320', ink: '#F2C66B' } },
  rose:   { primary: '#EC5C86', primary2: '#DB4575', glow: 'rgba(236,92,134,.5)',  light: { soft: '#FCE3EB', ink: '#AF2F56' }, dark: { soft: '#412730', ink: '#F2A2BC' } },
  berry:  { primary: '#D8567E', primary2: '#C13F76', glow: 'rgba(216,86,126,.5)',  light: { soft: '#FBE2EA', ink: '#A2335A' }, dark: { soft: '#3F2730', ink: '#F0A0BE' } },
  plum:   { primary: '#9B6DE0', primary2: '#8654D6', glow: 'rgba(155,109,224,.5)', light: { soft: '#EFE6FB', ink: '#6A3FB0' }, dark: { soft: '#322846', ink: '#C7AEF2' } },
  ocean:  { primary: '#3E84E0', primary2: '#2E6BD0', glow: 'rgba(62,132,224,.5)',  light: { soft: '#E1ECFB', ink: '#2557A8' }, dark: { soft: '#21304A', ink: '#9EC0F2' } },
  teal:   { primary: '#2FA9A0', primary2: '#1F8F87', glow: 'rgba(47,169,160,.5)',  light: { soft: '#DCF1EF', ink: '#1B746C' }, dark: { soft: '#1F3A38', ink: '#74D6CD' } },
  forest: { primary: '#56A85E', primary2: '#43904F', glow: 'rgba(86,168,94,.5)',   light: { soft: '#E2F1E2', ink: '#2F7A3C' }, dark: { soft: '#233A28', ink: '#88D78F' } },
};
const ACCENT_BY_HEX = Object.fromEntries(Object.entries(ACCENTS).map(([k, v]) => [v.primary, k]));
const CORNERS = { soft: { card: 22, btn: 16, tile: 18 }, sharp: { card: 14, btn: 11, tile: 12 }, round: { card: 30, btn: 22, tile: 24 } };

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#3E84E0",
  "dark": false,
  "font": "rounded",
  "corners": "soft"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]); // overlay stack
  const [sheetWord, setSheetWord] = useState(null);
  const [myWords, setMyWords] = useState(() => MY_DECK.words.slice());
  const scaleRef = useRef(null);

  // ----- scale device to viewport -----
  useEffect(() => {
    const fit = () => {
      const el = scaleRef.current; if (!el) return;
      const s = Math.min(1, (window.innerHeight - 24) / 874, (window.innerWidth - 24) / 402);
      el.style.transform = `scale(${s})`;
    };
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const myDeck = useMemo(() => ({ ...MY_DECK, words: myWords }), [myWords]);
  const allDecks = useMemo(() => DECKS, []);

  const top = stack[stack.length - 1] || null;

  const nav = {
    tab: (k) => { setStack([]); setTab(k); },
    deck: (id, create) => setStack(s => [...s, { type: 'deck', id, create }]),
    word: (w) => setSheetWord(w),
    learn: (deckId) => setStack(s => [...s, { type: 'trainer', deckId }]),
    review: () => setStack(s => [...s, { type: 'review' }]),
    addWord: () => setStack(s => [...s, { type: 'add' }]),
    back: () => setStack(s => s.slice(0, -1)),
  };

  function getDeck(id) { return id === MY_DECK_ID ? myDeck : allDecks.find(d => d.id === id); }

  function buildBatch(deckId) {
    let deck = deckId ? getDeck(deckId) : getDeck(1);
    let words = deck.words.filter(w => !w.progress.learned);
    if (words.length === 0) words = getDeck(1).words.filter(w => !w.progress.learned);
    return words.slice(0, 6);
  }
  function buildDue() {
    const a = getDeck(1).words.filter(w => w.progress.learned);
    const b = myWords.filter(w => w.progress.learned);
    return [...a, ...b].slice(0, 6);
  }

  function saveWord(data) {
    const id = 1000 + myWords.length;
    setMyWords(ws => [...ws, { id, deck_id: 99, english: data.english, russian: data.russian, transcription: '', example: '',
      icon: data.icon, hue: data.hue, custom: true, progress: { current_type: 0, learned: false, ease: 2.5, interval: 0, total: 0, correct: 0, due: null } }]);
    nav.back();
  }

  // ----- theme vars -----
  const accentKey = ACCENT_BY_HEX[t.accent] || 'amber';
  const ac = ACCENTS[accentKey];
  const mode = t.dark ? 'dark' : 'light';
  const corners = CORNERS[t.corners] || CORNERS.soft;
  const themeStyle = {
    '--primary': ac.primary, '--primary-2': ac.primary2, '--on-primary': '#fff',
    '--primary-soft': ac[mode].soft, '--primary-ink': ac[mode].ink, '--primary-glow': ac.glow,
    '--r-card': corners.card + 'px', '--r-btn': corners.btn + 'px', '--r-tile': corners.tile + 'px',
  };

  return (
    <div data-theme={mode} data-font={t.font} style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--backdrop)', overflow: 'hidden' }}>
      <div ref={scaleRef} style={{ ...themeStyle, transformOrigin: 'center center' }}>
        <IOSDevice dark={t.dark}>
          <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)' }}>
            {/* main tab content */}
            {tab === 'home' && <HomeScreen nav={nav} decks={allDecks} />}
            {tab === 'decks' && <DecksScreen nav={nav} decks={allDecks} myDeck={myDeck} />}
            {tab === 'stats' && <StatsScreen nav={nav} decks={[...allDecks, myDeck]} />}
            {tab === 'profile' && <ProfileScreen nav={nav} />}

            {/* bottom nav (hidden under full-screen overlays) */}
            {!top && <BottomNav tab={tab} onTab={nav.tab} onLearn={() => nav.learn()} />}

            {/* overlays */}
            {top && top.type === 'deck' && (
              <DeckDetailScreen nav={nav} deck={getDeck(top.id)} onAddWord={nav.addWord} />
            )}
            {top && top.type === 'trainer' && <TrainerScreen nav={nav} batch={buildBatch(top.deckId)} />}
            {top && top.type === 'review' && <ReviewScreen nav={nav} dueWords={buildDue()} />}
            {top && top.type === 'add' && <AddWordScreen nav={nav} onSave={saveWord} />}

            {/* word detail sheet */}
            {sheetWord && <WordDetailSheet word={sheetWord} builtin={sheetWord.deck_id !== 99} onClose={() => setSheetWord(null)} onSpeak={speakWord} />}
          </div>
        </IOSDevice>
      </div>

      {/* Tweaks */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Тема" />
        <TweakColor label="Акцент" value={t.accent}
          options={Object.values(ACCENTS).map(a => a.primary)}
          onChange={(v) => setTweak('accent', v)} />
        <TweakToggle label="Тёмная тема" value={t.dark} onChange={(v) => setTweak('dark', v)} />
        <TweakSection label="Стиль" />
        <TweakRadio label="Шрифт" value={t.font}
          options={[{ value: 'rounded', label: 'Округлый' }, { value: 'clean', label: 'Чистый' }]}
          onChange={(v) => setTweak('font', v)} />
        <TweakRadio label="Углы" value={t.corners}
          options={[{ value: 'sharp', label: 'Острые' }, { value: 'soft', label: 'Мягкие' }, { value: 'round', label: 'Круглые' }]}
          onChange={(v) => setTweak('corners', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
