const SHELL = "wt-shell-__SHELL_VERSION__";
const FILES = __SHELL_FILES__;
self.addEventListener("install", event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(FILES)));
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("wt-shell-") && key !== SHELL) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  // Authentication, APIs, uploads and external requests are never cached implicitly.
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) return;
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        const cache = await caches.open(SHELL);
        return (await cache.match("/index.html")) || Response.error();
      }
    })());
  } else if (FILES.includes(url.pathname)) {
    event.respondWith(caches.open(SHELL).then(async cache => (await cache.match(url.pathname)) || fetch(request)));
  }
});
