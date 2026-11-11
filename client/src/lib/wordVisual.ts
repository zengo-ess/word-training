export function hueFromString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 360;
  }
  return hash;
}

const SPEECH_LANG: Record<string, string> = { en: "en-US", de: "de-DE" };

let player: HTMLAudioElement | undefined;
let utterance: SpeechSynthesisUtterance | undefined;
let cancelPlayback: (() => void) | undefined;

export function chooseVoice(voices: SpeechSynthesisVoice[], language: string): SpeechSynthesisVoice | undefined {
  const locale = SPEECH_LANG[language] ?? SPEECH_LANG.en;
  const score = (voice: SpeechSynthesisVoice) =>
    (/natural|neural|premium|enhanced/i.test(voice.name) ? 100 : 0) +
    (/google|microsoft.*online/i.test(voice.name) ? 80 : 0) +
    (/samantha|alex|daniel|karen|tessa|moira|serena/i.test(voice.name) ? 40 : 0) +
    (voice.lang.toLowerCase() === locale.toLowerCase() ? 10 : 0) -
    (/bad news|good news|fred|whisper|hysterical|boing|bubbles|bells|cellos|trinoids|zarvox/i.test(voice.name) ? 1000 : 0);
  return voices.filter(voice => voice.lang.toLowerCase().replace("_", "-").split("-")[0] === locale.split("-")[0])
    .sort((a, b) => score(b) - score(a))[0];
}

export function primeSpeechVoices(): void {
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.getVoices();
  } catch { /* A restricted speech engine must not prevent the app from opening. */ }
}

export function stopWordPlayback(): void {
  cancelPlayback?.();
  cancelPlayback = undefined;
  if (player) { player.onended = null; player.onerror = null; player.pause(); }
  if (utterance) {
    utterance.onend = null; utterance.onerror = null;
    window.speechSynthesis.cancel();
    utterance = undefined;
  }
}

// Keep play()/speak() in the original tap handler: mobile browsers require activation.
export function playWord(word: { foreign_word: string; audio_url: string | null }, language = "en"): Promise<void> {
  stopWordPlayback();
  return new Promise((resolve, reject) => {
    let finished = false;
    let speechStartTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => finish(new Error("Не удалось запустить озвучку. Проверьте громкость мультимедиа и нажмите ещё раз.")), 20000);
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearTimeout(speechStartTimer);
      cancelPlayback = undefined;
      if (error) reject(error); else resolve();
    };
    cancelPlayback = () => finish(new DOMException("Playback cancelled", "AbortError"));
    if (word.audio_url) {
      try {
        player ??= new Audio();
        player.setAttribute("playsinline", "");
        player.preload = "auto";
        player.volume = 1;
        player.muted = false;
        player.onended = () => finish();
        player.onerror = () => finish(new Error("Не удалось загрузить запись. Проверьте соединение и попробуйте ещё раз."));
        player.src = word.audio_url;
        void Promise.resolve(player.play()).catch(error => finish(new Error(error?.name === "NotAllowedError"
          ? "Браузер заблокировал звук. Проверьте громкость мультимедиа и нажмите на динамик ещё раз."
          : "Не удалось проиграть запись. Проверьте соединение и звук на устройстве.")));
      } catch { finish(new Error("В этом браузере не удалось запустить аудио.")); }
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      finish(new Error("На устройстве нет голоса для озвучки этого слова."));
      return;
    }
    const synth = window.speechSynthesis;
    try {
      const current = new SpeechSynthesisUtterance(word.foreign_word);
      utterance = current;
      const voice = chooseVoice(synth.getVoices(), language);
      if (voice) current.voice = voice;
      current.lang = voice?.lang ?? SPEECH_LANG[language] ?? SPEECH_LANG.en;
      current.rate = 1;
      current.pitch = 1;
      current.volume = 1;
      speechStartTimer = setTimeout(() => finish(new Error("Голос устройства не запустился. Проверьте звук и нажмите ещё раз.")), 4000);
      current.onstart = () => clearTimeout(speechStartTimer);
      current.onend = () => { if (utterance === current) utterance = undefined; finish(); };
      current.onerror = event => finish(new Error(event.error === "language-unavailable" || event.error === "voice-unavailable"
        ? "На устройстве нет нужного голоса. Установите голос изучаемого языка в настройках устройства."
        : "Голос устройства не запустился. Проверьте звук и нажмите ещё раз."));
      if (synth.paused) synth.resume();
      synth.speak(current);
    } catch { finish(new Error("Не удалось запустить голос устройства.")); }
  });
}
