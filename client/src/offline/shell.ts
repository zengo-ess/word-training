export async function ensureOfflineShell(): Promise<void> {
  if (!window.isSecureContext) throw new Error("Для скачивания нужен HTTPS. На этом компьютере можно открыть localhost.");
  if (!("serviceWorker" in navigator) || !("caches" in window) || !("indexedDB" in window)) {
    throw new Error("Этот браузер не поддерживает оффлайн-хранение.");
  }
  if (import.meta.env.DEV) throw new Error("Оффлайн-загрузка доступна в собранной версии приложения.");
  await navigator.serviceWorker.register("/sw.js");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Не удалось подготовить приложение для оффлайна. Попробуйте ещё раз.")), 25000); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
