// Бесплатный словарь без ключа. Поддерживает не только английский, но и
// немецкий (и ряд других языков) — https://dictionaryapi.dev/.
const DICTIONARY_LANGUAGE_CODE: Record<string, string> = { en: "en", de: "de" };

export function isDictionarySupported(language: string): boolean {
  return language in DICTIONARY_LANGUAGE_CODE;
}

export function buildDictionaryUrl(word: string, language: string): string {
  const code = DICTIONARY_LANGUAGE_CODE[language] ?? "en";
  return `https://api.dictionaryapi.dev/api/v2/entries/${code}/${encodeURIComponent(word)}`;
}

interface DictionaryEntry {
  phonetic?: string;
  phonetics?: { text?: string }[];
}

function extractPhonetic(entries: unknown): string | null {
  if (!Array.isArray(entries)) return null;
  for (const raw of entries as DictionaryEntry[]) {
    if (typeof raw.phonetic === "string" && raw.phonetic.length > 0) {
      return raw.phonetic;
    }
    const withText = raw.phonetics?.find((p) => typeof p.text === "string" && p.text.length > 0);
    if (withText?.text) return withText.text;
  }
  return null;
}

export async function fetchTranscription(
  word: string,
  language: string,
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  if (!isDictionarySupported(language)) {
    return null;
  }
  // Немецкие существительные в колодах хранятся с артиклем ("die Zeit"),
  // а словарь ищет по голой форме слова.
  const lookupWord = language === "de" ? word.replace(/^(der|die|das)\s+/i, "") : word;
  try {
    const response = await fetchFn(buildDictionaryUrl(lookupWord, language));
    if (!response.ok) {
      return null;
    }
    const json: unknown = await response.json();
    return extractPhonetic(json);
  } catch {
    return null;
  }
}
