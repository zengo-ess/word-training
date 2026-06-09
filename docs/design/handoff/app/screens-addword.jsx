// screens-addword.jsx — Add a custom word: auto-translate (MyMemory) + image pick (Unsplash)
const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

const IMG_SUGGESTIONS = ['sun', 'cloud', 'star', 'leaf', 'heart', 'moon'];

function AddWordScreen({ nav, onSave }) {
  const [eng, setEng] = useStateA('');
  const [ru, setRu] = useStateA('');
  const [stage, setStage] = useStateA('input'); // input | loading | ready
  const [pickedImg, setPickedImg] = useStateA(0);
  const [imgQuery, setImgQuery] = useStateA('');
  const inputRef = useRefA(null);

  useEffectA(() => { inputRef.current && inputRef.current.focus(); }, []);

  function lookup() {
    if (!eng.trim()) return;
    setStage('loading');
    // simulate MyMemory + Unsplash latency
    setTimeout(() => {
      const guesses = { dog: 'собака', cat: 'кошка', happy: 'счастливый', run: 'бежать', friend: 'друг', city: 'город', dream: 'мечта', light: 'свет' };
      setRu(guesses[eng.trim().toLowerCase()] || 'перевод…');
      setImgQuery(eng.trim());
      setStage('ready');
    }, 1100);
  }

  const hues = [55, 25, 145, 200, 300, 95];

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 65 }}>
      <Page withNav={false}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <IconBtn name="x" onClick={nav.back} variant="plain" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>Новое слово</span>
          <div style={{ width: 40 }} />
        </div>

        {/* English input */}
        <label style={{ fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.4, marginLeft: 4 }}>Английское слово</label>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, marginBottom: 18 }}>
          <input ref={inputRef} value={eng} onChange={e => { setEng(e.target.value); setStage('input'); }}
            onKeyDown={e => e.key === 'Enter' && lookup()} placeholder="dream"
            style={{ flex: 1, fontFamily: 'var(--font)', fontSize: 18, fontWeight: 700, color: 'var(--ink)',
              background: 'var(--surface)', border: '2px solid var(--line)', borderRadius: 'var(--r-btn)',
              padding: '14px 16px', outline: 'none' }} />
          <Button variant="primary" size="md" onClick={lookup} disabled={!eng.trim() || stage === 'loading'} icon={stage === 'loading' ? 'refresh' : 'search'}>
            {stage === 'loading' ? '' : 'Найти'}
          </Button>
        </div>

        {stage === 'loading' && (
          <Card pad={18} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="spin"><Icon name="refresh" size={20} color="var(--primary)" stroke={2.4} /></div>
            <span style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: 'var(--ink-soft)' }}>Ищу перевод и картинку…</span>
          </Card>
        )}

        {stage === 'ready' && (
          <div className="fade-up">
            {/* translation draft */}
            <label style={{ fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.4, marginLeft: 4 }}>Перевод</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 6px' }}>
              <input value={ru} onChange={e => setRu(e.target.value)}
                style={{ flex: 1, fontFamily: 'var(--font)', fontSize: 17, fontWeight: 700, color: 'var(--ink)',
                  background: 'var(--surface)', border: '2px solid var(--line)', borderRadius: 'var(--r-btn)', padding: '13px 15px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, marginLeft: 4 }}>
              <Pill tone="primary" icon="sparkles" style={{ fontSize: 11 }}>MyMemory</Pill>
              <span style={{ fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, color: 'var(--ink-mute)' }}>черновик — поправьте при необходимости</span>
            </div>

            {/* image picker */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginLeft: 4, marginRight: 4 }}>
              <label style={{ fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Картинка</label>
              <Pill tone="amber" icon="search" style={{ fontSize: 11 }}>Unsplash: {imgQuery}</Pill>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 22 }}>
              {IMG_SUGGESTIONS.map((ic, i) => (
                <button key={i} className="btn-press" onClick={() => setPickedImg(i)} style={{ border: 'none', padding: 0, cursor: 'pointer',
                  borderRadius: 'var(--r-tile)', position: 'relative', background: 'transparent',
                  outline: pickedImg === i ? '3px solid var(--primary)' : '3px solid transparent', outlineOffset: 2 }}>
                  <WordTile icon={ic} hue={hues[i]} size={92} photo />
                  {pickedImg === i && <div style={{ position: 'absolute', top: 6, left: 6, width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <Icon name="check" size={13} color="#fff" stroke={3.2} /></div>}
                </button>
              ))}
            </div>

            {/* note about missing fields */}
            <Card pad={13} style={{ display: 'flex', gap: 10, marginBottom: 20, background: 'var(--surface-2)', boxShadow: 'none' }}>
              <Icon name="sparkles" size={18} color="var(--ink-mute)" stroke={2} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
                Транскрипция и пример для своих слов не подтягиваются. Тип 3 (пропуск) для слова без примера будет пропущен.
              </span>
            </Card>

            <Button full variant="primary" icon="check" onClick={() => onSave({ english: eng.trim(), russian: ru.trim(), icon: IMG_SUGGESTIONS[pickedImg], hue: hues[pickedImg] })}>
              Сохранить слово
            </Button>
          </div>
        )}
      </Page>
    </div>
  );
}

Object.assign(window, { AddWordScreen });
