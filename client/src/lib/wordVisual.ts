export function hueFromString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 360;
  }
  return hash;
}

const SPEECH_LANG: Record<string, string> = { en: "en-US", de: "de-DE" };

export function playWord(word: { foreign_word: string; audio_url: string | null }, language = "en"): void {
  if (word.audio_url) {
    void new Audio(word.audio_url).play().catch(() => undefined);
    return;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(word.foreign_word);
    utt.lang = SPEECH_LANG[language] ?? "en-US";
    utt.rate = 0.9;
    window.speechSynthesis.speak(utt);
  }
}
