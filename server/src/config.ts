export interface AppConfig {
  appPassword: string;
  jwtSecret: string;
  unsplashAccessKey: string;
  googleTtsApiKey: string;
  uploadsDir: string;
  port: number;
}

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const appPassword = env.APP_PASSWORD;
  const jwtSecret = env.JWT_SECRET;

  if (!appPassword) {
    throw new Error("Отсутствует переменная окружения APP_PASSWORD");
  }
  if (!jwtSecret) {
    throw new Error("Отсутствует переменная окружения JWT_SECRET");
  }

  return {
    appPassword,
    jwtSecret,
    unsplashAccessKey: env.UNSPLASH_ACCESS_KEY ?? "",
    googleTtsApiKey: env.GOOGLE_TTS_API_KEY ?? "",
    uploadsDir: env.UPLOADS_DIR ?? "uploads",
    port: env.PORT ? Number(env.PORT) : 3001,
  };
}
