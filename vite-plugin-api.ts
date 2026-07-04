import type { Plugin } from 'vite';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';

const require = createRequire(import.meta.url);
const NeteaseMusicApi: any = require('NeteaseCloudMusicApi');

const COLORS = ['#ff6b6b','#ff8f5a','#ffb347','#ffd166','#7bdff2','#6c8cff','#9d7bff','#ff7eb6','#5eead4','#34d399'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const CLOUD_API = 'http://localhost:3000';

const COOKIE_FILE = path.join(os.tmpdir(), 'luna_netease_cookie.json');

interface CookieStore {
  cookie: string;
  userId?: number;
  nickname?: string;
  avatarUrl?: string;
  vipType?: number;
  updatedAt: number;
}

let cookieCache: CookieStore | null = null;

function loadCookieFromFile(): CookieStore | null {
  try {
    if (fs.existsSync(COOKIE_FILE)) {
      const raw = fs.readFileSync(COOKIE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data.cookie) return data;
    }
  } catch (e) {
    console.warn('Failed to load cookie file:', e);
  }
  return null;
}

function saveCookieToFile(data: CookieStore) {
  try {
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(data), 'utf-8');
  } catch (e) {
    console.warn('Failed to save cookie file:', e);
  }
}

function clearCookieFile() {
  try {
    if (fs.existsSync(COOKIE_FILE)) {
      fs.unlinkSync(COOKIE_FILE);
    }
  } catch (e) {
    console.warn('Failed to clear cookie file:', e);
  }
}

function getCurrentCookie(): string {
  if (!cookieCache) {
    cookieCache = loadCookieFromFile();
  }
  return cookieCache?.cookie || '';
}

function getCookieFromReq(req: any): string {
  try {
    const url = new URL(req.url || '', 'http://localhost');
    const cookieParam = url.searchParams.get('cookie');
    if (cookieParam) {
      try {
        return decodeURIComponent(cookieParam);
      } catch {
        return cookieParam;
      }
    }
  } catch (e) {}
  return '';
}

function resolveCookie(req: any): string {
  const paramCookie = getCookieFromReq(req);
  if (paramCookie) return paramCookie;
  return getCurrentCookie();
}

function setCookieStore(data: CookieStore) {
  cookieCache = data;
  saveCookieToFile(data);
}

function clearCookieStore() {
  cookieCache = null;
  clearCookieFile();
}

async function neteaseSearch(keyword: string, page: number, limit: number, cookie: string = '') {
  try {
    if (NeteaseMusicApi?.search) {
      try {
        const searchParams: any = {
          keywords: keyword,
          type: 1,
          limit,
          offset: page * limit,
        };
        if (cookie) searchParams.cookie = cookie;
        const result = await NeteaseMusicApi.search(searchParams);
        if (result?.body?.result?.songs) {
          const songs = result.body.result.songs.map((item: any, i: number) => ({
            songId: item.id,
            name: item.name || '',
            artist: (item.ar || item.artists || []).map((a: any) => a.name).filter(Boolean).join(' / ') || '未知',
            album: (item.al?.name || item.album?.name) || '',
            cover: (item.al?.picUrl || item.album?.picUrl) || '',
            duration: Math.floor((item.dt || item.duration || 0) / 1000),
            vendor: 'netease',
            color: COLORS[i % COLORS.length],
          }));
          const songsWithoutCover = songs.filter((s: any) => !s.cover);
          if (songsWithoutCover.length > 0) {
            try {
              const ids = songsWithoutCover.map((s: any) => s.songId);
              const detResult = await NeteaseMusicApi.song_detail({
                ids: ids.join(','),
                cookie,
              });
              if (detResult?.body?.songs) {
                const coverMap: Record<string, string> = {};
                detResult.body.songs.forEach((s: any) => {
                  if (s.al?.picUrl) coverMap[s.id] = s.al.picUrl;
                });
                songs.forEach((s: any) => { if (coverMap[s.songId]) s.cover = coverMap[s.songId]; });
              }
            } catch (e) {}
          }
          songs.forEach((s: any) => { if (!s.cover) s.cover = `https://picsum.photos/seed/${encodeURIComponent(s.name)}/300/300`; });
          return { total: result.body.result.songCount || songs.length, songs };
        }
      } catch (e: any) {
        console.warn('Netease API search failed, falling back:', e.message);
      }
    }
    
    const url = `https://music.163.com/api/search/get/web?csrf_token=&s=${encodeURIComponent(keyword)}&type=1&limit=${limit}&offset=${page * limit}`;
    const resp = await fetch(url, { headers: { 'User-Agent': UA, 'Referer': 'https://music.163.com/' } });
    const data: any = await resp.json();
    if (data.code !== 200 || !data.result || !data.result.songs) return { total: 0, songs: [] };
    const songs = data.result.songs.map((item: any, i: number) => ({
      songId: item.id,
      name: item.name || '',
      artist: (item.artists || []).map((a: any) => a.name).filter(Boolean).join(' / ') || '未知',
      album: (item.album && item.album.name) || '',
      cover: (item.album && item.album.picUrl) || '',
      duration: Math.floor((item.duration || 0) / 1000),
      vendor: 'netease',
      color: COLORS[i % COLORS.length],
    }));
    const songsWithoutCover = songs.filter((s: any) => !s.cover);
    if (songsWithoutCover.length > 0) {
      try {
        const ids = songsWithoutCover.map((s: any) => s.songId);
        const detResp = await fetch(`https://music.163.com/api/song/detail?ids=[${ids.join(',')}]`, {
          headers: { 'User-Agent': UA, 'Referer': 'https://music.163.com/' },
        });
        const detData: any = await detResp.json();
        if (detData.songs) {
          const coverMap: Record<string, string> = {};
          detData.songs.forEach((s: any) => { if (s.album && s.album.picUrl) coverMap[s.id] = s.album.picUrl; });
          songs.forEach((s: any) => { if (coverMap[s.songId]) s.cover = coverMap[s.songId]; });
        }
      } catch (e) {}
    }
    songs.forEach((s: any) => { if (!s.cover) s.cover = `https://picsum.photos/seed/${encodeURIComponent(s.name)}/300/300`; });
    return { total: data.result.songCount || songs.length, songs };
  } catch (e: any) {
    console.error('Search error:', e.message);
    return { total: 0, songs: [] };
  }
}

async function getRawAudioUrl(songId: string, cookie: string = ''): Promise<string | null> {
  // 1. 使用 NeteaseCloudMusicApi 获取歌曲 URL（不需要 cookie 也能获取非 VIP 歌曲）
  if (NeteaseMusicApi?.song_url_v1) {
    try {
      const urlParams: any = {
        id: songId,
        level: 'exhigh',
      };
      if (cookie) urlParams.cookie = cookie;
      const result = await NeteaseMusicApi.song_url_v1(urlParams);
      if (result?.body?.data?.[0]?.url) {
        return result.body.data[0].url;
      }
    } catch (e: any) {
      console.warn('Netease API song_url_v1 failed:', e.message);
    }
  }

  // 2. 使用 NeteaseCloudMusicApi 的 song_url 接口（备选）
  if (NeteaseMusicApi?.song_url) {
    try {
      const urlParams: any = {
        id: songId,
        br: 320000,
      };
      if (cookie) urlParams.cookie = cookie;
      const result = await NeteaseMusicApi.song_url(urlParams);
      if (result?.body?.data?.[0]?.url) {
        return result.body.data[0].url;
      }
    } catch (e: any) {
      console.warn('Netease API song_url failed:', e.message);
    }
  }
  
  try {
    const resp = await fetch(`${CLOUD_API}/song/url?id=${songId}&br=128000`, {
      signal: AbortSignal.timeout(3000),
    });
    const data: any = await resp.json();
    if (data.code === 200 && data.data && data.data[0] && data.data[0].url) return data.data[0].url;
  } catch (e: any) {
    console.warn('CloudApi error, trying backup:', e.message);
  }
  
  try {
    const backupUrl = `https://music.163.com/song/media/outer/url?id=${songId}.mp3`;
    const testResp = await fetch(backupUrl, {
      method: 'HEAD',
      headers: { 'User-Agent': UA, 'Referer': 'https://music.163.com/' },
      signal: AbortSignal.timeout(5000),
    } as any);
    if (testResp.ok || testResp.status === 206) {
      return backupUrl;
    }
  } catch (e: any) {
    console.warn('Backup url error:', e.message);
  }
  
  return null;
}

async function getLoginStatus(cookie: string = ''): Promise<{ isLoggedIn: boolean; userId?: number; nickname?: string; avatarUrl?: string; vipType?: number }> {
  if (!cookie || !NeteaseMusicApi?.login_status) {
    return { isLoggedIn: false };
  }
  
  try {
    const result = await NeteaseMusicApi.login_status({ cookie });
    const body = result?.body?.data || result?.body;
    if (body?.code === 200 && body?.profile) {
      const profile = body.profile;
      const userInfo = {
        userId: profile.userId,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
        vipType: profile.vipType,
      };
      if (cookieCache && cookieCache.cookie === cookie) {
        cookieCache = { ...cookieCache, ...userInfo };
        saveCookieToFile(cookieCache);
      }
      return { isLoggedIn: true, ...userInfo };
    }
  } catch (e: any) {
    console.warn('Login status check failed:', e.message);
  }
  
  return { isLoggedIn: false };
}

function sendJson(res: any, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(data));
}

function getAudioContentType(url: string): string {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.mp3')) return 'audio/mpeg';
  if (lowerUrl.includes('.wav')) return 'audio/wav';
  if (lowerUrl.includes('.ogg') || lowerUrl.includes('.oga')) return 'audio/ogg';
  if (lowerUrl.includes('.m4a') || lowerUrl.includes('.aac')) return 'audio/aac';
  if (lowerUrl.includes('.flac')) return 'audio/flac';
  if (lowerUrl.includes('.webm')) return 'audio/webm';
  return 'audio/mpeg';
}

async function handleProxyAudio(urlStr: string, req: any, res: any) {
  try {
    const decodedUrl = decodeURIComponent(urlStr);
    const rangeHeader = req.headers['range'];
    const cookie = resolveCookie(req);

    const fetchHeaders: Record<string, string> = {
      'User-Agent': UA,
      'Referer': 'https://music.163.com/',
    };
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }
    if (cookie) {
      fetchHeaders['Cookie'] = cookie;
    }

    const audioResp = await fetch(decodedUrl, {
      headers: fetchHeaders,
      signal: AbortSignal.timeout(30000),
    } as any);

    if (!audioResp.ok && audioResp.status !== 206) {
      sendJson(res, 502, { error: 'Audio fetch failed: ' + audioResp.status });
      return;
    }

    const ct = getAudioContentType(decodedUrl);
    const contentLength = audioResp.headers.get('content-length');
    const contentRange = audioResp.headers.get('content-range');

    res.setHeader('Content-Type', ct);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    res.setHeader('Accept-Ranges', 'bytes');
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (contentLength) res.setHeader('Content-Length', contentLength);

    res.statusCode = audioResp.status === 206 ? 206 : 200;

    if ((audioResp as any).body) {
      const reader = (audioResp as any).body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            if (!res.write(Buffer.from(value))) {
              await new Promise(resolve => res.once('drain', resolve));
            }
          }
        } catch (e) {
          try { res.end(); } catch (_) {}
        }
      };
      pump();
    } else {
      const buffer = Buffer.from(await audioResp.arrayBuffer());
      if (!contentLength) res.setHeader('Content-Length', String(buffer.length));
      res.end(buffer);
    }
  } catch (e: any) {
    sendJson(res, 502, { error: 'Audio proxy error: ' + e.message });
  }
}

export function apiPlugin(): Plugin {
  return {
    name: 'api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/login/qr/key', async (_req, res) => {
        try {
          if (!NeteaseMusicApi?.login_qr_key) {
            sendJson(res, 500, { code: 500, message: 'API not available' });
            return;
          }
          const result = await NeteaseMusicApi.login_qr_key({});
          sendJson(res, 200, { code: 200, data: result?.body?.data || {} });
        } catch (e: any) {
          sendJson(res, 500, { code: 500, message: e.message });
        }
      });

      server.middlewares.use('/api/login/qr/create', async (req, res) => {
        try {
          const url = new URL(req.url || '', 'http://localhost');
          const key = url.searchParams.get('key') || '';
          if (!key) {
            sendJson(res, 400, { code: 400, message: 'Missing key' });
            return;
          }
          if (!NeteaseMusicApi?.login_qr_create) {
            sendJson(res, 500, { code: 500, message: 'API not available' });
            return;
          }
          const result = await NeteaseMusicApi.login_qr_create({ key, qrimg: true });
          sendJson(res, 200, { code: 200, data: result?.body?.data || {} });
        } catch (e: any) {
          sendJson(res, 500, { code: 500, message: e.message });
        }
      });

      server.middlewares.use('/api/login/qr/check', async (req, res) => {
        try {
          const url = new URL(req.url || '', 'http://localhost');
          const key = url.searchParams.get('key') || '';
          if (!key) {
            sendJson(res, 400, { code: 400, message: 'Missing key' });
            return;
          }
          if (!NeteaseMusicApi?.login_qr_check) {
            sendJson(res, 500, { code: 500, message: 'API not available' });
            return;
          }
          const result = await NeteaseMusicApi.login_qr_check({ key });
          const body = result?.body || {};
          
          if (body.code === 803 && body.cookie) {
            const cookieStr = body.cookie;
            setCookieStore({
              cookie: cookieStr,
              updatedAt: Date.now(),
            });
          }
          
          sendJson(res, 200, { code: body.code || 800, message: body.message || '', cookie: body.cookie || '' });
        } catch (e: any) {
          sendJson(res, 500, { code: 500, message: e.message });
        }
      });

      server.middlewares.use('/api/login/status', async (req, res) => {
        try {
          const cookie = resolveCookie(req);
          const status = await getLoginStatus(cookie);
          sendJson(res, 200, { code: 200, data: status });
        } catch (e: any) {
          sendJson(res, 500, { code: 500, message: e.message });
        }
      });

      server.middlewares.use('/api/logout', async (req, res) => {
        try {
          const cookie = resolveCookie(req);
          if (cookie && NeteaseMusicApi?.logout) {
            try {
              await NeteaseMusicApi.logout({ cookie });
            } catch (e) {}
          }
          clearCookieStore();
          sendJson(res, 200, { code: 200, message: 'Logged out' });
        } catch (e: any) {
          clearCookieStore();
          sendJson(res, 200, { code: 200, message: 'Logged out (local)' });
        }
      });

      server.middlewares.use('/api/search', async (req, res) => {
        const url = new URL(req.url || '', 'http://localhost');
        const keyword = url.searchParams.get('keyword') || '';
        const page = parseInt(url.searchParams.get('page') || '0');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const cookie = resolveCookie(req);
        const result = await neteaseSearch(keyword, page, limit, cookie);
        sendJson(res, 200, result);
      });

      server.middlewares.use('/api/url', async (req, res) => {
        const url = new URL(req.url || '', 'http://localhost');
        const id = url.searchParams.get('id') || '';
        const cookie = resolveCookie(req);
        const rawUrl = await getRawAudioUrl(id, cookie);
        if (rawUrl) {
          sendJson(res, 200, { status: true, data: rawUrl });
        } else {
          sendJson(res, 200, { status: false, msg: '无法获取歌曲播放地址' });
        }
      });

      server.middlewares.use('/api/proxy-audio', async (req, res) => {
        const url = new URL(req.url || '', 'http://localhost');
        const audioUrl = url.searchParams.get('url') || '';
        if (!audioUrl) {
          sendJson(res, 400, { error: 'Missing url parameter' });
          return;
        }
        await handleProxyAudio(audioUrl, req, res);
      });

      server.middlewares.use('/api/lyric', async (req, res) => {
        const url = new URL(req.url || '', 'http://localhost');
        const id = url.searchParams.get('id') || '';
        const cookie = resolveCookie(req);
        
        if (NeteaseMusicApi?.lyric) {
          try {
            const lyricParams: any = { id };
            if (cookie) lyricParams.cookie = cookie;
            const result = await NeteaseMusicApi.lyric(lyricParams);
            if (result?.body?.lrc?.lyric) {
              sendJson(res, 200, { status: true, data: result.body.lrc.lyric });
              return;
            }
          } catch (e) {
            console.warn('Netease API lyric failed, falling back:', e);
          }
        }
        
        try {
          const lyrResp = await fetch(`${CLOUD_API}/lyric?id=${id}`, {
            signal: AbortSignal.timeout(3000),
          });
          const lyrData: any = await lyrResp.json();
          if (lyrData.code === 200 && lyrData.lrc && lyrData.lrc.lyric) {
            sendJson(res, 200, { status: true, data: lyrData.lrc.lyric });
            return;
          }
        } catch (e) {
          console.warn('Cloud lyric error, trying backup:', e);
        }
        
        try {
          const backupResp = await fetch(`https://music.163.com/api/song/lyric?os=pc&id=${id}&lv=-1&kv=-1&tv=-1`, {
            headers: { 
              'User-Agent': UA, 
              'Referer': 'https://music.163.com/',
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(5000),
          } as any);
          const backupData: any = await backupResp.json();
          if (backupData.lrc && backupData.lrc.lyric) {
            sendJson(res, 200, { status: true, data: backupData.lrc.lyric });
            return;
          }
        } catch (e) {
          console.warn('Backup lyric error:', e);
        }
        
        sendJson(res, 200, { status: false });
      });

      server.middlewares.use('/api/health', (_req, res) => {
        sendJson(res, 200, { status: 'ok', ts: Date.now() });
      });
    },
  };
}
