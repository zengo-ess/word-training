/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { hueFromString, chooseVoice, playWord, stopWordPlayback } from "../wordVisual";

describe("hueFromString", () => {
  it("детерминирована и в диапазоне 0..359", () => {
    const h = hueFromString("apple");
    expect(h).toBe(hueFromString("apple"));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(360);
  });

  it("разные строки дают разный оттенок", () => {
    expect(hueFromString("apple")).not.toBe(hueFromString("banana"));
  });
});

const voice = (name: string, lang: string): SpeechSynthesisVoice => ({ name, lang, voiceURI: name, default: false, localService: true });
describe("выбор голоса", () => {
  it("предпочитает обычный английский голос шуточному и русскому по умолчанию", () => {
    const samantha = voice("Samantha", "en-US");
    expect(chooseVoice([voice("Fred", "en-US"), voice("Milena", "ru-RU"), samantha], "en")).toBe(samantha);
  });
  it("выбирает качественный голос подходящего языка", () => {
    const anna = voice("Google Deutsch", "de-DE");
    expect(chooseVoice([voice("Google US English", "en-US"), voice("Basic German", "de-DE"), anna], "de")).toBe(anna);
    expect(chooseVoice([voice("Milena", "ru-RU")], "en")).toBeUndefined();
  });
});

const media = {
  src: "", muted: true, volume: 0, preload: "", onended: null as null | (() => void), onerror: null as null | (() => void),
  setAttribute: vi.fn(), pause: vi.fn(), play: vi.fn(),
};
const synth = { cancel: vi.fn(), resume: vi.fn(), speak: vi.fn(), getVoices: vi.fn(), paused: false };

describe("общий проигрыватель", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    media.play.mockReset().mockResolvedValue(undefined);
    media.pause.mockClear();
    synth.speak.mockReset(); synth.cancel.mockClear(); synth.resume.mockClear();
    synth.paused = false;
    synth.getVoices.mockReturnValue([voice("Samantha", "en-US")]);
    vi.stubGlobal("Audio", vi.fn(function () { return media; }));
    vi.stubGlobal("speechSynthesis", synth);
    vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
  });
  afterEach(() => { stopWordPlayback(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("запускает запись синхронно по нажатию, без обращения к синтезатору", async () => {
    const result = playWord({ foreign_word: "cat", audio_url: "/uploads/audio/cat.m4a" });
    expect(media.play).toHaveBeenCalledOnce();
    expect(media.src).toBe("/uploads/audio/cat.m4a");
    expect(media.muted).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
    media.onended?.();
    await result;
  });

  it("передаёт ошибку запрета звука вместо молчаливого подавления", async () => {
    media.play.mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"));
    await expect(playWord({ foreign_word: "cat", audio_url: "/cat.m4a" })).rejects.toThrow("Браузер заблокировал звук");
  });

  it("следующее нажатие останавливает предыдущую запись", async () => {
    const first = playWord({ foreign_word: "cat", audio_url: "/cat.m4a" });
    const cancelled = expect(first).rejects.toMatchObject({ name: "AbortError" });
    const second = playWord({ foreign_word: "dog", audio_url: "/dog.m4a" });
    expect(media.pause).toHaveBeenCalled();
    expect(media.src).toBe("/dog.m4a");
    media.onended?.();
    await Promise.all([cancelled, second]);
  });

  it("для слова без файла задаёт подходящий голос и обычную скорость", async () => {
    const result = playWord({ foreign_word: "cat", audio_url: null });
    const utterance = synth.speak.mock.calls[0][0];
    expect(utterance.voice.name).toBe("Samantha");
    expect(utterance.rate).toBe(1);
    utterance.onend();
    await result;
  });

  it("объясняет тишину, если системный голос не запустился", async () => {
    const result = playWord({ foreign_word: "cat", audio_url: null });
    const failure = expect(result).rejects.toThrow("Голос устройства не запустился");
    vi.advanceTimersByTime(4000);
    await failure;
  });
});
