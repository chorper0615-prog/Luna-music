 import { useState, useEffect, useRef } from 'react';
import { PlayerState, RepeatMode, Track } from '../types/music';
import { apiGet } from '../utils/neteaseAuth';
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
   isFavorite: boolean;
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
   onToggleFavorite: (track: Track) => void;
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
   isFavorite,
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
   onToggleFavorite,
 }: Props) {
   const [showQueue, setShowQueue] = useState(false);
   const [showLyrics, setShowLyrics] = useState(false);
   const [headerVisible, setHeaderVisible] = useState(true);
   const [isExiting, setIsExiting] = useState(false);
   const isPlaying = playerState === 'playing';
   const [lyrics, setLyrics] = useState<{ time: number; text: string }[]>([]);
   const lyricsScrollRef = useRef<HTMLDivElement>(null);
   const queueScrollRef = useRef<HTMLDivElement>(null);
   const lastScrollY = useRef(0);
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
        const data = await apiGet('/api/lyric', { id: track.id });
        if (data.status && data.data) setLyrics(parseLRC(data.data));
        else { setLyrics([]); }
      } catch(e) { setLyrics([]); }
    }
    fetchLRC();
  }, [track?.id]);

  // 切换视图时重置顶部按钮可见性
  useEffect(() => {
    setHeaderVisible(true);
    lastScrollY.current = 0;
  }, [showQueue, showLyrics]);

  // 队列滚动时隐藏/显示顶部按钮
  const handleQueueScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!showQueue) return;
    const scrollTop = (e.target as HTMLDivElement).scrollTop;
    const delta = scrollTop - lastScrollY.current;
    
    if (delta > 10 && headerVisible) {
      setHeaderVisible(false);
    } else if (delta < -10 && !headerVisible) {
      setHeaderVisible(true);
    }
    lastScrollY.current = scrollTop;
  };

  const handleQueueTouchStart = () => {
    lastScrollY.current = 0;
  };
 
   if (!isOpen) return null;

  // 处理关闭 - 带退出动画
  const handleClose = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onClose();
      setIsExiting(false);
    }, 300);
  };

  return (
    <div 
      className={`fixed inset-0 z-50 ${isExiting ? 'animate-slide-down' : 'animate-slide-up'}`} 
      onClick={handleClose}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* 主内容容器 - 带退出动画 */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 液态玻璃背景层 */}
        {track?.cover && (
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse at 50% 40%, ${track.color || '#667eea'}25 0%, transparent 60%),
                radial-gradient(ellipse at 30% 70%, ${track.color || '#667eea'}15 0%, transparent 50%),
                radial-gradient(ellipse at 70% 60%, ${track.color || '#667eea'}15 0%, transparent 50%),
                rgba(10, 10, 15, 0.85)
              `,
              backdropFilter: 'blur(60px) saturate(150%)',
              WebkitBackdropFilter: 'blur(60px) saturate(150%)',
            }}
          />
        )}

        {/* 关闭按钮 - 固定显示 */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 z-50 rounded-full p-2 btn-press transition-all duration-300"
          style={{
            background:'rgba(255,255,255,0.1)',
            border:'1px solid rgba(255,255,255,0.15)',
            opacity: headerVisible || showLyrics || (!showQueue) ? 1 : 0,
            transform: headerVisible || showLyrics || (!showQueue) ? 'translateY(0)' : 'translateY(-20px)',
          }}
        >
          <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        {/* 顶部标签切换 - 滚动时隐藏 */}
         {!showLyrics && (
           <div 
             className="absolute left-[67%] top-5 -translate-x-1/2 z-50 flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 transition-all duration-300"
             style={{
               background:'rgba(255,255,255,0.08)',
               border:'1px solid rgba(255,255,255,0.1)',
               opacity: headerVisible || !showQueue ? 1 : 0,
               transform: headerVisible || !showQueue ? 'translateX(-50%) translateY(-2px)' : 'translateX(-50%) translateY(-22px)',
             }}
           >
             <button onClick={() => { setShowLyrics(false); setShowQueue(false); }} className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold btn-press transition-all" style={{background:(!showLyrics&&!showQueue)?'rgba(255,255,255,0.2)':'transparent',color:'var(--text-primary)'}}>
               播放
             </button>
             <button onClick={() => { setShowQueue(true); setShowLyrics(false); }} className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold btn-press transition-all" style={{background:showQueue?'rgba(255,255,255,0.2)':'transparent',color:'var(--text-primary)'}}>
               队列
             </button>
           </div>
         )}

         {showLyrics ? (
           // 歌词界面 - 全屏沉浸，不显示顶部按钮
           <div key="lyrics-view" className="absolute inset-0 flex flex-col animate-view-lyrics pt-5">
             {/* 歌曲信息 */}
             <div className="flex-shrink-0 px-6 pt-2 pb-2 text-center">
               <h2 className="text-base font-semibold text-white truncate">{track?.title || '未在播放'}</h2>
               <p className="mt-0.5 text-xs text-white/50 truncate">{track?.artist || '请选择一首歌开始播放'}</p>
             </div>

             {/* 歌词区域 */}
             <div 
               className="flex-1 relative overflow-hidden px-6"
               onClick={() => setShowLyrics(false)}
             >
               <div className="absolute inset-0 pointer-events-none z-20" style={{
                 maskImage: 'linear-gradient(180deg, transparent 0%, black 6%, black 94%, transparent 100%)',
                 WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 6%, black 94%, transparent 100%)',
               }} />

               <div
                 ref={lyricsScrollRef}
                 className="relative w-full h-full overflow-y-auto no-scrollbar"
               >
                 <div className="py-[30vh] flex flex-col gap-4">
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
                           className={`text-center transition-all duration-300 ${
                             isActive
                               ? 'lyric-line-active text-white text-xl font-semibold opacity-100'
                               : isPassed
                               ? 'text-white/30 text-base opacity-60'
                               : 'text-white/40 text-base opacity-70'
                           }`}
                           style={{ lineHeight: '1.7' }}
                         >
                           <span
                             onClick={(e) => { e.stopPropagation(); onSeek(line.time); }}
                             className="cursor-pointer inline-block"
                           >
                             {line.text}
                           </span>
                         </p>
                       );
                     })
                   )}
                 </div>
               </div>
             </div>

             {/* 底部控制栏 */}
             <div className="flex-shrink-0 px-6 pb-8 pt-3">
               <div className="mb-2 flex justify-between text-xs text-white/45">
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

               {/* 收藏按钮行 */}
               <div className="mt-4 flex justify-center">
                 <button 
                   onClick={() => track && onToggleFavorite(track)} 
                   className="btn-press flex items-center gap-2 px-5 py-2 rounded-full transition-all duration-200 active:scale-90"
                   style={{
                     background: isFavorite 
                       ? 'linear-gradient(135deg, rgba(255,107,129,0.25) 0%, rgba(255,107,129,0.1) 100%)'
                       : 'rgba(255,255,255,0.08)',
                     backdropFilter: 'blur(12px)',
                     border: isFavorite 
                       ? '1px solid rgba(255,107,129,0.4)'
                       : '1px solid rgba(255,255,255,0.12)',
                   }}
                 >
                   <svg 
                     className="w-5 h-5 transition-all duration-300" 
                     fill={isFavorite ? '#ff6b81' : 'none'} 
                     stroke={isFavorite ? '#ff6b81' : 'rgba(255,255,255,0.6)'} 
                     viewBox="0 0 24 24"
                     strokeWidth="2"
                   >
                     <path 
                       strokeLinecap="round" 
                       strokeLinejoin="round" 
                       d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                     />
                   </svg>
                   <span 
                     className="text-xs font-medium"
                     style={{ color: isFavorite ? '#ff6b81' : 'rgba(255,255,255,0.6)' }}
                   >
                     {isFavorite ? '已收藏' : '收藏'}
                   </span>
                 </button>
               </div>

               <div className="mt-6 flex items-center justify-center gap-10">
                 <button onClick={onToggleShuffle} className={`btn-press w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 ${isShuffled ? 'text-white' : 'text-white/50'}`}
                   style={{background:'rgba(255,255,255,0.1)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.15)'}}>
                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
                   </svg>
                 </button>
                 <button onClick={onPrev} className="btn-press w-12 h-12 rounded-full flex items-center justify-center text-white/80 transition-all duration-150 active:scale-90"
                   style={{background:'rgba(255,255,255,0.1)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.15)'}}>
                   <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                   </svg>
                 </button>
                 <button onClick={onTogglePlay} className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                   style={{background:'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.1) 100%)',backdropFilter:'blur(16px)',border:'1px solid rgba(255,255,255,0.2)',boxShadow:'0 6px 24px rgba(0,0,0,0.4)'}}>
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
                 <button onClick={onNext} className="btn-press w-12 h-12 rounded-full flex items-center justify-center text-white/80 transition-all duration-150 active:scale-90"
                   style={{background:'rgba(255,255,255,0.1)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.15)'}}>
                   <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                   </svg>
                 </button>
                 <button onClick={onToggleRepeat} className={`btn-press w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 ${repeatMode !== 'none' ? 'text-white' : 'text-white/50'}`}
                   style={{background:'rgba(255,255,255,0.1)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.15)'}}>
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
             </div>
           </div>
         ) : showQueue ? (
           // 队列界面 - 滚动时隐藏顶部按钮
           <div 
             key="queue-view" 
             ref={queueScrollRef}
             onScroll={handleQueueScroll}
             onTouchStart={handleQueueTouchStart}
             className="h-full overflow-y-auto no-scrollbar px-4 pt-24 pb-8 animate-view-queue"
           >
             <h3 
               className="mb-4 text-xl font-semibold text-white sticky top-0 py-2 z-30 transition-all duration-300"
               style={{
                 opacity: headerVisible ? 1 : 0,
                 transform: headerVisible ? 'translateY(0)' : 'translateY(-20px)',
                 background: 'transparent',
               }}
             >
               播放队列
             </h3>
             <div className="space-y-2">
               {queue.map((item) => {
                 const active = item.id === track?.id;
                 return (
                   <button
                     key={item.id}
                     onClick={() => onTrackSelect(item)}
                     className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 ${active ? 'border-white/25 bg-white/12' : 'border-white/10 bg-white/8'}`}
                   >
                     <div className="h-12 w-12 overflow-hidden rounded-xl">
                       <AlbumArt track={item} isPlaying={active && isPlaying} size="md" className="h-12 w-12 rounded-xl" />
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
           // 播放/封面界面
           <div key="cover-view" className="h-full overflow-y-auto no-scrollbar px-5 pt-24 pb-8 animate-view-cover">
             <div className="flex flex-col items-center min-h-[calc(100%-40px)] pt-4">
               {/* 立体高级封面效果 */}
               <div className="relative w-full max-w-[300px] pt-4" style={{ perspective: '1000px' }}>
                 {/* 封面立体阴影 */}
                 <div 
                   className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[85%] h-8 rounded-full"
                   style={{
                     background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, transparent 70%)',
                     filter: 'blur(12px)',
                   }}
                 />

                 {/* 封面外边框 - 金属质感 */}
                 <div
                   className="relative mx-auto w-full overflow-hidden rounded-[28px] cursor-pointer active:scale-95 transition-transform duration-300"
                   style={{
                     boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.3)',
                     transform: 'rotateX(2deg)',
                     transformStyle: 'preserve-3d',
                   }}
                   onClick={() => { setShowLyrics(true); setShowQueue(false); setHeaderVisible(false); }}
                 >
                   {/* 外边框高光 */}
                   <div
                     className="absolute -inset-[2px] rounded-[26px] z-[-1]"
                     style={{
                       background: 'linear-gradient(145deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 30%, rgba(0,0,0,0.1) 70%, rgba(255,255,255,0.1) 100%)',
                     }}
                   />

                   {/* 封面图片 */}
                   <AlbumArt track={track} isPlaying={isPlaying} size="lg" className="aspect-square w-full rounded-[26px] relative z-0" />
                   
                   {/* 顶部高光 */}
                   <div 
                     className="absolute top-0 left-0 right-0 h-1/2 z-10 pointer-events-none rounded-t-[26px]"
                     style={{
                       background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.02) 60%, transparent 100%)',
                     }}
                   />

                   {/* 底部暗部 */}
                   <div 
                     className="absolute bottom-0 left-0 right-0 h-1/3 z-10 pointer-events-none rounded-b-[26px]"
                     style={{
                       background: 'linear-gradient(0deg, rgba(0,0,0,0.2) 0%, transparent 100%)',
                     }}
                   />

                   {/* 斜向高光条 */}
                   <div 
                     className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-[26px]"
                     style={{
                       background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 35%)',
                     }}
                   />
                 </div>

                 {/* 底部厚度感 */}
                 <div 
                   className="mx-auto w-[92%] h-[6px] rounded-b-2xl"
                   style={{
                     background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 100%)',
                   }}
                 />
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

                 <div className="mt-4">
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
                     progressColor="linear-gradient(90deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))"
                   />
                 </div>

                 <div className="mt-6 flex items-center justify-center gap-10">
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

                 <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
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
