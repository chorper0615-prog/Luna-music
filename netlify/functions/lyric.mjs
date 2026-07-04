import { UA, jsonResponse, getCookie, buildCookieHeaders } from './_shared.mjs';

const METING_API = 'https://api.injahow.cn/meting';

async function getLyricWithNetease(id, cookie) {
  try {
    const resp = await fetch(`https://music.163.com/api/song/lyric?os=pc&id=${id}&lv=-1&kv=-1&tv=-1`, {
      headers: buildCookieHeaders(cookie),
    });
    const data = await resp.json();
    if (data?.lrc?.lyric) return data.lrc.lyric;
  } catch (e) {
    console.warn('Netease lyric error:', e.message);
  }
  return null;
}

async function getLyricWithMeting(id, vendor) {
  try {
    const apiUrl = `${METING_API}?type=lrc&id=${id}&server=${vendor}`;
    const resp = await fetch(apiUrl, {
      headers: { 'User-Agent': UA, 'Referer': 'https://music.163.com/' },
    });
    const data = await resp.json();
    if (data?.lrc) return data.lrc;
  } catch (e) {
    console.warn('Meting lyric error:', e.message);
  }
  return null;
}

export async function handler(event) {
  const id = event.queryStringParameters?.id || '';
  const vendor = event.queryStringParameters?.vendor || 'netease';
  const cookie = getCookie(event);

  if (!id) {
    return jsonResponse(200, { status: false });
  }

  const neteaseLyric = await getLyricWithNetease(id, cookie);
  if (neteaseLyric) {
    return jsonResponse(200, { status: true, data: neteaseLyric });
  }

  const metingLyric = await getLyricWithMeting(id, vendor);
  if (metingLyric) {
    return jsonResponse(200, { status: true, data: metingLyric });
  }

  return jsonResponse(200, { status: false });
}
