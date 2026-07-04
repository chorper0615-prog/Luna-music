import { NeteaseMusicApi, UA, jsonResponse, getCookie } from './_shared.mjs';

const METING_API = 'https://api.injahow.cn/meting';

async function getUrlWithNeteaseApi(id, cookie) {
  if (!NeteaseMusicApi?.song_url_v1 || !cookie) return null;
  try {
    const result = await NeteaseMusicApi.song_url_v1({
      id,
      level: 'exhigh',
      cookie,
    });
    if (result?.body?.data?.[0]?.url) {
      return result.body.data[0].url;
    }
  } catch (e) {
    console.warn('Netease API song_url_v1 failed:', e.message);
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

  if (cookie && NeteaseMusicApi) {
    const url = await getUrlWithNeteaseApi(id, cookie);
    if (url) {
      return jsonResponse(200, { status: true, data: url });
    }
  }

  const metingUrl = await getUrlWithMeting(id, vendor);
  if (metingUrl) {
    return jsonResponse(200, { status: true, data: metingUrl });
  }

  const fallbackUrl = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
  return jsonResponse(200, { status: true, data: fallbackUrl });
}
