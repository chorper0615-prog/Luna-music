import { NeteaseMusicApi, COLORS, UA, jsonResponse, getCookie } from './_shared.mjs';

async function searchWithNeteaseApi(keyword, page, limit, cookie) {
  if (!NeteaseMusicApi?.search) return null;
  try {
    const result = await NeteaseMusicApi.search({
      keywords: keyword,
      type: 1,
      limit,
      offset: page * limit,
      cookie: cookie || undefined,
    });
    if (result?.body?.result?.songs) {
      const songs = result.body.result.songs.map((item, i) => ({
        songId: item.id,
        name: item.name || '',
        artist: (item.ar || item.artists || []).map((a) => a.name).filter(Boolean).join(' / ') || '未知',
        album: (item.al?.name || item.album?.name) || '',
        cover: (item.al?.picUrl || item.album?.picUrl) || '',
        duration: Math.floor((item.dt || item.duration || 0) / 1000),
        vendor: 'netease',
        color: COLORS[i % COLORS.length],
      }));
      const songsWithoutCover = songs.filter((s) => !s.cover);
      if (songsWithoutCover.length > 0 && NeteaseMusicApi?.song_detail) {
        try {
          const ids = songsWithoutCover.map((s) => s.songId);
          const detResult = await NeteaseMusicApi.song_detail({
            ids: ids.join(','),
            cookie: cookie || undefined,
          });
          if (detResult?.body?.songs) {
            const coverMap = {};
            detResult.body.songs.forEach((s) => {
              if (s.al?.picUrl) coverMap[s.id] = s.al.picUrl;
            });
            songs.forEach((s) => { if (coverMap[s.songId]) s.cover = coverMap[s.songId]; });
          }
        } catch (e) {}
      }
      songs.forEach((s) => { if (!s.cover) s.cover = `https://picsum.photos/seed/${encodeURIComponent(s.name)}/300/300`; });
      return { total: result.body.result.songCount || songs.length, songs };
    }
  } catch (e) {
    console.warn('Netease API search failed:', e.message);
  }
  return null;
}

async function searchWithWebApi(keyword, page, limit) {
  try {
    const url = `https://music.163.com/api/search/get/web?csrf_token=&s=${encodeURIComponent(keyword)}&type=1&limit=${limit}&offset=${page * limit}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA, 'Referer': 'https://music.163.com/' },
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
    const songsWithoutCover = songs.filter((s) => !s.cover);
    if (songsWithoutCover.length > 0) {
      try {
        const ids = songsWithoutCover.map((s) => s.songId);
        const detResp = await fetch(`https://music.163.com/api/song/detail?ids=[${ids.join(',')}]`, {
          headers: { 'User-Agent': UA, 'Referer': 'https://music.163.com/' },
        });
        const detData = await detResp.json();
        if (detData.songs) {
          const coverMap = {};
          detData.songs.forEach((s) => { if (s.album && s.album.picUrl) coverMap[s.id] = s.album.picUrl; });
          songs.forEach((s) => { if (coverMap[s.songId]) s.cover = coverMap[s.songId]; });
        }
      } catch (e) {}
    }
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

  if (cookie && NeteaseMusicApi) {
    const result = await searchWithNeteaseApi(keyword, page, limit, cookie);
    if (result) return jsonResponse(200, result);
  }

  const result = await searchWithWebApi(keyword, page, limit);
  return jsonResponse(200, result);
}
