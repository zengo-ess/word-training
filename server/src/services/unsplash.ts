export function buildUnsplashSearchUrl(query: string, perPage = 12): string {
  const params = new URLSearchParams({ query, per_page: String(perPage) });
  return `https://api.unsplash.com/search/photos?${params.toString()}`;
}

interface UnsplashResponse {
  results?: Array<{ urls?: { regular?: string } }>;
}

export function parseUnsplashResults(json: unknown): string[] {
  const data = (json ?? {}) as UnsplashResponse;
  return (data.results ?? [])
    .map((item) => item.urls?.regular)
    .filter((url): url is string => typeof url === "string");
}

export async function searchImages(
  query: string,
  accessKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<string[]> {
  if (!accessKey) {
    return [];
  }
  const response = await fetchFn(buildUnsplashSearchUrl(query), {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });
  if (!response.ok) {
    return [];
  }
  const json: unknown = await response.json();
  return parseUnsplashResults(json);
}
