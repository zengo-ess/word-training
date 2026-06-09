// screens-decks.jsx — Decks list, Deck detail, Word detail sheet, Add word flow
const { useState: useStateD, useEffect: useEffectD } = React;

function DeckCard({ deck, onClick }) {
  const st = deckStats(deck);
  const pct = st.total ? Math.round((st.learned / st.total) * 100) : 0;
  const done = pct === 100;
  return (
    <Card onClick={onClick} pad={15} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 52, height: 52, borderRadius: 16, flexShrink: 0, position: 'relative',
        background: deck.builtin ? 'var(--surface-2)' : 'var(--primary-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={deck.icon} size={25} color={deck.builtin ? 'var(--ink-soft)' : 'var(--primary)'} stroke={2.2} />
        {done && <div style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%',
          background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <Icon name="check" size={13} color="#fff" stroke={3.2} /></div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: 'var(--font)', fontSize: 15.5, fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deck.name}</span>
          {deck.builtin && <Icon name="lock" size={13} color="var(--ink-mute)" stroke={2.3} />}
        </div>
        <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-mute)', marginTop: 1 }}>
          {st.learned}/{st.total} слов · {deck.sub}
        </div>
        <div style={{ marginTop: 8 }}>
          <ProgressBar value={st.learned} max={st.total || 1} height={5} color={done ? 'var(--success)' : 'var(--primary)'} />
        </div>
      </div>
    </Card>
  );
}

function DecksScreen({ nav, decks, myDeck }) {
  const builtin = decks.filter(d => d.builtin);
  return (
    <Page>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 16px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Колоды</h1>
        <IconBtn name="search" />
      </div>

      {/* my decks */}
      <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 4px 10px' }}>Мои колоды</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        <DeckCard deck={myDeck} onClick={() => nav.deck(myDeck.id)} />
      </div>
      <button onClick={() => nav.deck(myDeck.id, true)} className="btn-press" style={{ width: '100%', border: '2px dashed var(--line-strong)', background: 'transparent',
        borderRadius: 'var(--r-card)', padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 800, color: 'var(--ink-soft)', marginBottom: 24 }}>
        <Icon name="plus" size={19} stroke={2.6} /> Создать колоду
      </button>

      {/* built-in */}
      <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 4px 10px' }}>Встроенные колоды</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {builtin.map(d => <DeckCard key={d.id} deck={d} onClick={() => nav.deck(d.id)} />)}
      </div>
    </Page>
  );
}

function DeckDetailScreen({ nav, deck, onAddWord, onCopyWord }) {
  const st = deckStats(deck);
  const pct = st.total ? Math.round((st.learned / st.total) * 100) : 0;
  const newCount = deck.words.filter(w => !w.progress.learned).length;
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)' }}>
      <Page withNav={false}>
        {/* top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <IconBtn name="arrowLeft" onClick={nav.back} />
          {deck.builtin ? <Pill icon="lock">Только чтение</Pill> : <IconBtn name="edit" />}
        </div>

        {/* hero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, flexShrink: 0,
            background: deck.builtin ? 'var(--surface-2)' : 'var(--primary-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={deck.icon} size={32} color="var(--primary)" stroke={2.1} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 700, color: 'var(--ink)', margin: 0, lineHeight: 1.1 }}>{deck.name}</h1>
            <div style={{ fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 600, color: 'var(--ink-mute)', marginTop: 3 }}>{deck.sub}</div>
          </div>
        </div>

        {/* progress card */}
        <Card pad={15} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9 }}>
            <span style={{ fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 700, color: 'var(--ink-soft)' }}>Выучено {st.learned} из {st.total}</span>
            <span style={{ fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 800, color: 'var(--primary)' }}>{pct}%</span>
          </div>
          <ProgressBar value={st.learned} max={st.total || 1} height={9} color={pct === 100 ? 'var(--success)' : 'var(--primary)'} />
        </Card>

        {/* CTA */}
        {newCount > 0 ? (
          <Button full variant="primary" icon="sparkles" onClick={() => nav.learn(deck.id)} style={{ marginBottom: 10 }}>
            Учить новые ({newCount})
          </Button>
        ) : (
          <Button full variant="soft" icon="refresh" onClick={() => nav.review()} style={{ marginBottom: 10 }}>
            Повторить колоду
          </Button>
        )}
        {!deck.builtin && (
          <Button full variant="outline" icon="plus" onClick={onAddWord} style={{ marginBottom: 18 }}>Добавить слово</Button>
        )}
        {deck.builtin && <div style={{ height: 8 }} />}

        {/* word list */}
        <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '6px 4px 10px' }}>
          Слова {deck.words.length ? `(${deck.words.length})` : ''}
        </div>
        {deck.words.length === 0 ? (
          <Card pad={22} style={{ textAlign: 'center' }}>
            <Icon name="bookOpen" size={30} color="var(--ink-mute)" stroke={1.8} style={{ margin: '0 auto 8px' }} />
            <div style={{ fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 600, color: 'var(--ink-mute)' }}>
              Слова этой колоды загружаются с сервера
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {deck.words.map(w => (
              <Card key={w.id} pad={11} onClick={() => nav.word(w)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <WordTile icon={w.icon} hue={w.hue} size={46} round={13} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font)', fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{w.english}</span>
                    {w.transcription && <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-mute)' }}>{w.transcription}</span>}
                  </div>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 600, color: 'var(--ink-soft)' }}>{w.russian}</div>
                </div>
                {w.progress.learned
                  ? <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={13} color="var(--success)" stroke={3} /></div>
                  : <Pill tone="primary" style={{ fontSize: 10.5, padding: '3px 8px' }}>Тип {w.progress.current_type + 1}</Pill>}
              </Card>
            ))}
          </div>
        )}
      </Page>
    </div>
  );
}

function WordDetailSheet({ word, onClose, onSpeak, builtin }) {
  return (
    <div className="sheet-backdrop" onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 70,
      background: 'rgba(20,12,6,0.4)', display: 'flex', alignItems: 'flex-end' }}>
      <div className="sheet-up" onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--bg)',
        borderRadius: '28px 28px 0 0', padding: '12px 18px 30px', maxHeight: '86%', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 5, borderRadius: 99, background: 'var(--line-strong)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <WordTile icon={word.icon} hue={word.hue} size={168} photo />
        </div>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{word.english}</h2>
            <IconBtn name="volume" size={38} iconSize={19} onClick={() => onSpeak(word.english)} variant="surface" />
          </div>
          {word.transcription
            ? <div style={{ fontFamily: 'var(--mono)', fontSize: 15, color: 'var(--ink-mute)', marginTop: 4 }}>{word.transcription}</div>
            : null}
          <div style={{ fontFamily: 'var(--font)', fontSize: 19, fontWeight: 700, color: 'var(--primary)', marginTop: 6 }}>{word.russian}</div>
        </div>

        {word.example ? (
          <Card pad={15} style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>Пример</div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 15.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.5 }}>
              {word.example.replace('___', word.english)}
            </div>
          </Card>
        ) : (
          <Card pad={14} style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="sparkles" size={18} color="var(--ink-mute)" stroke={2} />
            <span style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: 'var(--ink-mute)' }}>У своих слов пример и транскрипция не заполняются автоматически</span>
          </Card>
        )}

        {/* progress mini */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <Card pad={12} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{word.progress.total}</div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-mute)' }}>повторов</div>
          </Card>
          <Card pad={12} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
              {word.progress.learned ? `${word.progress.interval}д` : '—'}
            </div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-mute)' }}>интервал</div>
          </Card>
          <Card pad={12} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: word.progress.learned ? 'var(--success)' : 'var(--primary)' }}>
              {word.progress.learned ? 'SR' : `Т${word.progress.current_type + 1}`}
            </div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-mute)' }}>статус</div>
          </Card>
        </div>

        {builtin && <Button full variant="soft" icon="plus" onClick={onClose}>Скопировать в «Мои слова»</Button>}
      </div>
    </div>
  );
}

Object.assign(window, { DecksScreen, DeckDetailScreen, WordDetailSheet, DeckCard });
