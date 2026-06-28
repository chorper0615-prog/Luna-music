const COLORS = ['#ff6b6b','#ff8f5a','#ffb347','#ffd166','#7bdff2','#6c8cff','#9d7bff','#ff7eb6','#5eead4','#34d399'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

export async function handler(event) {
  const keyword = event.queryStringParameters?.keyword || '';
  const page = parseInt(event.queryStringParameters?.page || '0');
  const limit = parseInt(event.queryStringParameters?.limit || '20');

  if (!keyword) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ total: 0, songs: [] }),
    };
  }

  try {
    const url = `https://music.163.com/api/search/get/web?csrf_token=&s=${encodeURIComponent(keyword)}&type=1&limit=${limit}&offset=${page * limit}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Referer': 'https://music.163.com/',
      },
    });
    const data = await resp.json();

    if (data.code !== 200 || !data.result || !data.result.songs) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ total: 0, songs: [] }),
      };
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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ total: data.result.songCount || songs.length, songs }),
    };
  } catch (e) {
    console.error('Search error:', e.message);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ total: 0, songs: [] }),
    };
  }
}
