import { apiRequest } from "../api/http";
import { getToken } from "./token";

export interface AuthUser {
  id: string;
  name: string;
  language: string;
  daily_goal: number;
  tts_enabled: number;
  review_direction: string;
}

export interface SettingsPatch {
  language?: string;
  dailyGoal?: number;
  ttsEnabled?: boolean;
  reviewDirection?: string;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

export async function fetchUsers(fetchFn: typeof fetch = fetch): Promise<AuthUser[]> {
  const data = await apiRequest<{ users: AuthUser[] }>("/api/auth/users", {}, fetchFn);
  return data.users;
}

export async function login(
  userId: string,
  password: string,
  fetchFn: typeof fetch = fetch,
): Promise<AuthResult> {
  return apiRequest<AuthResult>(
    "/api/auth/login",
    { method: "POST", body: { userId, password } },
    fetchFn,
  );
}

export async function register(
  name: string,
  password: string,
  familyCode: string,
  fetchFn: typeof fetch = fetch,
): Promise<AuthResult> {
  return apiRequest<AuthResult>(
    "/api/auth/register",
    { method: "POST", body: { name, password, familyCode } },
    fetchFn,
  );
}

export async function updateSettings(
  patch: SettingsPatch,
  fetchFn: typeof fetch = fetch,
): Promise<AuthUser> {
  const data = await apiRequest<{ user: AuthUser }>(
    "/api/auth/me/settings",
    { method: "PATCH", body: patch, token: getToken() },
    fetchFn,
  );
  return data.user;
}
