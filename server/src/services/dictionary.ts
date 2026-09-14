// Бесплатный словарь без ключа — но только для английского.
export function buildDictionaryUrl(word: string): string {
  return `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
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

export async function fetchEnglishTranscription(
  word: string,
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetchFn(buildDictionaryUrl(word));
    if (!response.ok) {
      return null;
    }
    const json: unknown = await response.json();
    return extractPhonetic(json);
  } catch {
    return null;
  }
}
