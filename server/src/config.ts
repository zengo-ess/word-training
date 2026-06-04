export interface AppConfig {
  appPassword: string;
  jwtSecret: string;
  unsplashAccessKey: string;
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
    port: env.PORT ? Number(env.PORT) : 3001,
  };
}
