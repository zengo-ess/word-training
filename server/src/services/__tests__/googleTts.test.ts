/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { buildTtsUrl, buildTtsBody, parseTtsAudio, synthesizeMp3 } from "../googleTts.js";

function mockFetch(payload: { ok: boolean; body?: unknown }): typeof fetch {
  return (async () => ({
    ok: payload.ok,
    json: async () => payload.body,
  })) as unknown as typeof fetch;
}

describe("buildTtsUrl", () => {
  it("содержит endpoint синтеза и ключ", () => {
    const url = buildTtsUrl("KEY123");
    expect(url).toContain("https://texttospeech.googleapis.com/v1/text:synthesize");
    expect(url).toContain("key=KEY123");
  });
});

describe("buildTtsBody", () => {
  it("задаёт текст, переданный код языка и MP3", () => {
    const body = buildTtsBody("cat", "en-US");
    expect(body.input.text).toBe("cat");
    expect(body.voice.languageCode).toBe("en-US");
    expect(body.audioConfig.audioEncoding).toBe("MP3");
  });

  it("поддерживает немецкий код языка", () => {
    const body = buildTtsBody("Katze", "de-DE");
    expect(body.voice.languageCode).toBe("de-DE");
  });
});

describe("parseTtsAudio", () => {
  it("декодирует base64 audioContent в Buffer", () => {
    const b64 = Buffer.from("hi").toString("base64");
    expect(parseTtsAudio({ audioContent: b64 })?.toString()).toBe("hi");
  });

  it("возвращает null при отсутствии audioContent", () => {
    expect(parseTtsAudio({})).toBeNull();
    expect(parseTtsAudio(null)).toBeNull();
  });
});

describe("synthesizeMp3", () => {
  it("возвращает Buffer при успешном ответе", async () => {
    const b64 = Buffer.from("mp3bytes").toString("base64");
    const fetchFn = mockFetch({ ok: true, body: { audioContent: b64 } });
    const result = await synthesizeMp3("cat", "en-US", "KEY", fetchFn);
    expect(result?.toString()).toBe("mp3bytes");
  });

  it("возвращает null без ключа (fetch не вызывается)", async () => {
    let called = false;
    const fetchFn = (async () => {
      called = true;
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof fetch;
    expect(await synthesizeMp3("cat", "en-US", "", fetchFn)).toBeNull();
    expect(called).toBe(false);
  });

  it("возвращает null при не-ok ответе", async () => {
    const fetchFn = mockFetch({ ok: false });
    expect(await synthesizeMp3("cat", "en-US", "KEY", fetchFn)).toBeNull();
  });
});
