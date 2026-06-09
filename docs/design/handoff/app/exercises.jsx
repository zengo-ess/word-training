// exercises.jsx — the five exercise renderers used by the trainer.
const { useState: useStateE, useEffect: useEffectE, useMemo: useMemoE } = React;

// ---------- Multiple choice (types 1, 2, 5) ----------
function MCQ({ word, pool, lang, answered, onResult, children }) {
  const { opts, correct } = useMemoE(() => buildChoices(word, pool, lang), [word.id, lang]);
  const [picked, setPicked] = useStateE(null);
  useEffectE(() => { setPicked(null); }, [word.id, lang]);

  function choose(o) {
    if (answered || picked) return;
    setPicked(o);
    onResult(o === correct);
  }
  return (
    <>
      {children}
      <div style={{ display: 'grid', gridTemplateColumns: lang === 'en' ? '1fr 1fr' : '1fr', gap: 10, marginTop: 'auto' }}>
        {opts.map((o, i) => {
          let state = 'idle';
          if (picked) { if (o === correct) state = 'correct'; else if (o === picked) state = 'wrong'; else state = 'dim'; }
          const styles = {
            idle: { background: 'var(--surface)', color: 'var(--ink)', boxShadow: 'var(--shadow-sm)' },
            correct: { background: 'var(--success-soft)', color: 'var(--success-ink)', boxShadow: 'inset 0 0 0 2px var(--success)' },
            wrong: { background: 'var(--danger-soft)', color: 'var(--danger-ink)', boxShadow: 'inset 0 0 0 2px var(--danger)' },
            dim: { background: 'var(--surface)', color: 'var(--ink-mute)', opacity: 0.5 },
          }[state];
          return (
            <button key={i} className={picked ? '' : 'btn-press'} onClick={() => choose(o)} style={{ border: 'none', cursor: picked ? 'default' : 'pointer',
              borderRadius: 'var(--r-btn)', padding: '17px 16px', fontFamily: 'var(--font)', fontSize: 17, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .2s', minHeight: 58, ...styles }}>
              {state === 'correct' && <Icon name="check" size={18} stroke={3} />}
              {state === 'wrong' && <Icon name="x" size={18} stroke={3} />}
              {o}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ---------- Type 3: fill the gap ----------
function FillGap({ word, answered, onResult }) {
  const [val, setVal] = useStateE('');
  const [locked, setLocked] = useStateE(false);
  useEffectE(() => { setVal(''); setLocked(false); }, [word.id]);
  const parts = (word.example || '___').split('___');

  function check() {
    if (locked || !val.trim()) return;
    setLocked(true);
    onResult(val.trim().toLowerCase() === word.english.toLowerCase());
  }
  return (
    <>
      <ExHead title="Вставьте пропущенное слово" />
      <Card pad={18} style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 19, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.6 }}>
          {parts[0]}
          <span style={{ display: 'inline-flex', minWidth: 70, borderBottom: '3px solid var(--primary)', textAlign: 'center',
            color: 'var(--primary)', fontWeight: 800, justifyContent: 'center', padding: '0 6px' }}>{val || '\u00A0'}</span>
          {parts[1]}
        </div>
        <div style={{ marginTop: 12, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: 'var(--ink-mute)' }}>= {word.russian}</div>
      </Card>
      <input autoFocus value={val} disabled={locked} onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && check()} placeholder="введите слово…"
        style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font)', fontSize: 18, fontWeight: 700, color: 'var(--ink)',
          background: 'var(--surface)', border: '2px solid var(--line)', borderRadius: 'var(--r-btn)', padding: '15px 16px', outline: 'none', marginBottom: 14 }} />
      <Button full variant="primary" onClick={check} disabled={!val.trim() || locked} style={{ marginTop: 'auto' }}>Проверить</Button>
    </>
  );
}

// ---------- Type 4: assemble from letters ----------
function Assemble({ word, answered, onResult }) {
  const target = word.english;
  const initial = useMemoE(() => {
    let s = shuffle(target.split(''));
    if (s.join('') === target && target.length > 1) s = shuffle(s);
    return s.map((ch, i) => ({ ch, id: i }));
  }, [word.id]);
  const [bank, setBank] = useStateE(initial);
  const [slots, setSlots] = useStateE([]);
  const [locked, setLocked] = useStateE(false);
  useEffectE(() => { setBank(initial); setSlots([]); setLocked(false); }, [word.id]);

  function place(tile) { if (locked) return; setBank(b => b.filter(t => t.id !== tile.id)); setSlots(s => [...s, tile]); }
  function remove(tile) { if (locked) return; setSlots(s => s.filter(t => t.id !== tile.id)); setBank(b => [...b, tile]); }

  useEffectE(() => {
    if (!locked && slots.length === target.length && slots.length > 0) {
      const guess = slots.map(t => t.ch).join('');
      setLocked(true);
      setTimeout(() => onResult(guess.toLowerCase() === target.toLowerCase()), 250);
    }
  }, [slots]);

  return (
    <>
      <ExHead title="Соберите слово из букв" />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
        <WordTile icon={word.icon} hue={word.hue} size={120} />
      </div>
      <div style={{ textAlign: 'center', fontFamily: 'var(--font)', fontSize: 17, fontWeight: 700, color: 'var(--primary)', marginBottom: 16 }}>{word.russian}</div>

      {/* answer slots */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 7, minHeight: 56, marginBottom: 4,
        padding: '12px', background: 'var(--surface-2)', borderRadius: 16 }}>
        {slots.length === 0 && <span style={{ fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 600, color: 'var(--ink-mute)', alignSelf: 'center' }}>нажимайте на буквы ниже</span>}
        {slots.map(t => (
          <button key={t.id} onClick={() => remove(t)} className="tile-pop" style={{ border: 'none', cursor: 'pointer', width: 40, height: 46, borderRadius: 11,
            background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, boxShadow: 'var(--shadow-sm)' }}>{t.ch}</button>
        ))}
      </div>
      <div style={{ height: 28 }} />

      {/* letter bank */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 'auto' }}>
        {bank.map(t => (
          <button key={t.id} onClick={() => place(t)} className="btn-press" style={{ border: 'none', cursor: 'pointer', width: 46, height: 52, borderRadius: 13,
            background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, boxShadow: 'var(--shadow-sm)' }}>{t.ch}</button>
        ))}
        {bank.length === 0 && !locked && <span style={{ fontFamily: 'var(--font)', fontSize: 13, color: 'var(--ink-mute)' }}>\u00A0</span>}
      </div>
    </>
  );
}

// small shared exercise header
function ExHead({ title }) {
  return <div style={{ textAlign: 'center', fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: 'var(--ink-mute)', marginBottom: 18 }}>{title}</div>;
}

// stimulus blocks for MCQ
function StimEN({ word, audio }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        {audio
          ? <button className="btn-press" onClick={() => speakWord(word.english)} style={{ border: 'none', cursor: 'pointer', width: 120, height: 120, borderRadius: '50%',
              background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <Icon name="volume" size={48} color="var(--primary)" stroke={2.2} /></button>
          : <WordTile icon={word.icon} hue={word.hue} size={140} photo />}
      </div>
      {audio
        ? <div style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, color: 'var(--ink-mute)' }}>Нажмите, чтобы прослушать</div>
        : <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{word.english}</h2>
            {word.transcription && <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--ink-mute)', marginTop: 4 }}>{word.transcription}</div>}
          </>}
    </div>
  );
}

function StimRU({ word }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 26, marginTop: 10 }}>
      <div style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Переведите на английский</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{word.russian}</h2>
    </div>
  );
}

// ---------- dispatcher ----------
function Exercise({ layer, word, pool, answered, onResult }) {
  if (layer === 1) return <MCQ word={word} pool={pool} lang="ru" answered={answered} onResult={onResult}><StimEN word={word} /></MCQ>;
  if (layer === 2) return <MCQ word={word} pool={pool} lang="en" answered={answered} onResult={onResult}><StimRU word={word} /></MCQ>;
  if (layer === 3) return <FillGap word={word} answered={answered} onResult={onResult} />;
  if (layer === 4) return <Assemble word={word} answered={answered} onResult={onResult} />;
  if (layer === 5) return <MCQ word={word} pool={pool} lang="ru" answered={answered} onResult={onResult}><StimEN word={word} audio /></MCQ>;
  return null;
}

Object.assign(window, { Exercise, MCQ, FillGap, Assemble });
