// screens-home.jsx — Home dashboard, Stats, Profile
const { useState: useStateH } = React;

const WEEK_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function StreakStrip({ week }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
      {week.map((active, i) => {
        const isToday = i === week.length - 1;
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.22)',
              boxShadow: isToday ? '0 0 0 2.5px rgba(255,255,255,0.65)' : 'none' }}>
              {active && <Icon name="flame" size={16} color="var(--primary)" fill="var(--primary)" stroke={1.5} />}
            </div>
            <span style={{ fontFamily: 'var(--font)', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{WEEK_LABELS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function HomeScreen({ nav, decks }) {
  const s = TODAY_STATS;
  const inProgressDecks = decks.filter(d => { const st = deckStats(d); return st.learned > 0 && st.learned < st.total; });

  return (
    <Page>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: 'var(--ink-mute)' }}>Понедельник, 9 июня</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 27, fontWeight: 700, color: 'var(--ink)', margin: '2px 0 0' }}>Привет! 👋</h1>
        </div>
        <IconBtn name="settings" onClick={() => nav.tab('profile')} />
      </div>

      {/* streak hero */}
      <div style={{ borderRadius: 'var(--r-card)', padding: 18, marginBottom: 14, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--primary), var(--primary-2))',
        boxShadow: '0 14px 30px -12px var(--primary-glow)' }}>
        <div style={{ position: 'absolute', top: -30, right: -20, opacity: 0.16 }}>
          <Icon name="flame" size={150} color="#fff" fill="#fff" stroke={0} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{s.streak}</span>
            <span style={{ fontFamily: 'var(--font)', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>дней подряд</span>
          </div>
          <div style={{ fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.82)', margin: '4px 0 16px' }}>
            Отличный темп — не теряй огонёк 🔥
          </div>
          <StreakStrip week={s.week} />
        </div>
      </div>

      {/* today goal */}
      <Card pad={16} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Ring value={s.doneToday} max={s.dailyGoal} size={74} stroke={8}>
            <div style={{ textAlign: 'center', lineHeight: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--ink)' }}>{s.doneToday}</div>
              <div style={{ fontFamily: 'var(--font)', fontSize: 10, fontWeight: 700, color: 'var(--ink-mute)' }}>из {s.dailyGoal}</div>
            </div>
          </Ring>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font)', fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Цель на сегодня</div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginTop: 2 }}>
              Ещё {s.dailyGoal - s.doneToday} слов до цели
            </div>
          </div>
        </div>
      </Card>

      {/* two CTAs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
        <Card onClick={() => nav.review()} pad={15} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--amber-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="refresh" size={20} color="var(--amber-ink)" stroke={2.4} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)' }}>{s.dueToday}</span>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>Повторить</div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, color: 'var(--ink-mute)' }}>слов готово к повтору</div>
          </div>
        </Card>
        <Card onClick={() => nav.learn()} pad={15} style={{ display: 'flex', flexDirection: 'column', gap: 10,
          background: 'var(--primary-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="sparkles" size={20} color="var(--on-primary)" stroke={2.4} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--primary-ink)' }}>{s.inProgress}</span>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 800, color: 'var(--primary-ink)' }}>Учить новые</div>
            <div style={{ fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, color: 'var(--primary-ink)', opacity: 0.7 }}>слов в процессе</div>
          </div>
        </Card>
      </div>

      {/* continue learning */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Продолжить</h2>
        <button onClick={() => nav.tab('decks')} style={{ border: 'none', background: 'transparent', cursor: 'pointer',
          fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 700, color: 'var(--primary)' }}>Все колоды</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {inProgressDecks.slice(0, 3).map(d => {
          const st = deckStats(d);
          const pct = Math.round((st.learned / st.total) * 100);
          return (
            <Card key={d.id} onClick={() => nav.deck(d.id)} pad={13} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={d.icon} size={23} color="var(--primary)" stroke={2.2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font)', fontSize: 15, fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <ProgressBar value={st.learned} max={st.total} height={6} />
                  <span style={{ fontFamily: 'var(--font)', fontSize: 12, fontWeight: 800, color: 'var(--ink-soft)' }}>{pct}%</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}

function StatRow({ icon, tone, label, value, sub }) {
  return (
    <Card pad={15} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `var(--${tone}-soft)` }}>
        <Icon name={icon} size={22} color={`var(--${tone}-ink)`} stroke={2.3} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>{label}</div>
        {sub && <div style={{ fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, color: 'var(--ink-mute)' }}>{sub}</div>}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--ink)' }}>{value}</div>
    </Card>
  );
}

function StatsScreen({ nav, decks }) {
  const s = TODAY_STATS;
  return (
    <Page>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: '4px 0 18px' }}>Прогресс</h1>

      {/* streak + goal summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <Card pad={16} style={{ textAlign: 'center' }}>
          <Icon name="flame" size={26} color="var(--primary)" fill="var(--primary)" stroke={1.4} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--ink)' }}>{s.streak}</div>
          <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-mute)' }}>дней стрик</div>
        </Card>
        <Card pad={16} style={{ textAlign: 'center' }}>
          <Icon name="trophy" size={26} color="var(--amber-ink)" stroke={2} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--ink)' }}>{s.learnedTotal}</div>
          <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-mute)' }}>слов выучено</div>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
        <StatRow icon="sparkles" tone="primary" label="В процессе изучения" sub="проходят 5 типов" value={s.inProgress} />
        <StatRow icon="refresh" tone="amber" label="Запланировано на сегодня" sub="готовы к повтору" value={s.dueToday} />
        <StatRow icon="target" tone="success" label="Цель сегодня" sub={`${s.doneToday} из ${s.dailyGoal} выполнено`} value={`${Math.round(s.doneToday / s.dailyGoal * 100)}%`} />
      </div>

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: '0 0 12px' }}>Прогресс по колодам</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {decks.filter(d => deckStats(d).learned > 0).map(d => {
          const st = deckStats(d);
          const pct = Math.round((st.learned / st.total) * 100);
          return (
            <Card key={d.id} pad={14} onClick={() => nav.deck(d.id)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                <span style={{ fontFamily: 'var(--font)', fontSize: 14.5, fontWeight: 800, color: 'var(--ink)' }}>{d.name}</span>
                <span style={{ fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-mute)' }}>{st.learned}/{st.total}</span>
              </div>
              <ProgressBar value={st.learned} max={st.total} height={8} color={pct === 100 ? 'var(--success)' : 'var(--primary)'} />
            </Card>
          );
        })}
      </div>
    </Page>
  );
}

function ProfileScreen({ nav, tweaksOn }) {
  const rows = [
    { icon: 'target', label: 'Дневная цель', detail: '20 слов' },
    { icon: 'volume', label: 'Озвучка слов', detail: 'Вкл' },
    { icon: 'refresh', label: 'Направление повторов', detail: 'Оба' },
    { icon: 'calendar', label: 'Напоминания', detail: '20:00' },
  ];
  return (
    <Page>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: '4px 0 18px' }}>Профиль</h1>
      <Card pad={18} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: '#fff' }}>Я</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--ink)' }}>Моё обучение</div>
          <div style={{ fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, color: 'var(--ink-mute)' }}>{TODAY_STATS.learnedTotal} слов · стрик {TODAY_STATS.streak} дней</div>
        </div>
      </Card>
      <div style={{ fontFamily: 'var(--font)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: 0.4, margin: '4px 4px 8px' }}>Настройки тренажёра</div>
      <Card pad={4}>
        {rows.map((r, i) => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 12px',
            borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <Icon name={r.icon} size={20} color="var(--ink-soft)" stroke={2.2} />
            <span style={{ flex: 1, fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{r.label}</span>
            <span style={{ fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600, color: 'var(--ink-mute)' }}>{r.detail}</span>
            <Icon name="chevronRight" size={17} color="var(--ink-mute)" stroke={2.4} />
          </div>
        ))}
      </Card>
      <div style={{ textAlign: 'center', marginTop: 18, fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-mute)' }}>
        💡 Откройте панель Tweaks, чтобы менять тему, цвет и шрифт
      </div>
    </Page>
  );
}

Object.assign(window, { HomeScreen, StatsScreen, ProfileScreen });
