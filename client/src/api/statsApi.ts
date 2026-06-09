import { apiRequest } from "./http";
import { getToken } from "../auth/token";
import type { Stats } from "./types";

export async function fetchStats(fetchFn: typeof fetch = fetch): Promise<Stats> {
  return apiRequest<Stats>("/api/stats", { token: getToken() }, fetchFn);
}
