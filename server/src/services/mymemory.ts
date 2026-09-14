export function buildTranslateUrl(text: string, sourceLang: string): string {
  const params = new URLSearchParams({ q: text, langpair: `${sourceLang}|ru` });
  return `https://api.mymemory.translated.net/get?${params.toString()}`;
}

interface MyMemoryResponse {
  responseData?: { translatedText?: string };
}

export function parseTranslation(json: unknown): string {
  const data = (json ?? {}) as MyMemoryResponse;
  return data.responseData?.translatedText ?? "";
}

export async function translateToRussian(
  text: string,
  sourceLang: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchFn(buildTranslateUrl(text, sourceLang));
  if (!response.ok) {
    return "";
  }
  const json: unknown = await response.json();
  return parseTranslation(json);
}
