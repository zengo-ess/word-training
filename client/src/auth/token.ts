const TOKEN_KEY = "wt_token";
const USER_KEY = "wt_user";

export interface StoredUser {
  id: string;
  name: string;
  language: string;
  daily_goal: number;
  tts_enabled: number;
  review_direction: string;
}

// В localStorage у ранее залогиненных лежит объект без полей настроек —
// подставляем дефолты, а не полагаемся на их наличие
export function withSettingsDefaults(user: Partial<StoredUser> & { id: string; name: string }): StoredUser {
  return {
    id: user.id,
    name: user.name,
    language: user.language ?? "en",
    daily_goal: user.daily_goal ?? 20,
    tts_enabled: user.tts_enabled ?? 1,
    review_direction: user.review_direction ?? "both",
  };
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return withSettingsDefaults(JSON.parse(raw) as StoredUser);
  } catch {
    return null;
  }
}

export function saveStoredUser(user: StoredUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_KEY);
}
