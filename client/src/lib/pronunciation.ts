// Приблизительная транслитерация иностранного слова русскими буквами —
// не точная транскрипция, а ориентир для произношения на слух.

const VOWELS = new Set(["a", "e", "i", "o", "u", "ä", "ö", "ü", "y"]);

function matchAt(word: string, i: number, patterns: [string, string][]): [string, string] | null {
  for (const [pat, repl] of patterns) {
    if (word.startsWith(pat, i)) return [pat, repl];
  }
  return null;
}

const GERMAN_MULTI: [string, string][] = [
  ["tsch", "ч"],
  ["sch", "ш"],
  ["chs", "кс"],
  ["ck", "к"],
  ["ph", "ф"],
  ["qu", "кв"],
  ["ng", "нг"],
  ["nk", "нк"],
  ["ie", "и"],
  ["ei", "ай"],
  ["ai", "ай"],
  ["eu", "ой"],
  ["äu", "ой"],
  ["au", "ау"],
  ["th", "т"],
  ["ch", "х"],
];

const GERMAN_SINGLE: Record<string, string> = {
  a: "а", ä: "э", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г",
  i: "и", j: "й", k: "к", l: "л", m: "м", n: "н", o: "о", ö: "ё",
  p: "п", q: "к", r: "р", s: "с", t: "т", u: "у", ü: "ю", v: "ф",
  w: "в", x: "кс", y: "и", z: "ц", ß: "с",
};

function germanPronunciationRu(input: string): string {
  const word = input.toLowerCase();
  let out = "";
  let i = 0;
  if (word.startsWith("sp")) {
    out += "шп";
    i = 2;
  } else if (word.startsWith("st")) {
    out += "шт";
    i = 2;
  }
  while (i < word.length) {
    const ch = word[i];
    if (ch === "h" && out.length > 0 && VOWELS.has(word[i - 1] ?? "")) {
      i += 1;
      continue;
    }
    if (ch === "s" && VOWELS.has(word[i + 1] ?? "")) {
      out += "з";
      i += 1;
      continue;
    }
    const multi = matchAt(word, i, GERMAN_MULTI);
    if (multi) {
      out += multi[1];
      i += multi[0].length;
      continue;
    }
    out += GERMAN_SINGLE[ch] ?? ch;
    i += 1;
  }
  return out;
}

const ENGLISH_MULTI: [string, string][] = [
  ["tch", "ч"],
  ["igh", "ай"],
  ["sh", "ш"],
  ["ch", "ч"],
  ["ph", "ф"],
  ["th", "з"],
  ["wh", "в"],
  ["ck", "к"],
  ["ng", "нг"],
  ["qu", "кв"],
  ["oo", "у"],
  ["ee", "и"],
  ["ea", "и"],
  ["ou", "ау"],
  ["ow", "оу"],
  ["ai", "эй"],
  ["ay", "эй"],
  ["ey", "эй"],
  ["oy", "ой"],
  ["oi", "ой"],
];

const ENGLISH_SINGLE: Record<string, string> = {
  a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "х",
  i: "и", j: "дж", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п",
  q: "к", r: "р", s: "с", t: "т", u: "а", v: "в", w: "в", x: "кс",
  y: "й", z: "з",
};

function englishPronunciationRu(input: string): string {
  const word = input.toLowerCase();
  let out = "";
  let i = 0;
  while (i < word.length) {
    const ch = word[i];
    if (ch === "e" && i === word.length - 1 && word.length > 2 && !VOWELS.has(word[i - 1] ?? "")) {
      i += 1;
      continue;
    }
    if ((ch === "c" || ch === "g") && (word[i + 1] === "e" || word[i + 1] === "i" || word[i + 1] === "y")) {
      out += ch === "c" ? "с" : "дж";
      i += 1;
      continue;
    }
    const multi = matchAt(word, i, ENGLISH_MULTI);
    if (multi) {
      out += multi[1];
      i += multi[0].length;
      continue;
    }
    out += ENGLISH_SINGLE[ch] ?? ch;
    i += 1;
  }
  return out;
}

// Работает по написанию слова, поэтому годится и для встроенных, и для
// добавленных вручную слов — в отличие от точной транскрипции не требует
// внешнего словаря.
export function pronunciationRu(word: string, language: string): string {
  const clean = word.replace(/^(der|die|das)\s+/i, "").trim();
  if (!clean) return "";
  return language === "de" ? germanPronunciationRu(clean) : englishPronunciationRu(clean);
}
