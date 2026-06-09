// ui.jsx — shared presentational components for the vocab trainer.
const { useState, useEffect, useRef } = React;

// Soft pastel tile that stands in for the Unsplash photo. Big concept icon centered.
function WordTile({ icon, hue = 55, size = 'md', round, photo }) {
  const dims = { sm: 48, md: 88, lg: 168, xl: 200 }[size] || size;
  const isNum = typeof size === 'number';
  const px = isNum ? size : dims;
  const iconSize = px * 0.42;
  const radius = round != null ? round : 'var(--r-tile)';
  return (
    <div className="wt" style={{
      width: px, height: px, borderRadius: radius, position: 'relative', overflow: 'hidden',
      background: `linear-gradient(150deg, oklch(0.94 0.06 ${hue}), oklch(0.88 0.09 ${hue}))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5,
        background: `radial-gradient(120% 90% at 78% 18%, oklch(0.97 0.05 ${hue}) 0%, transparent 55%)` }} />
      <Icon name={icon} size={iconSize} color={`oklch(0.45 0.13 ${hue})`} stroke={px > 120 ? 2 : 2.2} />
      {photo && (
        <div style={{ position: 'absolute', bottom: 6, right: 6, fontFamily: 'var(--mono)', fontSize: 9,
          letterSpacing: 0.3, color: `oklch(0.42 0.1 ${hue})`, background: 'rgba(255,255,255,0.65)',
          padding: '2px 6px', borderRadius: 6, textTransform: 'uppercase' }}>фото</div>
      )}
    </div>
  );
}

function Button({ children, onClick, variant = 'primary', size = 'lg', icon, iconRight, full, disabled, style = {} }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: 'var(--font)', fontWeight: 800, cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', borderRadius: 'var(--r-btn)', transition: 'transform .12s, box-shadow .12s, background .15s, opacity .15s',
    width: full ? '100%' : 'auto', opacity: disabled ? 0.45 : 1, whiteSpace: 'nowrap',
    fontSize: size === 'lg' ? 17 : size === 'sm' ? 14 : 16,
    padding: size === 'lg' ? '16px 22px' : size === 'sm' ? '9px 14px' : '12px 18px',
  };
  const variants = {
    primary: { background: 'var(--primary)', color: 'var(--on-primary)', boxShadow: '0 6px 16px -6px var(--primary-glow), inset 0 -2px 0 rgba(0,0,0,0.12)' },
    soft: { background: 'var(--primary-soft)', color: 'var(--primary-ink)' },
    ghost: { background: 'transparent', color: 'var(--ink-soft)' },
    surface: { background: 'var(--surface)', color: 'var(--ink)', boxShadow: 'var(--shadow-sm)' },
    success: { background: 'var(--success)', color: '#fff', boxShadow: '0 6px 16px -6px var(--success)' },
    outline: { background: 'transparent', color: 'var(--ink)', boxShadow: 'inset 0 0 0 2px var(--line)' },
  };
  return (
    <button className="btn-press" onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}>
      {icon && <Icon name={icon} size={size === 'lg' ? 20 : 18} stroke={2.4} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'lg' ? 20 : 18} stroke={2.4} />}
    </button>
  );
}

function Card({ children, onClick, pad = 16, style = {}, className = '' }) {
  return (
    <div onClick={onClick} className={`card ${onClick ? 'card-tap' : ''} ${className}`}
      style={{ background: 'var(--surface)', borderRadius: 'var(--r-card)', padding: pad,
        boxShadow: 'var(--shadow-sm)', ...style }}>
      {children}
    </div>
  );
}

function ProgressBar({ value, max = 100, color = 'var(--primary)', height = 8, bg = 'var(--track)' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ height, background: bg, borderRadius: 999, overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999,
        transition: 'width .5s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  );
}

function Ring({ value, max = 100, size = 64, stroke = 7, color = 'var(--primary)', children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

// Segmented batch progress bar (one segment per word in batch)
function SegBar({ total, doneIdx, errorIdx = [] }) {
  return (
    <div style={{ display: 'flex', gap: 4, width: '100%' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 6, borderRadius: 999,
          background: i < doneIdx ? 'var(--primary)' : i === doneIdx ? 'var(--primary-soft)' : 'var(--track)',
          transition: 'background .3s' }} />
      ))}
    </div>
  );
}

function Pill({ children, tone = 'neutral', icon, style = {} }) {
  const tones = {
    neutral: { background: 'var(--surface-2)', color: 'var(--ink-soft)' },
    primary: { background: 'var(--primary-soft)', color: 'var(--primary-ink)' },
    success: { background: 'var(--success-soft)', color: 'var(--success-ink)' },
    amber: { background: 'var(--amber-soft)', color: 'var(--amber-ink)' },
    danger: { background: 'var(--danger-soft)', color: 'var(--danger-ink)' },
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font)', whiteSpace: 'nowrap',
      fontWeight: 700, fontSize: 12.5, padding: '5px 10px', borderRadius: 999, ...tones[tone], ...style }}>
      {icon && <Icon name={icon} size={13} stroke={2.6} />}
      {children}
    </span>
  );
}

function IconBtn({ name, onClick, size = 40, iconSize = 20, variant = 'surface', style = {} }) {
  const v = { surface: { background: 'var(--surface)', boxShadow: 'var(--shadow-sm)', color: 'var(--ink)' },
    plain: { background: 'var(--surface-2)', color: 'var(--ink-soft)' },
    ghost: { background: 'transparent', color: 'var(--ink-soft)' } }[variant];
  return (
    <button className="btn-press" onClick={onClick} style={{ width: size, height: size, borderRadius: '50%',
      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', ...v, ...style }}>
      <Icon name={name} size={iconSize} stroke={2.3} />
    </button>
  );
}

// Bottom navigation bar (custom, sits above home indicator)
function BottomNav({ tab, onTab, onLearn }) {
  const items = [
    { key: 'home', icon: 'home', label: 'Главная' },
    { key: 'decks', icon: 'layers', label: 'Колоды' },
    { key: '_learn', icon: 'plus', label: '' },
    { key: 'stats', icon: 'chart', label: 'Прогресс' },
    { key: 'profile', icon: 'settings', label: 'Профиль' },
  ];
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40,
      paddingBottom: 26, paddingTop: 8, background: 'var(--nav-bg)',
      backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      borderTop: '1px solid var(--nav-line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 12px' }}>
        {items.map(it => {
          if (it.key === '_learn') {
            return (
              <button key="learn" className="btn-press" onClick={onLearn} style={{ border: 'none', cursor: 'pointer',
                width: 58, height: 58, borderRadius: 20, marginTop: -22, background: 'var(--primary)',
                color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 22px -8px var(--primary-glow), inset 0 -3px 0 rgba(0,0,0,0.14)' }}>
                <Icon name="sparkles" size={26} stroke={2.4} />
              </button>
            );
          }
          const active = tab === it.key;
          return (
            <button key={it.key} className="btn-press" onClick={() => onTab(it.key)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex',
                flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 6px', width: 60,
                color: active ? 'var(--primary)' : 'var(--ink-mute)' }}>
              <Icon name={it.icon} size={23} stroke={active ? 2.6 : 2.1} />
              <span style={{ fontFamily: 'var(--font)', fontSize: 10.5, fontWeight: active ? 800 : 600 }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Full-screen scrollable page area inside the device (accounts for status bar + nav)
function Page({ children, withNav = true, pad = true, scrollRef }) {
  return (
    <div ref={scrollRef} className="page-scroll" style={{ position: 'absolute', inset: 0, overflowY: 'auto',
      paddingTop: 56, paddingBottom: withNav ? 104 : 40,
      paddingLeft: pad ? 18 : 0, paddingRight: pad ? 18 : 0 }}>
      {children}
    </div>
  );
}

Object.assign(window, { WordTile, Button, Card, ProgressBar, Ring, SegBar, Pill, IconBtn, BottomNav, Page });
