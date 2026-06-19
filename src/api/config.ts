import {
  acquireApiAccessToken,
  acquireGraphAccessToken,
  getActiveAccount,
  getAccountEmail,
  getAccountName,
  getAccountOid,
  isApiAccessTokenConfigured,
} from '../auth/entra';

/** Base URL for the Nest API (no trailing slash). Uses same-origin /api when proxied by Vite. */
export function getApiBaseUrl(): string {
  const env = import.meta.env.VITE_API_URL as string | undefined;
  if (env && env.length > 0) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') return '';
  return '';
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}/api${path.startsWith('/') ? path : `/${path}`}`;
  const headers = await buildApiHeaders(
    { 'Content-Type': 'application/json' },
    init?.headers,
  );
  const requestInit: RequestInit = {
    ...init,
    /** Avoid stale 304 cached JSON for GETs after PATCH (venue profile, lists, etc.). */
    cache: init?.cache ?? 'no-store',
    headers,
  };
  const method = (requestInit.method ?? 'GET').toUpperCase();
  let res = await fetch(url, requestInit);
  /**
   * Global guard: if a server-side sorted list query fails with a 5xx,
   * retry once without sortBy/sortDir so screens do not hard-fail.
   */
  if (!res.ok && method === 'GET' && res.status >= 500) {
    const fallbackUrl = stripSortParams(url);
    if (fallbackUrl && fallbackUrl !== url) {
      res = await fetch(fallbackUrl, requestInit);
    }
  }
  return handleApiResponse<T>(res);
}

/** Multipart (e.g. tour create/update with optional image). Do not set Content-Type — browser sets boundary. */
export async function apiFetchMultipart<T>(
  path: string,
  init: Omit<RequestInit, 'headers'> & { body: FormData; headers?: HeadersInit },
): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}/api${path.startsWith('/') ? path : `/${path}`}`;
  const { body, headers, ...rest } = init;
  const requestHeaders = await buildApiHeaders(undefined, headers);
  const res = await fetch(url, {
    ...rest,
    body,
    cache: rest.cache ?? 'no-store',
    headers: requestHeaders,
  });
  return handleApiResponse<T>(res);
}

/** Binary download with auth headers (the backend gates some routes by the Bearer token). */
export async function apiFetchBlob(
  path: string,
): Promise<{ blob: Blob; filename: string }> {
  const base = getApiBaseUrl();
  const url = `${base}/api${path.startsWith('/') ? path : `/${path}`}`;
  const headers = await buildApiHeaders(undefined, undefined);
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const j = (await res.json()) as { message?: string };
      if (typeof j.message === 'string') message = j.message;
    } catch {
      /* ignore non-JSON error bodies */
    }
    const err = new Error(message || `Download failed (${res.status})`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') ?? '';
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition);
  let filename = '';
  if (match?.[1]) {
    const raw = match[1].replace(/"/g, '').trim();
    try {
      filename = decodeURIComponent(raw);
    } catch {
      filename = raw;
    }
  }
  return { blob, filename };
}

async function buildApiHeaders(
  defaults?: HeadersInit,
  incoming?: HeadersInit,
): Promise<Headers> {
  const headers = new Headers(defaults);
  if (incoming) {
    new Headers(incoming).forEach((value, key) => headers.set(key, value));
  }

  const account = getActiveAccount();
  if (account) {
    const oid = getAccountOid(account);
    const name = getAccountName(account).trim();
    const email = getAccountEmail(account).trim().toLowerCase();
    if (oid && !headers.has('X-User-Oid')) {
      headers.set('X-User-Oid', oid);
    }
    if (name && !headers.has('X-User-Name')) {
      headers.set('X-User-Name', name);
    }
    if (email && email.includes('@') && !headers.has('X-User-Email')) {
      headers.set('X-User-Email', email);
    }

    if (!headers.has('Authorization') && isApiAccessTokenConfigured()) {
      try {
        headers.set('Authorization', `Bearer ${await acquireApiAccessToken(account)}`);
      } catch {
        headers.delete('Authorization');
      }
    }

    if (!headers.has('x-entra-graph-access-token')) {
      try {
        const graphToken = await acquireGraphAccessToken(account);
        if (graphToken) {
          headers.set('x-entra-graph-access-token', graphToken);
        }
      } catch (err) {
        // ignore silently
      }
    }
  }

  return headers;
}

async function handleApiResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let userMessage = res.statusText;
    let devDetail: string | undefined;
    let userSuggestion: string | undefined;
    try {
      const j = (await res.json()) as {
        message?: string | string[];
        detail?: string;
        suggestion?: string;
      };
      devDetail = typeof j.detail === 'string' ? j.detail : undefined;
      userSuggestion = typeof j.suggestion === 'string' ? j.suggestion : undefined;
      if (typeof j.message === 'string') userMessage = j.message;
      else if (Array.isArray(j.message)) userMessage = j.message.join(', ');
    } catch {
      /* ignore */
    }
    const err = new Error(
      userMessage || `Request failed (${res.status})`,
    ) as Error & { detail?: string; status?: number; suggestion?: string };
    err.status = res.status;
    if (devDetail) err.detail = devDetail;
    if (userSuggestion) err.suggestion = userSuggestion;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  const bodyText = await res.text();
  if (!bodyText.trim()) return undefined as T;
  try {
    return JSON.parse(bodyText) as T;
  } catch {
    throw new Error('Received an invalid response from the server.');
  }
}

function stripSortParams(url: string): string | null {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const hadSortBy = parsed.searchParams.has('sortBy');
    const hadSortDir = parsed.searchParams.has('sortDir');
    if (!hadSortBy && !hadSortDir) return null;
    parsed.searchParams.delete('sortBy');
    parsed.searchParams.delete('sortDir');
    if (typeof window !== 'undefined') {
      return `${parsed.pathname}${parsed.search}`;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}
