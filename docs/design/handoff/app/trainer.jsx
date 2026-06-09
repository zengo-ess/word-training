// trainer.jsx — New-words trainer. Walks the batch layer-by-layer (types 1→5),
// accumulating errors within each layer exactly per the spec.
const { useState: useStateT, useEffect: useEffectT, useRef: useRefT, useMemo: useMemoT } = React;

function shuffle(a) { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }

function speakWord(text) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

// does a word apply to a given layer/type?
const appliesToType = (w, t) => (t === 3 ? !!w.example : true);

function buildQueue(batch, t) { return batch.filter(w => appliesToType(w, t)).map(w => w.id); }

function TrainerScreen({ nav, batch }) {
  const pool = batch;
  const byId = useMemoT(() => Object.fromEntries(batch.map(w => [w.id, w])), [batch]);

  const [layer, setLayer] = useStateT(1);
  const [queue, setQueue] = useStateT(() => buildQueue(batch, 1));
  const [errors, setErrors] = useStateT([]);
  const [passed, setPassed] = useStateT(0);
  const [target, setTarget] = useStateT(() => buildQueue(batch, 1).length);
  const [answered, setAnswered] = useStateT(null); // null | 'correct' | 'wrong'
  const [done, setDone] = useStateT(false);
  const [redo, setRedo] = useStateT(false); // showing reshuffled error pile

  const currentId = queue[0];
  const word = byId[currentId];

  // advance to next applicable layer (skips layers with empty queue, e.g. all-skipped type 3)
  function enterLayer(t) {
    while (t <= 5) {
      const q = buildQueue(batch, t);
      if (q.length) { setLayer(t); setQueue(q); setErrors([]); setPassed(0); setTarget(q.length); setRedo(false); return; }
      t++;
    }
    setDone(true);
  }

  function handleResult(correct) {
    if (answered) return;
    setAnswered(correct ? 'correct' : 'wrong');
    setTimeout(() => {
      setAnswered(null);
      const [head, ...rest] = queue;
      if (correct) {
        const np = passed + 1;
        setPassed(np);
        if (np >= target) { enterLayer(layer + 1); return; }
        if (rest.length === 0 && errors.length) { setQueue(shuffle(errors)); setErrors([]); setRedo(true); }
        else setQueue(rest);
      } else {
        const newErrors = [...errors, head];
        if (rest.length === 0) { setQueue(shuffle(newErrors)); setErrors([]); setRedo(true); }
        else { setQueue(rest); setErrors(newErrors); }
      }
    }, correct ? 750 : 1050);
  }

  if (done) return <TrainerDone nav={nav} count={batch.length} />;
  if (!word) return null;

  const layerInfo = EX_TYPES[layer];

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 60, display: 'flex', flexDirection: 'column' }}>
      {/* top bar */}
      <div style={{ paddingTop: 54, paddingLeft: 16, paddingRight: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <IconBtn name="x" onClick={nav.back} variant="plain" size={36} iconSize={18} />
          <div style={{ flex: 1 }}>
            <SegBar total={target} doneIdx={passed} />
          </div>
          <span style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 800, color: 'var(--ink-soft)' }}>{passed}/{target}</span>
        </div>
        {/* layer tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          {[1, 2, 3, 4, 5].map(t => {
            const active = t === layer, doneL = t < layer;
            return (
              <div key={t} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  background: active ? 'var(--primary)' : doneL ? 'var(--success-soft)' : 'var(--surface-2)',
                  color: active ? 'var(--on-primary)' : doneL ? 'var(--success)' : 'var(--ink-mute)' }}>
                  {doneL ? <Icon name="check" size={15} stroke={3} /> : <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}>{t}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'center', fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-mute)', marginTop: 6 }}>
          {layerInfo.name}{redo ? ' · работа над ошибками' : ''}
        </div>
      </div>

      {/* exercise body */}
      <div key={`${layer}-${currentId}-${queue.length}-${errors.length}`} className="ex-enter" style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 24px', display: 'flex', flexDirection: 'column' }}>
        <Exercise layer={layer} word={word} pool={pool} answered={answered} onResult={handleResult} />
      </div>

      {/* feedback toast */}
      {answered && <FeedbackBar kind={answered} word={word} />}
    </div>
  );
}

function FeedbackBar({ kind, word }) {
  const ok = kind === 'correct';
  return (
    <div className="fb-enter" style={{ position: 'absolute', left: 16, right: 16, bottom: 30, zIndex: 80,
      background: ok ? 'var(--success)' : 'var(--danger)', borderRadius: 18, padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 12px 30px -8px rgba(0,0,0,0.3)' }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={ok ? 'check' : 'x'} size={20} color="#fff" stroke={3} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 15.5, fontWeight: 800, color: '#fff' }}>{ok ? 'Верно!' : 'Почти!'}</div>
        {!ok && <div style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{word.english} — {word.russian}</div>}
      </div>
    </div>
  );
}

function TrainerDone({ nav, count }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg)', zIndex: 60, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 30, textAlign: 'center' }}>
      <div className="pop" style={{ width: 110, height: 110, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-2))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 18px 40px -12px var(--primary-glow)' }}>
        <Icon name="trophy" size={54} color="#fff" stroke={2} />
      </div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--ink)', margin: '0 0 8px' }}>Батч выучен! 🎉</h1>
      <p style={{ fontFamily: 'var(--font)', fontSize: 15.5, fontWeight: 600, color: 'var(--ink-soft)', margin: '0 0 6px', lineHeight: 1.5, maxWidth: 280 }}>
        {count} слов прошли все 5 типов и отправились в умное повторение.
      </p>
      <div style={{ display: 'flex', gap: 8, margin: '14px 0 28px' }}>
        <Pill tone="success" icon="refresh">Повтор через 1 день</Pill>
      </div>
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button full variant="primary" icon="sparkles" onClick={nav.back}>Готово</Button>
      </div>
    </div>
  );
}

Object.assign(window, { TrainerScreen, speakWord, shuffle });
