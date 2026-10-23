/** Tiny fetch wrapper: base URL, JWT header, JSON, and readable errors. */

export const API_BASE: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8080';

const TOKEN_KEY = 'cabflow.token';

export const tokenStore = {
  get: (): string | null => {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (token: string) => {
    try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* storage unavailable */ }
  },
  clear: () => {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;
  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

let unauthorizedHandler: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { unauthorizedHandler = fn; };

function authHeaders(): Record<string, string> {
  const token = tokenStore.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseError(res: Response): Promise<ApiError> {
  let message = res.statusText || `Request failed (${res.status})`;
  let fieldErrors: Record<string, string> | undefined;
  try {
    const data = await res.json();
    if (data?.message) message = data.message;
    if (data?.fieldErrors) {
      fieldErrors = data.fieldErrors;
      const first = Object.entries(data.fieldErrors)[0];
      if (first) message = `${first[0]}: ${first[1]}`;
    }
  } catch { /* body was not JSON */ }
  return new ApiError(res.status, message, fieldErrors);
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const hadToken = !!tokenStore.get();
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers: {
        ...authHeaders(),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, `Cannot reach the server at ${API_BASE}. Is the backend running?`);
  }

  if (!res.ok) {
    if (res.status === 401 && hadToken) {
      tokenStore.clear();
      unauthorizedHandler?.();
    }
    throw await parseError(res);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
};

export async function downloadBlob(path: string): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(API_BASE + path, { headers: authHeaders() });
  } catch {
    throw new ApiError(0, `Cannot reach the server at ${API_BASE}.`);
  }
  if (!res.ok) throw await parseError(res);
  return res.blob();
}
