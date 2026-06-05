import { apiRequest } from "../api/http";

export async function login(
  password: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const data = await apiRequest<{ token: string }>(
    "/api/auth/login",
    { method: "POST", body: { password } },
    fetchFn,
  );
  return data.token;
}
