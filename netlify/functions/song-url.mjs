import { UA, jsonResponse, getCookie, buildCookieHeaders } from './_shared.mjs';

const METING_API = 'https://api.injahow.cn/meting';

async function getUrlWithNetease(id, cookie) {
  // 方式1：使用 enhance/player/url 接口（GET 请求，Cookie header）
  try {
    const url = `https://music.163.com/api/song/enhance/player/url?id=${id}&br=320000`;
    const resp = await fetch(url, {
      headers: buildCookieHeaders(cookie),
    });
    const data = await resp.json();
    if (data.code === 200 && data.data && data.data[0] && data.data[0].url) {
      return data.data[0].url;
    }
  } catch (e) {
    console.warn('Netease song url (enhance) error:', e.message);
  }

  // 方式2：使用 song/url/v1 接口（GET 请求，Cookie header）
  try {
    const url = `https://music.163.com/api/song/enhance/player/url/v1?id=${id}&level=exhigh`;
    const resp = await fetch(url, {
      headers: buildCookieHeaders(cookie),
    });
    const data = await resp.json();
    if (data.code === 200 && data.data && data.data[0] && data.data[0].url) {
      return data.data[0].url;
    }
  } catch (e) {
    console.warn('Netease song url (v1) error:', e.message);
  }

  return null;
}

async function getUrlWithMeting(id, vendor) {
  try {
    const apiUrl = `${METING_API}?type=url&id=${id}&server=${vendor}`;
    const resp = await fetch(apiUrl, {
      headers: { 'User-Agent': UA, 'Referer': 'https://music.163.com/' },
    });
    const data = await resp.json();
    if (data?.url) return data.url;
  } catch (e) {
    console.warn('Meting API error:', e.message);
  }
  return null;
}

export async function handler(event) {
  const id = event.queryStringParameters?.id || '';
  const vendor = event.queryStringParameters?.vendor || 'netease';
  const cookie = getCookie(event);

  if (!id) {
    return jsonResponse(200, { status: false, msg: '缺少歌曲ID' });
  }

  // 1. 尝试网易云官方 API（带 cookie，VIP 用户可获取完整歌曲）
  const neteaseUrl = await getUrlWithNetease(id, cookie);
  if (neteaseUrl) {
    return jsonResponse(200, { status: true, data: neteaseUrl });
  }

  // 2. 尝试 meting API
  const metingUrl = await getUrlWithMeting(id, vendor);
  if (metingUrl) {
    return jsonResponse(200, { status: true, data: metingUrl });
  }

  // 3. Fallback: 使用 outer/url 接口（公开，但部分歌曲可能无法播放）
  const fallbackUrl = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
  return jsonResponse(200, { status: true, data: fallbackUrl });
}
