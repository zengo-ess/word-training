// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const match = vi.fn(async (url: string) => new Response(url === "/index.html" ? "offline app" : "script"));
  const addAll = vi.fn().mockResolvedValue(undefined);
  const fetch = vi.fn().mockRejectedValue(new TypeError("offline"));
  const cacheDelete = vi.fn().mockResolvedValue(true);
  const claim = vi.fn().mockResolvedValue(undefined);
  const source = readFileSync(new URL("../../../offline-worker.js", import.meta.url), "utf8")
    .replace("__SHELL_VERSION__", "test")
    .replace("__SHELL_FILES__", JSON.stringify(["/index.html", "/assets/app.js"]));
  runInNewContext(source, {
    self: { location: { origin: "https://words.test" }, clients: { claim }, addEventListener: (name: string, handler: (event: any) => void) => { handlers[name] = handler; } },
    caches: { open: async () => ({ match, addAll }), keys: async () => ["wt-shell-old", "wt-shell-test", "wt-media-private"], delete: cacheDelete },
    fetch, URL, Response,
  });
  return { handlers, addAll, fetch, match, cacheDelete, claim };
}

describe("оболочка без сети", () => {
  it("устанавливает все файлы приложения и не удаляет скачанные медиа при обновлении", async () => {
    const app = worker();
    let task: Promise<void> = Promise.resolve();
    app.handlers.install({ waitUntil: (value: Promise<void>) => { task = value; } });
    await task;
    expect(app.addAll).toHaveBeenCalledWith(["/index.html", "/assets/app.js"]);
    app.handlers.activate({ waitUntil: (value: Promise<void>) => { task = value; } });
    await task;
    expect(app.cacheDelete).toHaveBeenCalledOnce();
    expect(app.cacheDelete).toHaveBeenCalledWith("wt-shell-old");
    expect(app.claim).toHaveBeenCalledOnce();
  });

  it("отдаёт HTML из кэша при повторном запуске без сервера", async () => {
    const app = worker();
    let response: Promise<Response> | undefined;
    app.handlers.fetch({ request: { url: "https://words.test/", method: "GET", mode: "navigate" }, respondWith: (value: Promise<Response>) => { response = value; } });
    expect(await (await response!).text()).toBe("offline app");
  });

  it("не подменяет кэшем API, авторизацию, POST и сторонние запросы", () => {
    const app = worker();
    const respondWith = vi.fn();
    for (const [url, method] of [["https://words.test/api/decks", "GET"], ["https://words.test/api/training/result", "POST"], ["https://words.test/uploads/cat.webp", "GET"], ["https://other.test/file", "GET"]]) {
      app.handlers.fetch({ request: { url, method }, respondWith });
    }
    expect(respondWith).not.toHaveBeenCalled();
  });
});
