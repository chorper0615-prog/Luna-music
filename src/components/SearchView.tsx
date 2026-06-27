import { useRef, useState, useEffect } from 'react';
import { searchMusic } from '../api/musicApi';
import { CATEGORIES, HOT_SEARCHES } from '../data/defaultTracks';
import { Track } from '../types/music';
import AlbumArt from './AlbumArt';

interface Props {
  currentTrack: Track | null;
  onPlay: (track: Track, queue: Track[], index: number) => void;
}

export default function SearchView({ currentTrack, onPlay }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  const doSearch = async (keyword: string) => {
    const q = keyword.trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const tracks = await searchMusic(q);
      setResults(tracks);
      if (tracks.length === 0) setError('没有找到可播放的结果，换个关键词试试');
    } catch (e) {
      setResults([]);
      setError(e instanceof Error ? e.message : '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  // 防抖实时搜索
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      setError('');
      return;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      doSearch(q);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar px-4 pb-4" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
      <div className="sticky top-0 z-10 -mx-4 px-4 pb-4 pt-3 backdrop-blur-xl">
        <div className="glass-ios flex items-center gap-3 rounded-[22px] px-4 py-3" style={{ border: '1px solid var(--glass-border)' }}>
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--text-secondary)' }}>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch(query)} placeholder="搜索歌曲、歌手、专辑" className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
          {query ? <button onClick={() => { setQuery(''); setResults([]); setSearched(false); inputRef.current?.focus(); }} className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>清除</button> : null}
          <button onClick={() => doSearch(query)} className="rounded-full px-5 py-2 text-xs font-semibold shrink-0 transition-all duration-200 active:scale-90" style={{ background: '#fff', color: '#000' }}>搜索</button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-2" style={{ borderColor: 'var(--glass-border)', borderTopColor: 'var(--text-primary)' }} />
        </div>
      ) : searched && results.length > 0 ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>搜索结果</h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{results.length} 首可播放歌曲</p>
            </div>
            <button onClick={() => onPlay(results[0], results, 0)} className="rounded-full px-5 py-2 text-xs font-semibold transition-all duration-200 active:scale-90" style={{ background: '#fff', color: '#000' }}>全部播放</button>
          </div>

          <div className="space-y-2 animate-stagger">
            {results.map((track, index) => {
              const active = currentTrack?.id === track.id;
              return (
                <button key={track.id} onClick={() => onPlay(track, results, index)} className="flex w-full items-center gap-3 rounded-[22px] p-3 text-left transition-all duration-300 hover:translate-x-1 active:scale-[0.98]" style={{ background: active ? 'var(--surface-glass)' : 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                  <div className="h-14 w-14 overflow-hidden rounded-2xl shrink-0">
                    <AlbumArt track={track} isPlaying={active} size="md" className="h-14 w-14 rounded-2xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{track.title}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{track.artist}</p>
                  </div>
                  {active ? (
                    <div className="flex items-end gap-[3px]">
                      <span className="eq-bar-1 w-[3px] rounded-full" style={{ background: 'var(--text-primary)', height: 10 }} />
                      <span className="eq-bar-2 w-[3px] rounded-full" style={{ background: 'var(--text-primary)', height: 16 }} />
                      <span className="eq-bar-3 w-[3px] rounded-full" style={{ background: 'var(--text-primary)', height: 12 }} />
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>播放</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : error ? (
        <div className="mt-12 rounded-[26px] p-5 text-center text-sm glass-ios" style={{ color: 'var(--text-secondary)' }}>{error}</div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>热门分类</h2>
            <div className="grid grid-cols-2 gap-3 animate-stagger">
              {CATEGORIES.map((category) => (
                <button key={category.id} onClick={() => { setQuery(category.label); doSearch(category.label); }} className="glass-ios relative overflow-hidden rounded-[24px] p-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-95">
                  <div className="text-2xl mb-1">{category.icon}</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{category.label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>探索音乐</div>
                  <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-[0.15] bg-gradient-to-br from-white to-transparent" />
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>热门搜索</h2>
            <div className="flex flex-wrap gap-2 animate-stagger">
              {HOT_SEARCHES.map((term) => (
                <button key={term} onClick={() => { setQuery(term); doSearch(term); }} className="glass-ios rounded-full px-4 py-2 text-sm transition-all duration-200 hover:scale-105 active:scale-95" style={{ color: 'var(--text-primary)' }}>{term}</button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
