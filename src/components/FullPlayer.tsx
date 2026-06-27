 import { useState, useEffect, useRef } from 'react';
import { PlayerState, RepeatMode, Track } from '../types/music';
import AlbumArt from './AlbumArt';
import ProgressBar from './ProgressBar';
 
 interface Props {
   track: Track | null;
   queue: Track[];
   playerState: PlayerState;
   currentTime: number;
   duration: number;
   volume: number;
   isMuted: boolean;
   repeatMode: RepeatMode;
   isShuffled: boolean;
   isOpen: boolean;
   onClose: () => void;
   onTogglePlay: () => void;
   onNext: () => void;
   onPrev: () => void;
   onSeek: (t: number) => void;
   onVolumeChange: (v: number) => void;
   onToggleMute: () => void;
   onToggleRepeat: () => void;
   onToggleShuffle: () => void;
   onTrackSelect: (track: Track) => void;
 }
 
 function formatTime(value: number) {
   if (!value || Number.isNaN(value)) return '0:00';
   const minutes = Math.floor(value / 60);
   const seconds = Math.floor(value % 60).toString().padStart(2, '0');
   return `${minutes}:${seconds}`;
 }
 
 function parseLRC(lrcText: string): { time: number; text: string }[] {
  const lines = lrcText.split("\n");
  const result: { time: number; text: string }[] = [];
  const timeRegex = /\[(\d+):(\d+\.?\d*)\]/g;
  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)];
    const text = line.replace(/\[\d+:\d+\.?\d*\]/g, "").trim();
    if (matches.length > 0 && text) {
      for (const match of matches) {
        const minutes = parseInt(match[1]);
        const seconds = parseFloat(match[2]);
        const time = minutes * 60 + seconds;
        result.push({ time, text });
      }
    }
  }
  result.sort((a, b) => a.time - b.time);
  return result;
}

function findCurrentLyricIndex(lyrics: { time: number; text: string }[], currentTime: number): number {
  if (lyrics.length === 0) return 0;
  let left = 0;
  let right = lyrics.length - 1;
  let result = 0;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (lyrics[mid].time <= currentTime) {
      result = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return result;
}

export default function FullPlayer({
   track,
   queue,
   playerState,
   currentTime,
   duration,
   volume,
   isMuted,
   repeatMode,
   isShuffled,
   isOpen,
   onClose,
   onTogglePlay,
   onNext,
   onPrev,
   onSeek,
   onVolumeChange,
   onToggleMute,
   onToggleRepeat,
   onToggleShuffle,
   onTrackSelect,
 }: Props) {
   const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const isPlaying = playerState === 'playing';
  const [lyrics, setLyrics] = useState<{ time: number; text: string }[]>([]);
  const lyricsScrollRef = useRef<HTMLDivElement>(null);
  const currentLyricIndex = findCurrentLyricIndex(lyrics, currentTime);

  useEffect(() => {
    if (!showLyrics || !lyricsScrollRef.current || lyrics.length === 0) return;
    const container = lyricsScrollRef.current;
    const activeEl = container.querySelector('.lyric-line-active');
    if (activeEl) {
      const containerHeight = container.clientHeight;
      const activeTop = (activeEl as HTMLElement).offsetTop;
      const activeHeight = (activeEl as HTMLElement).offsetHeight;
      const targetScroll = activeTop - containerHeight / 2 + activeHeight / 2;
      container.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }, [currentLyricIndex, showLyrics, lyrics.length]);

  useEffect(() => {
    async function fetchLRC() {
      if (!track?.id) { setLyrics([]); return; }
      try {
        var resp = await fetch("/api/lyric?id=" + encodeURIComponent(track.id));
        var data = await resp.json();
        if (data.status && data.data) setLyrics(parseLRC(data.data));
        else { setLyrics([]); }
      } catch(e) { setLyrics([]); }
    }
    fetchLRC();
  }, [track?.id]);
 
   if (!isOpen) return null;
 
   return (
     <div className="fixed inset-0 z-50 animate-slide-up">
       <div className="absolute inset-0 bg-black/68" onClick={onClose} />

       <div 
         className="absolute inset-x-0 bottom-0 top-[8vh] overflow-hidden rounded-t-[34px] border border-white/10 bg-[rgba(12,12,16,0.82)] backdrop-blur-3xl"
         style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
       >
         <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-white/25" />
 
         <div className="flex items-center justify-between px-5 pb-3 pt-3">
          <button onClick={onClose} className="rounded-full px-3 py-2 text-sm btn-press" style={{background:'var(--glass-bg)',border:'1px solid var(--glass-border)',color:'var(--text-secondary)'}}>
            收起
          </button>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setShowLyrics(false); setShowQueue(false); }} className="rounded-full px-3 py-2 text-xs font-semibold btn-press" style={{background:(!showLyrics&&!showQueue)?'var(--surface-glass)':'var(--glass-bg)',border:'1px solid var(--glass-border)',color:'var(--text-primary)'}}>
              播放
            </button>
            
            <button onClick={() => { setShowQueue(true); setShowLyrics(false); }} className="rounded-full px-3 py-2 text-xs font-semibold btn-press" style={{background:showQueue?'var(--surface-glass)':'var(--glass-bg)',border:'1px solid var(--glass-border)',color:'var(--text-primary)'}}>
              队列
            </button>
              </div>
            </div>
          {showLyrics ? (
            <div key="lyrics-view" className="relative h-[calc(100%-72px)] overflow-hidden animate-view-lyrics">
              <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
              </div>

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex-shrink-0 px-6 pt-6 pb-4 text-center">
                  <h2 className="text-xl font-semibold text-white truncate">{track?.title || '未在播放'}</h2>
                  <p className="mt-1 text-sm text-white/60 truncate">{track?.artist || '请选择一首歌开始播放'}</p>
                </div>

                <div className="flex-1 relative overflow-hidden px-6">
                  <div className="absolute inset-0 pointer-events-none z-20" style={{
                    maskImage: 'linear-gradient(180deg, transparent 0%, black 12%, black 88%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 12%, black 88%, transparent 100%)',
                  }} />

                  <div
                    ref={lyricsScrollRef}
                    className="relative w-full h-full overflow-y-auto no-scrollbar"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.tagName === 'P' && target.classList.contains('cursor-pointer')) {
                        return;
                      }
                      setShowLyrics(false);
                    }}
                  >
                    <div className="py-[50vh] flex flex-col gap-5">
                      {lyrics.length === 0 ? (
                        <div className="text-center text-white/40 text-base py-20">
                          暂无歌词
                        </div>
                      ) : (
                        lyrics.map((line, i) => {
                          const isActive = i === currentLyricIndex;
                          const isPassed = i < currentLyricIndex;
                          return (
                            <p
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSeek(line.time);
                              }}
                              className={`text-center cursor-pointer transition-all duration-300 ease-out ${
                                isActive
                                  ? 'lyric-line-active text-white text-2xl font-semibold scale-100 opacity-100'
                                  : isPassed
                                  ? 'text-white/25 text-lg scale-95 opacity-60'
                                  : 'text-white/45 text-lg scale-95 opacity-70'
                              }`}
                              style={{
                                lineHeight: '1.8',
                                transform: isActive ? 'scale(1)' : isPassed ? 'scale(0.95)' : 'scale(0.95)',
                              }}
                            >
                              {line.text}
                            </p>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 px-6 py-4">
                  <div className="mb-1 flex justify-between text-xs text-white/45">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <ProgressBar
                    value={currentTime}
                    max={duration || 0}
                    onChange={onSeek}
                    height={4}
                    thumbSize={14}
                  />

                  <div className="mt-5 flex items-center justify-center gap-8">
                    <button onClick={onToggleShuffle} className={`btn-press w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 ${isShuffled ? 'text-white' : 'text-white/50'}`}
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1)',
                      }}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
                      </svg>
                    </button>
                    <button onClick={onPrev} className="btn-press w-12 h-12 rounded-full flex items-center justify-center text-white/90 transition-all duration-150 active:scale-90"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1)',
                      }}
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                      </svg>
                    </button>
                    <button
                      onClick={onTogglePlay}
                      className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)',
                        backdropFilter: 'blur(15px)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.1)',
                      }}
                    >
                      {playerState === 'loading' ? (
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      ) : isPlaying ? (
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                      ) : (
                        <svg className="w-7 h-7 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      )}
                    </button>
                    <button onClick={onNext} className="btn-press w-12 h-12 rounded-full flex items-center justify-center text-white/90 transition-all duration-150 active:scale-90"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1)',
                      }}
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                      </svg>
                    </button>
                    <button onClick={onToggleRepeat} className={`btn-press w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 ${repeatMode !== 'none' ? 'text-white' : 'text-white/50'}`}
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1)',
                      }}
                    >
                      {repeatMode === 'one' ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <button onClick={() => { setShowLyrics(false); setShowQueue(false); }} className="btn-press text-white/60 text-sm flex items-center gap-1.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      封面
                    </button>
                    <button className="btn-press text-white/60">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    <button onClick={() => { setShowQueue(true); setShowLyrics(false); }} className="btn-press text-white/60 text-sm flex items-center gap-1.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      队列
                    </button>
                  </div>
                </div>
              </div>
            </div>
                    ) : showQueue ? (
           <div key="queue-view" className="h-[calc(100%-72px)] overflow-y-auto no-scrollbar px-4 pb-6 animate-view-queue">
             <h3 className="mb-3 text-xl font-semibold text-white">播放队列</h3>
             <div className="space-y-2">
               {queue.map((item) => {
                 const active = item.id === track?.id;
                 return (
                   <button
                     key={item.id}
                     onClick={() => onTrackSelect(item)}
                     className={`flex w-full items-center gap-3 rounded-[22px] border p-3 text-left ${active ? 'border-white/20 bg-white/10' : 'border-white/8 bg-white/6'}`}
                   >
                     <div className="h-12 w-12 overflow-hidden rounded-2xl">
                       <AlbumArt track={item} isPlaying={active && isPlaying} size="md" className="h-12 w-12 rounded-2xl" />
                     </div>
                     <div className="min-w-0 flex-1">
                       <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                       <p className="truncate text-xs text-white/55">{item.artist}</p>
                     </div>
                   </button>
                 );
               })}
             </div>
           </div>
         ) : (
           <div key="cover-view" className="h-[calc(100%-72px)] overflow-y-auto no-scrollbar px-5 pb-6 animate-view-cover">
             <div className="flex flex-col items-center">
               {/* Album Art with Vinyl Record Effect */}
               <div className="relative w-full max-w-[340px] pt-4">
                 {/* Vinyl record behind album art */}
                 <div className={`absolute inset-0 rounded-full ${track && (playerState === 'playing' || playerState === 'paused') ? 'vinyl-spin' : ''} ${track && playerState === 'paused' ? 'vinyl-paused' : ''}`}>
                   <div className="h-full w-full rounded-full" style={{
                     background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a, #1a1a1a)',
                     boxShadow: '0 8px 40px rgba(0,0,0,0.6)'
                   }} />
                   <div className="absolute inset-[18%] rounded-full bg-[#333]" />
                   <div className="absolute inset-[32%] rounded-full bg-[#444]" />
                   <div className="absolute inset-[43%] rounded-full bg-[#111]" />
                 </div>
                 {/* Album art */}
                 <div className="relative z-10 mx-auto w-[85%] overflow-hidden rounded-[32px] border border-white/10 bg-white/8 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.36)] cursor-pointer active:scale-95 transition-transform duration-300" onClick={() => { setShowLyrics(true); setShowQueue(false); }}>
                   <AlbumArt track={track} isPlaying={isPlaying} size="lg" className="aspect-square w-full rounded-[26px]" />
                 </div>
               </div>
 
               <div className="mt-6 w-full">
                 <div className="flex items-start justify-between gap-4">
                   <div className="min-w-0 flex-1">
                     <h2 className="truncate text-2xl font-semibold text-white">{track?.title || '未在播放'}</h2>
                     <p className="mt-1 truncate text-sm text-white/60">{track?.artist || '请选择一首歌开始播放'}</p>
                   </div>
                   <button onClick={onToggleMute} className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs text-white/75">
                     {isMuted || volume === 0 ? '静音' : '音量'}
                   </button>
                 </div>
 
                 <div className="mt-5">
                   <div className="mb-1 flex justify-between text-xs text-white/45">
                     <span>{formatTime(currentTime)}</span>
                     <span>{formatTime(duration)}</span>
                   </div>
                   <ProgressBar
                     value={currentTime}
                     max={duration || 0}
                     onChange={onSeek}
                     height={3}
                     thumbSize={12}
                     progressColor="linear-gradient(90deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))"
                   />
                 </div>
 
                 <div className="mt-6 flex items-center justify-center gap-5">
                   <button onClick={onToggleShuffle} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 ${isShuffled ? 'text-white' : 'text-white/50'}`}
                     style={{
                       background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
                       backdropFilter: 'blur(10px)',
                       border: '1px solid rgba(255,255,255,0.1)',
                       boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1)',
                     }}
                   >
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
                     </svg>
                   </button>
                   <button onClick={onPrev} className="w-12 h-12 rounded-full flex items-center justify-center text-white/90 transition-all duration-150 active:scale-90"
                     style={{
                       background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
                       backdropFilter: 'blur(10px)',
                       border: '1px solid rgba(255,255,255,0.1)',
                       boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1)',
                     }}
                   >
                     <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                     </svg>
                   </button>
                   <button
                     onClick={onTogglePlay}
                     className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                     style={{
                       background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)',
                       backdropFilter: 'blur(15px)',
                       border: '1px solid rgba(255,255,255,0.15)',
                       boxShadow: '0 6px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.1)',
                     }}
                   >
                     {playerState === 'loading' ? (
                       <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                     ) : isPlaying ? (
                       <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                         <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                       </svg>
                     ) : (
                       <svg className="w-7 h-7 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                         <path d="M8 5v14l11-7z"/>
                       </svg>
                     )}
                   </button>
                   <button onClick={onNext} className="w-12 h-12 rounded-full flex items-center justify-center text-white/90 transition-all duration-150 active:scale-90"
                     style={{
                       background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
                       backdropFilter: 'blur(10px)',
                       border: '1px solid rgba(255,255,255,0.1)',
                       boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1)',
                     }}
                   >
                     <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                     </svg>
                   </button>
                   <button onClick={onToggleRepeat} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 ${repeatMode !== 'none' ? 'text-white' : 'text-white/50'}`}
                     style={{
                       background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
                       backdropFilter: 'blur(10px)',
                       border: '1px solid rgba(255,255,255,0.1)',
                       boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1)',
                     }}
                   >
                     {repeatMode === 'one' ? (
                       <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                         <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
                       </svg>
                     ) : (
                       <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                         <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                       </svg>
                     )}
                   </button>
                 </div>
 
                 <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                   <div className="mb-3 flex items-center justify-between text-xs text-white/55">
                     <span>音量</span>
                     <span>{Math.round((isMuted ? 0 : volume) * 100)}%</span>
                   </div>
                   <input
                     type="range"
                     min={0}
                     max={1}
                     step={0.01}
                     value={isMuted ? 0 : volume}
                     onChange={(e) => onVolumeChange(Number(e.target.value))}
                     className="volume-bar"
                   />
                 </div>
               </div>
             </div>
           </div>
         )}
       </div>
     </div>
   );
 }
