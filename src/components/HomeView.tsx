import { useState, useRef, useEffect } from 'react';
import { searchMusic } from '../api/musicApi';
import { RECOMMEND_KEYWORDS, CATEGORIES } from '../data/defaultTracks';
import { Track } from '../types/music';

interface Props {
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlay: (track: Track, queue: Track[], index: number) => void;
  onOpenPlayer: () => void;
  onSearchClick: () => void;
}

const PLAYLIST_DATA = [
  { id: '1', name: '心情律动', subtitle: '为你推荐的热门歌曲', keyword: '热门歌曲', color: 'from-slate-600 to-slate-800' },
  { id: '2', name: '深夜电台', subtitle: '适合夜晚聆听的精选', keyword: '治愈音乐', color: 'from-indigo-600 to-slate-800' },
  { id: '3', name: '午后阳光', subtitle: '轻松惬意的流行旋律', keyword: '轻音乐', color: 'from-amber-600 to-orange-700' },
  { id: '4', name: '城市节拍', subtitle: '都市感电子音乐精选', keyword: '电子音乐', color: 'from-cyan-600 to-blue-800' },
  { id: '5', name: '民谣时光', subtitle: '治愈系民谣合集', keyword: '民谣', color: 'from-emerald-600 to-teal-800' },
  { id: '6', name: '经典回忆', subtitle: '华语金曲精选集', keyword: '经典老歌', color: 'from-rose-700 to-slate-800' },
];

const FEATURED_DATA = [
  { id: 'f1', name: '今日精选', subtitle: '编辑精心挑选', keyword: '华语流行', color: 'from-slate-500 to-slate-700' },
  { id: 'f2', name: '新歌速递', subtitle: '最新热门单曲', keyword: '新歌', color: 'from-blue-600 to-indigo-800' },
  { id: 'f3', name: '华语流行', subtitle: '最受欢迎的华语歌', keyword: '华语金曲', color: 'from-orange-600 to-red-800' },
  { id: 'f4', name: '欧美热榜', subtitle: 'Billboard 热门单曲', keyword: '欧美流行', color: 'from-teal-600 to-emerald-800' },
];

function getRandomColor(index: number): string {
  const colors = [
    'from-slate-600 to-slate-800',
    'from-indigo-600 to-slate-800',
    'from-amber-600 to-orange-700',
    'from-cyan-600 to-blue-800',
    'from-emerald-600 to-teal-800',
    'from-rose-700 to-slate-800',
    'from-violet-600 to-indigo-800',
    'from-yellow-600 to-amber-700',
  ];
  return colors[index % colors.length];
}

export default function HomeView({ onPlay, onSearchClick }: Props) {
  const [recommendSongs, setRecommendSongs] = useState<Track[]>([]);
  const [loadingRecommend, setLoadingRecommend] = useState(true);
  const [newSongs, setNewSongs] = useState<Track[]>([]);
  const [loadingNew, setLoadingNew] = useState(true);
  const [recentSongs, setRecentSongs] = useState<Track[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [playlistSongs, setPlaylistSongs] = useState<Record<string, Track[]>>({});
  const [loadingPlaylists, setLoadingPlaylists] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartRef = useRef<number>(0);
  const isPullingRef = useRef(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const seededRandom = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  };

  const shuffleArray = <T,>(arr: T[], seed: number): T[] => {
    const shuffled = [...arr];
    const random = seededRandom(seed * 1000 + 7);
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const allKeywords = new Set<string>();
    RECOMMEND_KEYWORDS.forEach(item => allKeywords.add(item.keyword));
    PLAYLIST_DATA.forEach(item => allKeywords.add(item.keyword));
    FEATURED_DATA.forEach(item => allKeywords.add(item.keyword));
    
    const keywordList = Array.from(allKeywords);
    
    const searchPromises = keywordList.map(keyword => 
      searchMusic(keyword).catch(() => [])
    );
    
    const allResults = await Promise.all(searchPromises);
    
    const keywordToSongs: Record<string, Track[]> = {};
    keywordList.forEach((keyword, idx) => {
      keywordToSongs[keyword] = allResults[idx] || [];
    });
    
    const allSongs: Track[] = [];
    allResults.forEach(results => {
      allSongs.push(...results);
    });
    
    const uniqueSongs = allSongs.filter((s, i, arr) => 
      arr.findIndex(x => x.id === s.id) === i
    );

    const recommendKeywords = RECOMMEND_KEYWORDS.slice(0, 6).map(item => item.keyword);
    const recommend: Track[] = [];
    for (const kw of recommendKeywords) {
      const songs = keywordToSongs[kw] || [];
      if (songs.length > 0) {
        recommend.push(songs[0]);
      }
    }
    setRecommendSongs(recommend);
    setLoadingRecommend(false);

    const newKeywords = RECOMMEND_KEYWORDS.slice(6, 12).map(item => item.keyword);
    const news: Track[] = [];
    for (const kw of newKeywords) {
      const songs = keywordToSongs[kw] || [];
      if (songs.length > 0) {
        news.push(songs[0]);
      }
    }
    setNewSongs(news);
    setLoadingNew(false);

    const recentKeywords = RECOMMEND_KEYWORDS.slice(2, 8).map(item => item.keyword);
    const recent: Track[] = [];
    for (const kw of recentKeywords) {
      const songs = keywordToSongs[kw] || [];
      if (songs.length > 0) {
        recent.push(songs[0]);
      }
    }
    setRecentSongs(recent);
    setLoadingRecent(false);

    const allPlaylists = [...PLAYLIST_DATA, ...FEATURED_DATA];
    const playlistResult: Record<string, Track[]> = {};
    
    for (let idx = 0; idx < allPlaylists.length; idx++) {
      const pl = allPlaylists[idx];
      const songs = keywordToSongs[pl.keyword] || [];
      if (songs.length > 0) {
        playlistResult[pl.id] = songs.slice(0, 10);
      } else {
        const shuffled = shuffleArray(uniqueSongs, idx + 1);
        playlistResult[pl.id] = shuffled.slice(0, Math.min(10, shuffled.length));
      }
    }
    setPlaylistSongs(playlistResult);
    setLoadingPlaylists(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAllData();
    setIsRefreshing(false);
  };

  const playRecommendList = () => {
    if (recommendSongs.length > 0) {
      onPlay(recommendSongs[0], recommendSongs, 0);
    }
  };

  const playNewList = () => {
    if (newSongs.length > 0) {
      onPlay(newSongs[0], newSongs, 0);
    }
  };

  const playPlaylist = (playlistId: string) => {
    const songs = playlistSongs[playlistId];
    if (songs && songs.length > 0) {
      onPlay(songs[0], songs, 0);
      return;
    }
    if (recommendSongs.length > 0) {
      onPlay(recommendSongs[0], recommendSongs, 0);
      return;
    }
    const allSongs = [...recentSongs, ...newSongs].filter((s, i, arr) => 
      arr.findIndex(x => x.id === s.id) === i
    );
    if (allSongs.length > 0) {
      onPlay(allSongs[0], allSongs, 0);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) {
      touchStartRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current) return;
    const touch = e.touches[0];
    const distance = Math.max(0, touch.clientY - touchStartRef.current);
    if (distance > 0) {
      setPullDistance(Math.min(distance, 100));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      handleRefresh();
    }
    setPullDistance(0);
    isPullingRef.current = false;
  };

  const getPlaylistCover = (playlistId: string) => {
    const songs = playlistSongs[playlistId];
    if (songs && songs.length > 0 && songs[0].cover) {
      return songs[0].cover;
    }
    return null;
  };

  return (
    <div
      ref={scrollRef}
      className="w-full h-full overflow-y-auto no-scrollbar"
      style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex items-center justify-center transition-all duration-200"
        style={{
          height: pullDistance > 0 ? `${pullDistance}px` : '0px',
          opacity: pullDistance > 0 ? 1 : 0,
        }}
      >
        {isRefreshing ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white/50" />
        ) : (
          <div className="text-white/50 text-sm">下拉刷新</div>
        )}
      </div>

      <div className="px-5 pt-1 pb-28">
        <div
          onClick={onSearchClick}
          className={`flex items-center gap-2 h-11 rounded-2xl px-4 mb-6 transition-all duration-300 glass-ios active:scale-[0.98] ${loaded ? 'animate-fade-in' : 'opacity-0'}`}
          style={{ animationDelay: '0.05s' }}
        >
          <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-white/50 text-sm flex-1">搜索歌曲、歌手、专辑</span>
        </div>

        <div className={`mb-8 transition-all duration-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '0.1s' }}>
          <h2 className="text-white text-2xl font-bold mb-4">为你推荐</h2>
          <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
            {PLAYLIST_DATA.map((pl, index) => {
              const cover = getPlaylistCover(pl.id);
              return (
                <div
                  key={pl.id}
                  onClick={() => playPlaylist(pl.id)}
                  className="flex-shrink-0 w-64 active:scale-[0.97] transition-transform duration-200 cursor-pointer"
                  style={{ animationDelay: `${0.15 + index * 0.05}s` }}
                >
                  <div className="relative w-64 h-64 rounded-3xl overflow-hidden mb-3 shadow-2xl group">
                    {cover ? (
                      <img 
                        src={cover} 
                        alt={pl.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${pl.color} animate-pulse-soft`}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/5" />
                    
                    <div className="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center glass-ios animate-breath">
                      <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="glass-ios rounded-2xl p-3">
                        <p className="text-white font-semibold text-sm">{pl.name}</p>
                        <p className="text-white/70 text-xs mt-0.5">{pl.subtitle}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`mb-8 transition-all duration-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-2xl font-bold">精选歌单</h2>
            <button className="text-white/80 text-sm font-medium btn-press">查看全部</button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
            {FEATURED_DATA.map((pl, index) => {
              const cover = getPlaylistCover(pl.id);
              return (
                <div
                  key={pl.id}
                  onClick={() => playPlaylist(pl.id)}
                  className="flex-shrink-0 w-40 active:scale-[0.96] transition-transform duration-200 cursor-pointer"
                >
                  <div className="relative w-40 h-40 rounded-2xl overflow-hidden mb-2 shadow-xl group">
                    {cover ? (
                      <img 
                        src={cover} 
                        alt={pl.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${pl.color} animate-pulse-soft`}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    
                    <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center glass-ios">
                      <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-white text-sm font-medium line-clamp-2 leading-tight">{pl.name}</p>
                  <p className="text-white/50 text-xs mt-0.5 truncate">{pl.subtitle}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`mb-8 transition-all duration-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-2xl font-bold">最近播放</h2>
            <button className="text-white/80 text-sm font-medium btn-press">查看全部</button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
            {loadingRecent ? (
              <div className="flex-shrink-0 w-full py-8 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white/50" />
              </div>
            ) : (
              recentSongs.map((song, index) => (
                <div
                  key={song.id}
                  onClick={() => onPlay(song, recentSongs, index)}
                  className="flex-shrink-0 w-36 active:scale-[0.96] transition-all duration-200 cursor-pointer"
                >
                  <div className="relative w-36 h-36 rounded-2xl overflow-hidden mb-2 shadow-lg group">
                    {song.cover ? (
                      <img 
                        src={song.cover} 
                        alt={song.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${getRandomColor(index)} flex items-center justify-center animate-pulse-soft`}>
                        <span className="text-white/80 text-3xl">♪</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg transform translate-y-2 group-hover:translate-y-0">
                      <svg className="w-4 h-4 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-white text-sm font-medium truncate">{song.title}</p>
                  <p className="text-white/50 text-xs truncate">{song.artist}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`mb-8 transition-all duration-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '0.4s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-2xl font-bold">热门歌曲</h2>
            <button
              onClick={playRecommendList}
              className="flex items-center gap-1.5 text-white/80 text-sm font-medium btn-press"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              播放全部
            </button>
          </div>
          <div className="glass-ios rounded-3xl overflow-hidden p-2">
            {loadingRecommend ? (
              <div className="py-8 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white/50" />
              </div>
            ) : (
              recommendSongs.map((song, index) => (
                <div
                  key={song.id}
                  onClick={() => onPlay(song, recommendSongs, index)}
                  className="flex items-center gap-3 p-2.5 rounded-2xl active:bg-white/5 transition-colors cursor-pointer last:mb-0 mb-0.5"
                >
                  <div className="relative w-6 flex-shrink-0 flex items-center justify-center">
                    {index < 3 ? (
                      <span className="text-white/80 text-sm font-bold">{index + 1}</span>
                    ) : (
                      <span className="text-white/40 text-sm">{index + 1}</span>
                    )}
                  </div>
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                    {song.cover ? (
                      <img 
                        src={song.cover} 
                        alt={song.title} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${getRandomColor(index)} flex items-center justify-center`}>
                        <span className="text-white/80 text-lg">♪</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{song.title}</p>
                    <p className="text-white/50 text-xs truncate">{song.artist}</p>
                  </div>
                  <button className="text-white/40 p-2 active:scale-90 transition-transform">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`mb-8 transition-all duration-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '0.5s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-2xl font-bold">新歌推荐</h2>
            <button
              onClick={playNewList}
              className="flex items-center gap-1.5 text-white/80 text-sm font-medium btn-press"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              播放全部
            </button>
          </div>
          <div className="glass-ios rounded-3xl overflow-hidden p-2">
            {loadingNew ? (
              <div className="py-8 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white/50" />
              </div>
            ) : (
              newSongs.map((song, index) => (
                <div
                  key={song.id}
                  onClick={() => onPlay(song, newSongs, index)}
                  className="flex items-center gap-3 p-2.5 rounded-2xl active:bg-white/5 transition-colors cursor-pointer last:mb-0 mb-0.5"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-md relative group">
                    {song.cover ? (
                      <img 
                        src={song.cover} 
                        alt={song.title} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${getRandomColor(index + 3)} flex items-center justify-center`}>
                        <span className="text-white/80 text-lg">♪</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{song.title}</p>
                    <p className="text-white/50 text-xs truncate">{song.artist}</p>
                  </div>
                  <div className="text-white/30 text-xs font-medium">
                    {Math.floor(Math.random() * 7) + 1}天前
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
