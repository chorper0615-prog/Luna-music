import { NeteaseMusicApi, UA, jsonResponse, getCookie } from './_shared.mjs';

const METING_API = 'https://api.injahow.cn/meting';

async function getLyricWithNeteaseApi(id, cookie) {
  if (!NeteaseMusicApi?.lyric) return null;
  try {
    const result = await NeteaseMusicApi.lyric({
      id,
      cookie: cookie || undefined,
    });
    if (result?.body?.lrc?.lyric) {
      return result.body.lrc.lyric;
    }
  } catch (e) {
    console.warn('Netease API lyric failed:', e.message);
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

async function getLyricWithWebApi(id) {
  try {
    const resp = await fetch(`https://music.163.com/api/song/lyric?os=pc&id=${id}&lv=-1&kv=-1&tv=-1`, {
      headers: { 
        'User-Agent': UA, 
        'Referer': 'https://music.163.com/',
        'Accept': 'application/json',
      },
    });
    const data = await resp.json();
    if (data?.lrc?.lyric) return data.lrc.lyric;
  } catch (e) {
    console.warn('Web lyric error:', e.message);
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

  if (cookie && NeteaseMusicApi) {
    const lyric = await getLyricWithNeteaseApi(id, cookie);
    if (lyric) {
      return jsonResponse(200, { status: true, data: lyric });
    }
  }

  const metingLyric = await getLyricWithMeting(id, vendor);
  if (metingLyric) {
    return jsonResponse(200, { status: true, data: metingLyric });
  }

  const webLyric = await getLyricWithWebApi(id);
  if (webLyric) {
    return jsonResponse(200, { status: true, data: webLyric });
  }

  return jsonResponse(200, { status: false });
}
