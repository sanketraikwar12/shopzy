import type { ApiEnvelope } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field-level messages keyed by path, for inline form errors. */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries((this.details ?? []).map((d) => [d.path, d.message]));
  }
}

/**
 * Access token lives in memory only — never in localStorage (OWASP A07).
 * On page refresh the session is restored via the httpOnly refresh cookie.
 */
let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

/** Stable per-tab id so anonymous analytics events can be grouped into sessions. */
function sessionId(): string {
  let id = sessionStorage.getItem('shopzy.sessionId');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('shopzy.sessionId', id);
  }
  return id;
}

/** Reads the `_csrf` double-submit cookie set by the server. */
function getCsrfToken(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)_csrf=([^;]*)/);
  return match?.[1];
}

let refreshPromise: Promise<boolean> | null = null;

/** Refreshes the access token, coalescing concurrent 401s into one call. */
async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const csrf = getCsrfToken();
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        },
        body: '{}',
      });
      if (!res.ok) return false;

      const body = (await res.json()) as ApiEnvelope<{ tokens: { accessToken: string } }>;
      setAccessToken(body.data.tokens.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      // Release the lock on the next tick so callers can read the new token.
      setTimeout(() => {
        refreshPromise = null;
      }, 0);
    }
  })();

  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Set false to skip the automatic refresh-and-retry on 401. */
  retryOnUnauthorized?: boolean;
  query?: Record<string, unknown>;
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const url = `${API_BASE}${path}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }

  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const { body, retryOnUnauthorized = true, query, headers, ...rest } = options;

  const isFormData = body instanceof FormData;

  const res = await fetch(buildUrl(path, query), {
    ...rest,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      'X-Session-Id': sessionId(),
      ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken()! } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  if (res.status === 401 && retryOnUnauthorized) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, { ...options, retryOnUnauthorized: false });

    setAccessToken(null);
    onUnauthorized?.();
  }

  if (res.status === 204) return { success: true, data: undefined as T };

  let payload: ApiEnvelope<T>;
  try {
    payload = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(res.status, 'NETWORK_ERROR', 'Could not reach the server. Please check your connection.');
  }

  if (!res.ok || payload.success === false) {
    throw new ApiError(
      res.status,
      payload.error?.code ?? 'ERROR',
      payload.error?.message ?? 'Something went wrong',
      payload.error?.details,
    );
  }

  return payload;
}

export const api = {
  get: <T>(path: string, query?: Record<string, unknown>) => request<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string, query?: Record<string, unknown>) => request<T>(path, { method: 'DELETE', query }),
  /** DELETE with a JSON body — for endpoints that require confirmation (e.g. password). */
  delWithBody: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
};

/** Fire-and-forget analytics beacon; never blocks or throws into the UI. */
export function track(shopId: string, eventType: string, extra: Record<string, unknown> = {}) {
  void request(`/shops/${shopId}/track`, {
    method: 'POST',
    body: { eventType, sessionId: sessionId(), ...extra },
    retryOnUnauthorized: false,
  }).catch(() => undefined);
}
