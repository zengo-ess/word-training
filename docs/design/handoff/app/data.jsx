// data.jsx — demo decks, words, and helpers (mock backend).
// Word "images" are pastel icon tiles standing in for the real Unsplash photos.

// Warm pastel hues for word tiles (oklch h values rotated)
const TILE_HUES = [55, 25, 145, 200, 300, 95, 340, 175];

// Rich batch: built-in words have transcription + example (generated offline).
const BASIC = [
  { english: 'house',  russian: 'дом',      tr: '/haʊs/',     ex: 'This is my ___ and my family lives here.', icon: 'home' },
  { english: 'water',  russian: 'вода',     tr: '/ˈwɔːtər/',  ex: 'I drink a glass of ___ every morning.',     icon: 'droplet' },
  { english: 'sun',    russian: 'солнце',   tr: '/sʌn/',      ex: 'The ___ is very bright today.',             icon: 'sun' },
  { english: 'book',   russian: 'книга',    tr: '/bʊk/',      ex: 'She is reading an interesting ___.',        icon: 'bookOpen' },
  { english: 'coffee', russian: 'кофе',     tr: '/ˈkɒfi/',    ex: 'He drinks ___ without sugar.',              icon: 'coffee' },
  { english: 'music',  russian: 'музыка',   tr: '/ˈmjuːzɪk/', ex: 'They listen to ___ in the car.',           icon: 'music' },
  { english: 'heart',  russian: 'сердце',   tr: '/hɑːrt/',    ex: 'My ___ beats fast when I run.',             icon: 'heart' },
  { english: 'star',   russian: 'звезда',   tr: '/stɑːr/',    ex: 'I can see one bright ___ in the sky.',      icon: 'star' },
  { english: 'car',    russian: 'машина',   tr: '/kɑːr/',     ex: 'Their new ___ is bright red.',              icon: 'car' },
  { english: 'cloud',  russian: 'облако',   tr: '/klaʊd/',    ex: 'There is a single ___ in the sky.',         icon: 'cloud' },
  { english: 'moon',   russian: 'луна',     tr: '/muːn/',     ex: 'The ___ is full and round tonight.',        icon: 'moon' },
  { english: 'gift',   russian: 'подарок',  tr: '/ɡɪft/',     ex: 'I have a small ___ for you.',               icon: 'gift' },
  { english: 'key',    russian: 'ключ',     tr: '/kiː/',      ex: 'I can not find my ___ anywhere.',           icon: 'key' },
  { english: 'phone',  russian: 'телефон',  tr: '/foʊn/',     ex: 'Her ___ is new and very fast.',             icon: 'phone' },
  { english: 'leaf',   russian: 'лист',     tr: '/liːf/',     ex: 'A green ___ fell from the tree.',           icon: 'leaf' },
  { english: 'clock',  russian: 'часы',     tr: '/klɒk/',     ex: 'Look at the ___ on the wall.',              icon: 'clock' },
];

const FOOD = [
  { english: 'apple',  russian: 'яблоко',   tr: '/ˈæpəl/',    ex: 'She eats a red ___ after lunch.',           icon: 'apple' },
  { english: 'dinner', russian: 'ужин',     tr: '/ˈdɪnər/',   ex: 'We have ___ together at seven.',            icon: 'utensils' },
];

let _id = 1;
const nid = () => _id++;

function buildWords(list, deckId, learnedCount, srCount) {
  return list.map((w, i) => {
    const id = nid();
    let progress;
    if (i < learnedCount) {
      // already in spaced repetition
      progress = {
        current_type: null, learned: true,
        ease: 2.3, interval: [1, 3, 7][i % 3], total: 4 + (i % 5), correct: 3 + (i % 4),
        due: i < srCount ? 'today' : 'later',
      };
    } else {
      progress = { current_type: 0, learned: false, ease: 2.5, interval: 0, total: 0, correct: 0, due: null };
    }
    return {
      id, deck_id: deckId,
      english: w.english, russian: w.russian, transcription: w.tr,
      example: w.ex, icon: w.icon, hue: TILE_HUES[id % TILE_HUES.length],
      custom: false, progress,
    };
  });
}

const DECKS = [
  { id: 1, name: 'Базовые слова', sub: '16 самых нужных', builtin: true, icon: 'sparkles', words: buildWords(BASIC, 1, 5, 3) },
  { id: 2, name: 'Топ-100 глаголов', sub: 'Самые частые действия', builtin: true, icon: 'target', words: [] },
  { id: 3, name: 'Топ-100 существительных', sub: 'Предметы вокруг', builtin: true, icon: 'layers', words: [] },
  { id: 4, name: 'Топ-100 прилагательных', sub: 'Описываем мир', builtin: true, icon: 'star', words: [] },
  { id: 5, name: 'Oxford 3000', sub: '200 самых частых слов', builtin: true, icon: 'bookOpen', words: [] },
  { id: 6, name: 'Еда и кухня', sub: 'Тематическая колода', builtin: true, icon: 'utensils', words: buildWords(FOOD, 6, 0, 0) },
  { id: 7, name: 'Путешествия', sub: 'Тематическая колода', builtin: true, icon: 'plane', words: [] },
  { id: 8, name: 'Работа и офис', sub: 'Тематическая колода', builtin: true, icon: 'briefcase', words: [] },
  { id: 9, name: 'Эмоции', sub: 'Тематическая колода', builtin: true, icon: 'smile', words: [] },
  { id: 10, name: 'Числа и время', sub: 'Тематическая колода', builtin: true, icon: 'hash', words: [] },
];

// Fill placeholder built-in decks with synthetic counts for progress bars.
const DECK_META = {
  2: { total: 100, learned: 38 }, 3: { total: 100, learned: 12 }, 4: { total: 100, learned: 0 },
  5: { total: 200, learned: 64 }, 7: { total: 60, learned: 0 }, 8: { total: 55, learned: 9 },
  9: { total: 40, learned: 40 }, 10: { total: 45, learned: 22 },
};

// User custom deck
const MY_DECK = {
  id: 99, name: 'Мои слова', sub: 'Личная колода', builtin: false, icon: 'edit',
  words: [
    (() => { const id = nid(); return { id, deck_id: 99, english: 'deadline', russian: 'крайний срок', transcription: '', example: '', icon: 'clock', hue: 25, custom: true, progress: { current_type: 2, learned: false, ease: 2.5, interval: 0, total: 0, correct: 0, due: null } }; })(),
    (() => { const id = nid(); return { id, deck_id: 99, english: 'cozy', russian: 'уютный', transcription: '', example: '', icon: 'coffee', hue: 55, custom: true, progress: { current_type: null, learned: true, ease: 2.2, interval: 3, total: 5, correct: 5, due: 'today' } }; })(),
  ],
};

function deckStats(deck) {
  if (DECK_META[deck.id]) return DECK_META[deck.id];
  const total = deck.words.length;
  const learned = deck.words.filter(w => w.progress.learned).length;
  return { total, learned };
}

// Exercise type metadata
const EX_TYPES = {
  1: { key: 1, name: 'Перевод EN→RU', short: 'EN → RU' },
  2: { key: 2, name: 'Перевод RU→EN', short: 'RU → EN' },
  3: { key: 3, name: 'Вставь пропуск', short: 'Пропуск' },
  4: { key: 4, name: 'Собери из букв', short: 'Буквы' },
  5: { key: 5, name: 'Аудио', short: 'Аудио' },
};

// Build 4-option multiple choice (russian or english) using distractors from a pool.
function buildChoices(word, pool, lang) {
  const field = lang === 'ru' ? 'russian' : 'english';
  const correct = word[field];
  const others = pool.filter(w => w.id !== word.id).map(w => w[field]);
  // shuffle others, take 3 unique
  const picks = [];
  const shuffled = [...new Set(others)].sort(() => Math.random() - 0.5);
  for (const o of shuffled) { if (picks.length >= 3) break; if (o !== correct) picks.push(o); }
  while (picks.length < 3) picks.push(['—', '...', '???'][picks.length] || '—');
  const opts = [...picks, correct].sort(() => Math.random() - 0.5);
  return { opts, correct };
}

const TODAY_STATS = {
  streak: 12,
  learnedTotal: 47,
  inProgress: 8,
  dueToday: 14,
  dailyGoal: 20,
  doneToday: 11,
  week: [true, true, false, true, true, true, false], // last 7 days activity (today = last)
};

Object.assign(window, {
  DECKS, MY_DECK, MY_DECK_ID: 99, deckStats, DECK_META,
  EX_TYPES, buildChoices, TODAY_STATS, TILE_HUES,
});
