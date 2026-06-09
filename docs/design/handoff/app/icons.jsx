// icons.jsx — curated lucide-style icon set rendered as a single <Icon> component.
// Simple stroked paths; concept icons double as word-image placeholders.

const ICON_PATHS = {
  // ---- UI ----
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /></>,
  layers: <><path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 12 10 5 10-5" /><path d="m2 17 10 5 10-5" /></>,
  chart: <><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" rx="1" /><rect x="12" y="7" width="3" height="10" rx="1" /><rect x="17" y="13" width="3" height="4" rx="1" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  flame: <path d="M12 2c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .3-1.8.8-2.5C9 9 9.5 10 10.5 10c.6 0 .5-.8.3-1.6C10.4 6.7 11 3.7 12 2Z" />,
  check: <path d="M4 12.5 9.5 18 20 6.5" />,
  x: <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  arrowRight: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  arrowLeft: <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
  volume: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 6a9 9 0 0 1 0 12" /></>,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.6 1-5.8-4.2-4.1 5.9-.9L12 3.5Z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></>,
  sparkles: <><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" /><path d="M19 14l.7 1.8L21.5 16.5l-1.8.7L19 19l-.7-1.8L16.5 16.5l1.8-.7L19 14Z" /></>,
  bookOpen: <><path d="M12 6.5C10.5 5.2 8.5 4.5 4 5v13c4.5-.5 6.5.2 8 1.5 1.5-1.3 3.5-2 8-1.5V5c-4.5-.5-6.5.2-8 1.5Z" /><path d="M12 6.5v13" /></>,
  shuffle: <><path d="M16 4h4v4" /><path d="M20 4 4 20" /><path d="M4 4l5 5" /><path d="M15 15l5 5v-4" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  trophy: <><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v1a3 3 0 0 0 3 3" /><path d="M17 6h3v1a3 3 0 0 1-3 3" /><path d="M10 14.5V18h4v-3.5" /><path d="M8 21h8" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18" /><path d="M8 3v4M16 3v4" /></>,
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  refresh: <><path d="M20 11A8 8 0 0 0 6.3 6.3L3 9" /><path d="M3 4v5h5" /><path d="M4 13a8 8 0 0 0 13.7 4.7L21 15" /><path d="M21 20v-5h-5" /></>,
  // ---- concept / word icons ----
  droplet: <path d="M12 3.5c3 4 5.5 6.3 5.5 9.5a5.5 5.5 0 0 1-11 0c0-3.2 2.5-5.5 5.5-9.5Z" />,
  sun: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M19.2 4.8l-1.8 1.8M6.6 17.4l-1.8 1.8" /></>,
  coffee: <><path d="M5 8h11v5a5 5 0 0 1-10 0V8Z" /><path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16" /><path d="M6 3v1.5M10 3v1.5M14 3v1.5" /></>,
  music: <><path d="M9 18V6l11-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>,
  heart: <path d="M12 20s-7-4.4-9.2-8.6C1.3 8.5 2.8 5 6 5c2 0 3 1.3 4 2.7C11 6.3 12 5 14 5c3.2 0 4.7 3.5 3.2 6.4C19 15.6 12 20 12 20Z" />,
  car: <><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" /><path d="M3 11h18v5a1 1 0 0 1-1 1h-1.5M5.5 17H4a1 1 0 0 1-1-1v-5" /><circle cx="7.5" cy="17" r="1.8" /><circle cx="16.5" cy="17" r="1.8" /></>,
  cloud: <path d="M7 18a4 4 0 0 1-.5-7.97A5 5 0 0 1 16 9a3.5 3.5 0 0 1 1 6.86" />,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />,
  gift: <><rect x="3.5" y="9" width="17" height="4" rx="1" /><path d="M5 13v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" /><path d="M12 9v12" /><path d="M12 9C12 9 11 4.5 8.5 4.5A2 2 0 0 0 8.5 9M12 9s1-4.5 3.5-4.5A2 2 0 0 1 15.5 9" /></>,
  key: <><circle cx="8" cy="8" r="4" /><path d="m11 11 8 8" /><path d="m17 17 2-2M15 19l2-2" /></>,
  phone: <><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  leaf: <><path d="M4 20S4 9 13 8c4-.5 7-3 7-3s1 11-7 13c-5 1.2-9-.5-9-.5Z" /><path d="M4 20c3-6 6-8 9-9" /></>,
  apple: <><path d="M12 7c-1.5-2-4.5-2.5-6 0-2 3 0 9 2.5 11 1 .8 2 .8 3.5 0 1.5.8 2.5.8 3.5 0C18 16 20 10 18 7c-1.5-2.5-4.5-2-6 0Z" /><path d="M12 7c0-2 1-3.5 3-4" /></>,
  utensils: <><path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10" /><path d="M16 3c-1.5 0-2.5 2-2.5 4.5S14.5 12 16 12v9" /></>,
  plane: <path d="M21 14.5 13.5 12V5.5a1.5 1.5 0 0 0-3 0V12L3 14.5v2L10.5 15v3.5L8 20.2V22l4-1 4 1v-1.8L13.5 18.5V15L21 16.5Z" />,
  briefcase: <><rect x="3" y="7.5" width="18" height="12" rx="2.5" /><path d="M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5" /><path d="M3 13h18" /></>,
  smile: <><circle cx="12" cy="12" r="9" /><path d="M8.5 14a4 4 0 0 0 7 0" /><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" /></>,
  hash: <><path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" /></>,
};

function Icon({ name, size = 24, color = 'currentColor', stroke = 2, fill = 'none', style = {} }) {
  const p = ICON_PATHS[name] || ICON_PATHS.sparkles;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}>
      {p}
    </svg>
  );
}

Object.assign(window, { Icon, ICON_PATHS });
