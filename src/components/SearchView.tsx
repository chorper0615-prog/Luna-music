import { useRef, useState, useEffect, useCallback } from 'react';
import { searchMusic } from '../api/musicApi';
import { CATEGORIES, HOT_SEARCHES } from '../data/defaultTracks';
import { Track } from '../types/music';
import AlbumArt from './AlbumArt';

const CATEGORY_COLORS: Record<string, string> = {
  hot: 'rgba(255, 255, 255, 0.1)',
  pop: 'rgba(255, 255, 255, 0.1)',
  rbsoul: 'rgba(255, 255, 255, 0.1)',
  electronic: 'rgba(255, 255, 255, 0.1)',
  folk: 'rgba(255, 255, 255, 0.1)',
  indie: 'rgba(255, 255, 255, 0.1)',
  latin: 'rgba(255, 255, 255, 0.1)',
  chill: 'rgba(255, 255, 255, 0.1)',
};

interface Props {
  currentTrack: Track | null;
  onPlay: (track: Track, queue: Track[], index: number) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (track: Track) => void;
}

export default function SearchView({ currentTrack, onPlay, isFavorite, onToggleFavorite }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [headerVisible, setHeaderVisible] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const lastQueryRef = useRef('');

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // 搜索结果存在时，滚动超过 30px 隐藏头部
    if (searched && results.length > 0) {
      setHeaderVisible(el.scrollTop < 30);
    } else {
      setHeaderVisible(true);
    }
  }, [searched, results.length]);

  useEffect(() => {
    const saved = localStorage.getItem('searchHistory');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved).slice(0, 10));
      } catch {}
    }
  }, []);
  
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const saveToHistory = (term: string) => {
    const newHistory = [term, ...searchHistory.filter(h => h !== term)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };

  const doSearch = async (keyword: string) => {
    const q = keyword.trim();
    if (!q) return;
    
    saveToHistory(q);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    const myRequestId = ++requestIdRef.current;
    lastQueryRef.current = q;
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setLoading(true);
    setError('');
    setSearched(true);
    
    try {
      const res = await fetch(`/api/search?keyword=${encodeURIComponent(q)}&limit=20&page=0`, {
        signal: controller.signal,
      });
      
      if (myRequestId !== requestIdRef.current) return;
      
      if (!res.ok) throw new Error('搜索请求失败: ' + res.status);
      const data = await res.json();
      
      if (myRequestId !== requestIdRef.current) return;
      
      const COLORS = ['#ff6b6b','#ff8f5a','#ffb347','#ffd166','#7bdff2','#6c8cff','#9d7bff','#ff7eb6','#5eead4','#34d399'];
      
      const fixCoverUrl = (url: string): string => {
        if (!url) return '';
        if (url.startsWith('//')) return 'https:' + url;
        return url;
      };
      
      const tracks: Track[] = (data.songs || []).map((item: any) => ({
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
      
      if (myRequestId !== requestIdRef.current) return;
      
      setResults(tracks);
      if (tracks.length === 0) setError('没有找到可播放的结果，换个关键词试试');
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      if (myRequestId !== requestIdRef.current) return;
      setResults([]);
      setError(e instanceof Error ? e.message : '搜索失败');
    } finally {
      if (myRequestId === requestIdRef.current) {
        setLoading(false);
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    const trimmed = value.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      setError('');
      return;
    }
    
    searchTimeoutRef.current = window.setTimeout(() => {
      doSearch(trimmed);
    }, 150);
  };

  const handleHotSearchClick = (term: string) => {
    setQuery(term);
    doSearch(term);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  };

  const showSuggestions = isFocused && !searched;

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="w-full h-full overflow-y-auto no-scrollbar" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
      <div 
        className="relative"
        style={{ 
          minHeight: '100%',
          background: 'linear-gradient(180deg, #0a0a0f 0%, #0f0f18 30%, #0a0a0f 100%)',
        }}
      >
        {/* 背景极光 - 中性色 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute rounded-full"
            style={{
              top: '-15%', left: '-20%', width: '60%', height: '40%',
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, transparent 60%)',
              filter: 'blur(50px)',
              animation: 'search-aurora 12s ease-in-out infinite',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              top: '-5%', right: '-15%', width: '50%', height: '35%',
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 60%)',
              filter: 'blur(55px)',
              animation: 'search-aurora 15s ease-in-out infinite reverse',
              animationDelay: '-4s',
            }}
          />
        </div>

        {/* 顶部搜索栏 - 搜索结果滚动时退场 */}
        <div 
          className="sticky top-0 z-30 px-4 pb-3 pt-3 transition-all duration-400 ease-out"
          style={{
            opacity: headerVisible ? 1 : 0,
            transform: headerVisible ? 'translateY(0)' : 'translateY(-100%)',
            pointerEvents: headerVisible ? 'auto' : 'none',
          }}
        >
          <div 
            className="backdrop-blur-2xl transition-all duration-400"
            style={{
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              margin: '0 -16px',
              padding: '12px 16px 12px',
            }}
          >
            {/* 标题 + 取消按钮 */}
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">搜索</h1>
              {isFocused && (
                <button 
                  onClick={() => { 
                    setIsFocused(false); 
                    inputRef.current?.blur(); 
                    setQuery('');
                    setResults([]);
                    setSearched(false);
                  }}
                  className="text-white/80 text-sm font-medium transition-all duration-200 active:scale-95"
                >
                  取消
                </button>
              )}
            </div>

            {/* 搜索框 - 液态玻璃 */}
            <div 
              className={`flex items-center gap-3 rounded-[20px] px-4 py-3 transition-all duration-300 ${
                isFocused ? 'ring-2 ring-white/30 scale-[1.01]' : ''
              }`}
              style={{
                background: isFocused 
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)',
                backdropFilter: 'blur(30px) saturate(180%)',
                WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                border: isFocused 
                  ? '1px solid rgba(255,255,255,0.25)'
                  : '1px solid rgba(255,255,255,0.1)',
                boxShadow: isFocused
                  ? '0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)'
                  : '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              <svg className="h-5 w-5 shrink-0 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input 
                ref={inputRef} 
                value={query} 
                onChange={(e) => handleInputChange(e.target.value)} 
                onFocus={() => setIsFocused(true)}
                onKeyDown={(e) => e.key === 'Enter' && doSearch(query)} 
                placeholder="搜索歌曲、歌手、专辑" 
                className="flex-1 bg-transparent text-base outline-none text-white placeholder-white/40"
              />
              {query ? (
                <button 
                  onClick={() => { setQuery(''); setResults([]); setSearched(false); setError(''); inputRef.current?.focus(); }} 
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  <svg className="w-3 h-3 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* 搜索建议区域（聚焦时显示） */}
        {showSuggestions && (
          <div className="px-4 pb-6 animate-search-suggestions">
            {/* 搜索历史 */}
            {searchHistory.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-white">最近搜索</h2>
                  <button 
                    onClick={clearHistory}
                    className="text-white/50 text-sm transition-all duration-200 active:scale-90"
                  >
                    清除
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((term, i) => (
                    <button 
                      key={term} 
                      onClick={() => handleHotSearchClick(term)} 
                      className="rounded-full px-4 py-2 text-sm text-white/80 transition-all duration-250 hover:scale-105 active:scale-95"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        animationDelay: `${i * 0.05}s`,
                      }}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* 热门搜索 */}
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-3">热门搜索</h2>
              <div className="space-y-1">
                {HOT_SEARCHES.slice(0, 6).map((term, index) => (
                  <button
                    key={term}
                    onClick={() => handleHotSearchClick(term)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-250 hover:bg-white/5 active:scale-[0.98]"
                    style={{ animationDelay: `${index * 0.06}s` }}
                  >
                    <span 
                      className={`w-6 text-center text-sm font-bold ${
                        index < 3 ? 'text-white/90' : 'text-white/30'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="flex-1 text-left text-white/90 text-sm">{term}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* 浏览分类 */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-3">浏览分类</h2>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.slice(0, 6).map((category, index) => (
                  <button 
                    key={category.id} 
                    onClick={() => { setQuery(category.label); doSearch(category.label); }} 
                    className="relative overflow-hidden rounded-[20px] p-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-95"
                    style={{
                      background: `linear-gradient(135deg, ${CATEGORY_COLORS[category.id] || 'rgba(255,255,255,0.1)'} 0%, rgba(255,255,255,0.05) 100%)`,
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      animationDelay: `${index * 0.08}s`,
                    }}
                  >
                    <div className="text-3xl mb-2">{category.icon}</div>
                    <div className="text-sm font-semibold text-white">{category.label}</div>
                    <div className="text-[10px] text-white/50 mt-0.5">立即探索</div>
                    <div 
                      className="absolute -top-6 -right-6 w-16 h-16 rounded-full"
                      style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.1), transparent)' }}
                    />
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                <div 
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/50 animate-spin"
                  style={{ animationDuration: '1s' }}
                />
                <div 
                  className="absolute inset-1 rounded-full border-2 border-transparent border-t-white/20 animate-spin"
                  style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
                />
              </div>
              <p className="text-white/50 text-sm">搜索中...</p>
            </div>
          </div>
        )}

        {/* 搜索结果 */}
        {searched && !loading && results.length > 0 && (
          <div className="px-4 pb-6 animate-search-results">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">最佳结果</h2>
                <p className="text-xs text-white/50">{results.length} 首歌曲</p>
              </div>
              <button 
                onClick={() => onPlay(results[0], results, 0)} 
                className="rounded-full px-5 py-2 text-sm font-semibold transition-all duration-250 active:scale-90 hover:scale-105"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)',
                  color: '#fff',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                全部播放
              </button>
            </div>

            <div className="space-y-1">
              {results.map((track, index) => {
                const active = currentTrack?.id === track.id;
                const fav = isFavorite(track.id);
                return (
                  <div 
                    key={track.id} 
                    className="flex w-full items-center gap-3 rounded-[18px] p-2.5 transition-all duration-250 hover:bg-white/5"
                    style={{ 
                      animationDelay: `${index * 0.03}s`,
                      background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                      border: active ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                    }}
                  >
                    <button 
                      onClick={() => onPlay(track, results, index)} 
                      className="flex items-center gap-3 flex-1 min-w-0 text-left active:scale-[0.98] transition-transform duration-200"
                    >
                      <div className="relative h-12 w-12 overflow-hidden rounded-xl shrink-0">
                        <AlbumArt track={track} isPlaying={active} size="md" className="h-12 w-12 rounded-xl" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p 
                          className="truncate text-sm font-semibold"
                          style={{ color: active ? '#fff' : '#fff' }}
                        >
                          {track.title}
                        </p>
                        <p className="truncate text-xs text-white/50">{track.artist}</p>
                      </div>
                      {active ? (
                        <div className="flex items-end gap-[2px] h-4">
                          <span className="w-[2px] rounded-full bg-white/80 animate-eq-bar-1" style={{ height: 12 }} />
                          <span className="w-[2px] rounded-full bg-white/80 animate-eq-bar-2" style={{ height: 16 }} />
                          <span className="w-[2px] rounded-full bg-white/80 animate-eq-bar-3" style={{ height: 10 }} />
                        </div>
                      ) : (
                        <svg className="w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(track); }}
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                      style={{
                        background: fav ? 'rgba(255,107,129,0.15)' : 'rgba(255,255,255,0.06)',
                        border: fav ? '1px solid rgba(255,107,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <svg 
                        className="w-4 h-4" 
                        fill={fav ? '#ff6b81' : 'none'} 
                        stroke={fav ? '#ff6b81' : 'rgba(255,255,255,0.4)'} 
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                        />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {searched && !loading && error && (
          <div className="mt-12 mx-4 rounded-[24px] p-6 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-white/60 text-sm">{error}</p>
            <button 
              onClick={() => doSearch(query)}
              className="mt-4 px-6 py-2 rounded-full text-sm font-medium text-white/80 transition-all duration-200 active:scale-95"
              style={{ 
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              重新搜索
            </button>
          </div>
        )}

        {/* 未聚焦且未搜索时 - 只显示分类 */}
        {!isFocused && !searched && !loading && (
          <div className="px-4 pb-6">
            <section>
              <h2 className="text-lg font-semibold text-white mb-3">浏览分类</h2>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((category, index) => (
                  <button 
                    key={category.id} 
                    onClick={() => { setQuery(category.label); doSearch(category.label); }} 
                    className="relative overflow-hidden rounded-[20px] p-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-95"
                    style={{
                      background: `linear-gradient(135deg, ${CATEGORY_COLORS[category.id] || 'rgba(255,255,255,0.1)'} 0%, rgba(255,255,255,0.05) 100%)`,
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div className="text-3xl mb-2">{category.icon}</div>
                    <div className="text-sm font-semibold text-white">{category.label}</div>
                    <div className="text-[10px] text-white/50 mt-0.5">立即探索</div>
                    <div 
                      className="absolute -top-6 -right-6 w-16 h-16 rounded-full"
                      style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.1), transparent)' }}
                    />
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      <style>{`
        @keyframes search-aurora {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(20px, -15px) scale(1.05);
          }
          50% {
            transform: translate(-15px, 12px) scale(0.97);
          }
          75% {
            transform: translate(15px, -8px) scale(1.02);
          }
        }
        
        @keyframes search-suggestions {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-search-suggestions {
          animation: search-suggestions 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        
        @keyframes search-results {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-search-results {
          animation: search-results 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        
        @keyframes eq-bar-1 {
          0%, 100% { height: 8px; }
          50% { height: 16px; }
        }
        @keyframes eq-bar-2 {
          0%, 100% { height: 12px; }
          50% { height: 6px; }
        }
        @keyframes eq-bar-3 {
          0%, 100% { height: 10px; }
          50% { height: 18px; }
        }
        .animate-eq-bar-1 {
          animation: eq-bar-1 0.8s ease-in-out infinite;
        }
        .animate-eq-bar-2 {
          animation: eq-bar-2 1s ease-in-out infinite;
        }
        .animate-eq-bar-3 {
          animation: eq-bar-3 0.7s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
