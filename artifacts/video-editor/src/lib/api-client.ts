/**
 * Lightweight typed fetch helper. All API endpoints live under /api on the
 * same origin so we can rely on cookie-based session auth without CORS.
 *
 * `apiFetch` always includes `credentials: "include"` so the session cookie
 * goes along, and surfaces non-2xx responses as `ApiError` with the parsed
 * JSON body so callers can render server-side validation messages.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: any,
  ) {
    super(message);
  }
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  raw?: boolean;
}

export async function apiFetch<T = any>(
  path: string,
  opts: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers ?? {}),
  };
  const init: RequestInit = {
    method: opts.method ?? "GET",
    credentials: "include",
    headers,
    signal: opts.signal,
  };
  if (opts.body !== undefined) {
    if (opts.body instanceof FormData) {
      init.body = opts.body;
    } else {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }
  }
  const url = path.startsWith("http") ? path : `/api${path}`;
  const res = await fetch(url, init);
  let data: any = null;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else if (opts.raw) {
    data = (await res.blob()) as any;
  } else {
    data = (await res.text()) as any;
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.error || data.message)) ||
      `Request failed with status ${res.status}`;
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}
