export function buildTtsUrl(apiKey: string): string {
  return `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`;
}

export interface TtsBody {
  input: { text: string };
  voice: { languageCode: string; ssmlGender: string };
  audioConfig: { audioEncoding: string };
}

export function buildTtsBody(text: string): TtsBody {
  return {
    input: { text },
    voice: { languageCode: "en-US", ssmlGender: "NEUTRAL" },
    audioConfig: { audioEncoding: "MP3" },
  };
}

interface TtsResponse {
  audioContent?: string;
}

export function parseTtsAudio(json: unknown): Buffer | null {
  const data = (json ?? {}) as TtsResponse;
  if (typeof data.audioContent !== "string" || data.audioContent.length === 0) {
    return null;
  }
  return Buffer.from(data.audioContent, "base64");
}

export async function synthesizeMp3(
  text: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<Buffer | null> {
  if (!apiKey) {
    return null;
  }
  const response = await fetchFn(buildTtsUrl(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildTtsBody(text)),
  });
  if (!response.ok) {
    return null;
  }
  const json: unknown = await response.json();
  return parseTtsAudio(json);
}
