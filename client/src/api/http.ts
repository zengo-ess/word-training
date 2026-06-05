export interface ApiError extends Error {
  status: number;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

async function extractError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown };
    if (data && typeof data.error === "string") {
      return data.error;
    }
  } catch {
    // тело не JSON — используем дефолт ниже
  }
  return "Ошибка запроса";
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  fetchFn: typeof fetch = fetch,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetchFn(path, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = new Error(await extractError(response)) as ApiError;
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
