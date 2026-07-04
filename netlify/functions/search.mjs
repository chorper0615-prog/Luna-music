import { COLORS, UA, jsonResponse, getCookie, buildCookieHeaders } from './_shared.mjs';

// 完整的浏览器 headers，绕过网易云反爬
function buildBrowserHeaders(cookie) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://music.163.com/',
    'Origin': 'https://music.163.com',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Content-Type': 'application/x-www-form-urlencoded',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
  };
  if (cookie) headers['Cookie'] = cookie;
  return headers;
}

function parseSongs(songs, apiType = 'web') {
  if (!songs || !Array.isArray(songs)) return [];
  return songs.map((item, i) => {
    // web API 格式: item.artists / item.album
    // cloudsearch API 格式: item.ar / item.al
    const artists = apiType === 'cloud'
      ? (item.ar || item.artists || [])
      : (item.artists || item.ar || []);
    const album = apiType === 'cloud'
      ? (item.al?.name || item.album?.name)
      : (item.album?.name || item.al?.name);
    const cover = apiType === 'cloud'
      ? (item.al?.picUrl || item.album?.picUrl)
      : (item.album?.picUrl || item.al?.picUrl);
    return {
      songId: item.id,
      name: item.name || '',
      artist: artists.map((a) => a.name).filter(Boolean).join(' / ') || '未知',
      album: album || '',
      cover: cover || '',
      duration: Math.floor((item.dt || item.duration || 0) / 1000),
      vendor: 'netease',
      color: COLORS[i % COLORS.length],
    };
  });
}

function fixCovers(songs, cookie) {
  const songsWithoutCover = songs.filter((s) => !s.cover);
  if (songsWithoutCover.length === 0) return;
  try {
    const ids = songsWithoutCover.map((s) => s.songId);
    const detResp = fetch(`https://music.163.com/api/song/detail?ids=[${ids.join(',')}]`, {
      headers: buildBrowserHeaders(cookie),
    });
    // 同步处理：返回 Promise
    return detResp.then((r) => r.json()).then((detData) => {
      if (detData.songs) {
        const coverMap = {};
        detData.songs.forEach((s) => {
          if (s.album && s.album.picUrl) coverMap[s.id] = s.album.picUrl;
        });
        songs.forEach((s) => { if (coverMap[s.songId]) s.cover = coverMap[s.songId]; });
      }
    }).catch(() => {});
  } catch (e) {
    return Promise.resolve();
  }
}

// 方式1：GET web 搜索
async function searchGetWeb(keyword, page, limit, cookie) {
  const url = `https://music.163.com/api/search/get/web?csrf_token=&s=${encodeURIComponent(keyword)}&type=1&limit=${limit}&offset=${page * limit}`;
  const resp = await fetch(url, { headers: buildBrowserHeaders(cookie) });
  const data = await resp.json();
  if (data.code !== 200 || !data.result || !data.result.songs) {
    return null;
  }
  return {
    total: data.result.songCount || data.result.songs.length,
    songs: parseSongs(data.result.songs, 'web'),
  };
}

// 方式2：POST web 搜索（某些场景 POST 更稳定）
async function searchPostWeb(keyword, page, limit, cookie) {
  const url = 'https://music.163.com/api/search/get/web';
  const body = new URLSearchParams({
    csrf_token: '',
    s: keyword,
    type: '1',
    limit: String(limit),
    offset: String(page * limit),
  });
  const resp = await fetch(url, {
    method: 'POST',
    headers: buildBrowserHeaders(cookie),
    body: body.toString(),
  });
  const data = await resp.json();
  if (data.code !== 200 || !data.result || !data.result.songs) {
    return null;
  }
  return {
    total: data.result.songCount || data.result.songs.length,
    songs: parseSongs(data.result.songs, 'web'),
  };
}

// 方式3：cloudsearch 接口（返回更详细的信息）
async function searchCloudSearch(keyword, page, limit, cookie) {
  const url = `https://music.163.com/api/cloudsearch/pc?csrf_token=&s=${encodeURIComponent(keyword)}&type=1&limit=${limit}&offset=${page * limit}`;
  const resp = await fetch(url, { headers: buildBrowserHeaders(cookie) });
  const data = await resp.json();
  if (data.code !== 200 || !data.result || !data.result.songs) {
    return null;
  }
  return {
    total: data.result.songCount || data.result.songs.length,
    songs: parseSongs(data.result.songs, 'cloud'),
  };
}

// 方式4：旧版 search/get 接口
async function searchLegacyGet(keyword, page, limit, cookie) {
  const url = `https://music.163.com/api/search/get?s=${encodeURIComponent(keyword)}&type=1&limit=${limit}&offset=${page * limit}`;
  const resp = await fetch(url, { headers: buildBrowserHeaders(cookie) });
  const data = await resp.json();
  if (data.code !== 200 || !data.result || !data.result.songs) {
    return null;
  }
  return {
    total: data.result.songCount || data.result.songs.length,
    songs: parseSongs(data.result.songs, 'web'),
  };
}

export async function handler(event) {
  const keyword = event.queryStringParameters?.keyword || '';
  const page = parseInt(event.queryStringParameters?.page || '0');
  const limit = parseInt(event.queryStringParameters?.limit || '20');
  const cookie = getCookie(event);

  if (!keyword) {
    return jsonResponse(200, { total: 0, songs: [] });
  }

  // 依次尝试 4 种搜索方式，任一成功即返回
  const strategies = [
    () => searchGetWeb(keyword, page, limit, cookie),
    () => searchPostWeb(keyword, page, limit, cookie),
    () => searchCloudSearch(keyword, page, limit, cookie),
    () => searchLegacyGet(keyword, page, limit, cookie),
  ];

  let lastError = '';
  for (const strategy of strategies) {
    try {
      const result = await strategy();
      if (result && result.songs.length > 0) {
        // 补全封面
        await fixCovers(result.songs, cookie);
        // 最终 fallback 到 picsum
        result.songs.forEach((s) => {
          if (!s.cover) s.cover = `https://picsum.photos/seed/${encodeURIComponent(s.name)}/300/300`;
        });
        return jsonResponse(200, result);
      }
    } catch (e) {
      lastError = e.message;
      console.warn('Search strategy failed:', lastError);
    }
  }

  return jsonResponse(200, { total: 0, songs: [], error: lastError || 'all strategies failed' });
}
