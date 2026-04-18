const AUTH_STORAGE_KEY = 'intmap_auth';

export interface StoredAuthSession {
  token: string;
  login: string;
  role: 'admin' | 'user' | 'guest';
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const override = window.localStorage.getItem('intmap_api_base_url');
    if (override?.trim()) {
      return override.trim().replace(/\/+$/, '');
    }

    const { protocol, hostname, port } = window.location;
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '8080') {
      return `${protocol}//${hostname}:8081/api/v1`;
    }
  }

  return '/api/v1';
}

export function getStoredAuthSession(): StoredAuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
}

export function setStoredAuthSession(session: StoredAuthSession): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  const session = getStoredAuthSession();

  if (session?.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }

  if (!headers.has('Pragma')) {
    headers.set('Pragma', 'no-cache');
  }

  return fetch(input, {
    ...init,
    cache: 'no-store',
    headers
  });
}
