import { apiRequest } from "../api/http";
import { getToken } from "./token";

export interface AuthUser {
  id: string;
  name: string;
  language: string;
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

export async function setLanguage(
  language: string,
  fetchFn: typeof fetch = fetch,
): Promise<AuthUser> {
  const data = await apiRequest<{ user: AuthUser }>(
    "/api/auth/me/language",
    { method: "PATCH", body: { language }, token: getToken() },
    fetchFn,
  );
  return data.user;
}
