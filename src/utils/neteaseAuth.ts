const COOKIE_KEY = 'luna_netease_cookie';
const USER_KEY = 'luna_netease_user';

export function getNeteaseCookie(): string {
  try {
    return localStorage.getItem(COOKIE_KEY) || '';
  } catch {
    return '';
  }
}

export function setNeteaseCookie(cookie: string) {
  try {
    localStorage.setItem(COOKIE_KEY, cookie);
  } catch {}
}

export function clearNeteaseCookie() {
  try {
    localStorage.removeItem(COOKIE_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

export function getNeteaseUser(): { isLoggedIn: boolean; [key: string]: any } {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { isLoggedIn: false };
}

export function setNeteaseUser(user: any) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

export function buildUrl(base: string, params: Record<string, string>): string {
  const cookie = getNeteaseCookie();
  const searchParams = new URLSearchParams(params);
  if (cookie) {
    searchParams.append('cookie', encodeURIComponent(cookie));
  }
  return `${base}?${searchParams.toString()}`;
}

export function buildProxyAudioUrl(audioUrl: string): string {
  const cookie = getNeteaseCookie();
  const params = new URLSearchParams({ url: audioUrl });
  if (cookie) {
    params.append('cookie', encodeURIComponent(cookie));
  }
  return `/api/proxy-audio?${params.toString()}`;
}

export async function apiGet(path: string, params: Record<string, string> = {}, options: RequestInit = {}): Promise<any> {
  const url = buildUrl(path, params);
  const res = await fetch(url, options);
  if (!res.ok) throw new Error('Request failed: ' + res.status);
  return res.json();
}
