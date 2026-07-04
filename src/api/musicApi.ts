import { Track } from '../types/music';
import { apiGet } from '../utils/neteaseAuth';
const COLORS = ['#ff6b6b','#ff8f5a','#ffb347','#ffd166','#7bdff2','#6c8cff','#9d7bff','#ff7eb6','#5eead4','#34d399'];

function fixCoverUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('//')) return 'https:' + url;
  return url;
}

export async function searchMusic(keyword: string): Promise<Track[]> {
  const q = keyword.trim();
  if (!q) return [];
  const data = await apiGet('/api/search', { keyword: q, limit: '20', page: '0' });
  if (!data.songs || !Array.isArray(data.songs)) return [];
  return data.songs.map((item: any) => ({
    id: String(item.songId),
    title: item.name || '未知歌曲',
    artist: item.artist || '未知',
    album: item.album || '',
    cover: fixCoverUrl(item.cover || ''),
    audioUrl: '',
    duration: item.duration || 0,
    color: item.color || COLORS[Math.floor(Math.random() * COLORS.length)],
    vendor: item.vendor || 'netease',
  }));
}

export async function getSongUrl(track: Track): Promise<string> {
  const vendor = track.vendor || 'netease';
  const id = track.id;
  const name = track.title || '';
  if (!id) return '';
  const data = await apiGet('/api/url', { vendor, id, name });
  if (data.status && data.data) {
    return data.data;
  }
  return '';
}
