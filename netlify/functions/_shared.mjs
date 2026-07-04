import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export const NeteaseMusicApi = require('NeteaseCloudMusicApi');

export const COLORS = ['#ff6b6b','#ff8f5a','#ffb347','#ffd166','#7bdff2','#6c8cff','#9d7bff','#ff7eb6','#5eead4','#34d399'];
export const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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

// 完整的浏览器 headers，绕过网易云对海外 IP 的反爬限制
export function buildHeaders(extra = {}) {
  const headers = {
    'User-Agent': UA,
    'Referer': 'https://music.163.com/',
    'Origin': 'https://music.163.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
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
