export const HOT_SEARCHES = [
  'Taylor Swift',
  'The Weeknd',
  'Adele',
  'Bruno Mars',
  'Billie Eilish',
  'Coldplay',
  '邓紫棋',
  '李荣浩',
  '薛之谦',
  '张惠妹',
  '蔡健雅',
];

export const RECOMMEND_KEYWORDS = [
  { keyword: '泡沫 邓紫棋', label: '泡沫', artist: '邓紫棋', color: '#ff7a59' },
  { keyword: '年少有为 李荣浩', label: '年少有为', artist: '李荣浩', color: '#2dd4bf' },
  { keyword: '丑八怪 薛之谦', label: '丑八怪', artist: '薛之谦', color: '#f59e0b' },
  { keyword: '连名带姓 张惠妹', label: '连名带姓', artist: '张惠妹', color: '#8e7dff' },
  { keyword: 'Shape of You Ed Sheeran', label: 'Shape of You', artist: 'Ed Sheeran', color: '#34d399' },
  { keyword: 'Someone Like You Adele', label: 'Someone Like You', artist: 'Adele', color: '#c084fc' },
  { keyword: '倒数 邓紫棋', label: '倒数', artist: '邓紫棋', color: '#fb923c' },
  { keyword: '老街 李荣浩', label: '老街', artist: '李荣浩', color: '#6dd5ed' },
  { keyword: 'Blinding Lights The Weeknd', label: 'Blinding Lights', artist: 'The Weeknd', color: '#60a5fa' },
  { keyword: '达尔文 蔡健雅', label: '达尔文', artist: '蔡健雅', color: '#f472b6' },
  { keyword: '失落沙洲 徐佳莹', label: '失落沙洲', artist: '徐佳莹', color: '#c084fc' },
  { keyword: '泡沫 (Live) 邓紫棋', label: '泡沫Live', artist: '邓紫棋', color: '#38bdf8' },
];

export const CATEGORIES = [
  { id: 'hot', label: '热门', icon: '🔥', color: 'from-orange-500 to-red-500' },
  { id: 'pop', label: '流行', icon: '🎵', color: 'from-pink-500 to-fuchsia-500' },
  { id: 'rbsoul', label: 'R&B', icon: '🎸', color: 'from-violet-600 to-indigo-700' },
  { id: 'electronic', label: '电子', icon: '🎛️', color: 'from-cyan-500 to-blue-600' },
  { id: 'folk', label: '民谣', icon: '🎸', color: 'from-emerald-500 to-teal-700' },
  { id: 'indie', label: '独立', icon: '🎪', color: 'from-amber-500 to-orange-600' },
  { id: 'latin', label: '拉丁', icon: '💃', color: 'from-red-500 to-pink-600' },
  { id: 'chill', label: '放松', icon: '🌊', color: 'from-sky-400 to-indigo-500' },
];

export const PLAYLIST_KEYWORDS: Record<string, string[]> = {
  hot: ['热门歌曲', 'Top hits', '华语热歌'],
  pop: ['流行音乐', 'pop music', '欧美流行'],
  rbsoul: ['R&B音乐', 'soul music', '当代R&B'],
  electronic: ['电子音乐', 'electronic dance', 'EDM'],
  folk: ['民谣', 'folk music', '独立民谣'],
  indie: ['独立音乐', 'indie music', '独立摇滚'],
  latin: ['拉丁音乐', 'latin music', '拉丁流行'],
  chill: ['放松音乐', 'chill music', 'lo-fi'],
};
