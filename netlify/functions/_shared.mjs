export const COLORS = ['#ff6b6b','#ff8f5a','#ffb347','#ffd166','#7bdff2','#6c8cff','#9d7bff','#ff7eb6','#5eead4','#34d399'];
export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

export function getCookie(event) {
  const cookieParam = event.queryStringParameters?.cookie;
  if (cookieParam) {
    try {
      return decodeURIComponent(cookieParam);
    } catch (e) {
      return cookieParam;
    }
  }
  return '';
}

export function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range, Content-Type, cookie',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    },
    body: JSON.stringify(data),
  };
}

export function buildHeaders(extra = {}) {
  const headers = {
    'User-Agent': UA,
    'Referer': 'https://music.163.com/',
    'Accept': 'application/json',
  };
  return { ...headers, ...extra };
}

export function buildCookieHeaders(cookie, extra = {}) {
  const headers = buildHeaders(extra);
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  return headers;
}
