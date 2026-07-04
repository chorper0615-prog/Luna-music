import { COLORS, UA, jsonResponse, getCookie, buildCookieHeaders } from './_shared.mjs';

async function searchWithWebApi(keyword, page, limit, cookie) {
  try {
    // 使用网易云搜索 API
    const url = `https://music.163.com/api/search/get/web?csrf_token=&s=${encodeURIComponent(keyword)}&type=1&limit=${limit}&offset=${page * limit}`;
    const resp = await fetch(url, {
      headers: buildCookieHeaders(cookie),
    });
    const data = await resp.json();
    if (data.code !== 200 || !data.result || !data.result.songs) {
      return { total: 0, songs: [] };
    }
    const songs = data.result.songs.map((item, i) => ({
      songId: item.id,
      name: item.name || '',
      artist: (item.artists || []).map((a) => a.name).filter(Boolean).join(' / ') || '未知',
      album: (item.album && item.album.name) || '',
      cover: (item.album && item.album.picUrl) || '',
      duration: Math.floor((item.duration || 0) / 1000),
      vendor: 'netease',
      color: COLORS[i % COLORS.length],
    }));

    // 补全封面
    const songsWithoutCover = songs.filter((s) => !s.cover);
    if (songsWithoutCover.length > 0) {
      try {
        const ids = songsWithoutCover.map((s) => s.songId);
        const detResp = await fetch(`https://music.163.com/api/song/detail?ids=[${ids.join(',')}]`, {
          headers: buildCookieHeaders(cookie),
        });
        const detData = await detResp.json();
        if (detData.songs) {
          const coverMap = {};
          detData.songs.forEach((s) => { if (s.album && s.album.picUrl) coverMap[s.id] = s.album.picUrl; });
          songs.forEach((s) => { if (coverMap[s.songId]) s.cover = coverMap[s.songId]; });
        }
      } catch (e) {
        console.warn('Cover fetch error:', e.message);
      }
    }

    // 对没有封面的歌曲使用随机封面
    songs.forEach((s) => { if (!s.cover) s.cover = `https://picsum.photos/seed/${encodeURIComponent(s.name)}/300/300`; });

    return { total: data.result.songCount || songs.length, songs };
  } catch (e) {
    console.error('Web search error:', e.message);
    return { total: 0, songs: [] };
  }
}

export async function handler(event) {
  const keyword = event.queryStringParameters?.keyword || '';
  const page = parseInt(event.queryStringParameters?.page || '0');
  const limit = parseInt(event.queryStringParameters?.limit || '20');
  const cookie = getCookie(event);

  if (!keyword) {
    return jsonResponse(200, { total: 0, songs: [] });
  }

  const result = await searchWithWebApi(keyword, page, limit, cookie);
  return jsonResponse(200, result);
}
