 import { useState, useEffect } from 'react';
 import { Track } from '../types/music';
 import AlbumArt from './AlbumArt';
 
 interface Props {
   currentTrack: Track | null;
   isPlaying: boolean;
   onPlay: (track: Track, queue: Track[], index: number) => void;
 }
 
 const STORAGE_KEY = 'luna_play_history';
 
 function loadHistory(): Track[] {
   try {
     const raw = localStorage.getItem(STORAGE_KEY);
     return raw ? JSON.parse(raw) : [];
   } catch {
     return [];
   }
 }
 
 function getGreeting(): string {
   const hour = new Date().getHours();
   if (hour < 6) return '夜深了';
   if (hour < 9) return '早上好';
   if (hour < 12) return '上午好';
   if (hour < 14) return '中午好';
   if (hour < 18) return '下午好';
   return '晚上好';
 }
 
 export default function LibraryView({ currentTrack, isPlaying, onPlay }: Props) {
   const [history, setHistory] = useState<Track[]>(loadHistory);
   const [activeSection, setActiveSection] = useState<'recent' | 'playlists'>('recent');
 
   useEffect(() => {
     const onStorage = () => setHistory(loadHistory());
     window.addEventListener('storage', onStorage);
     return () => window.removeEventListener('storage', onStorage);
   }, []);
 
   // Refresh history periodically
   useEffect(() => {
     const id = setInterval(() => setHistory(loadHistory()), 2000);
     return () => clearInterval(id);
   }, []);
 
   return (
    <div className="w-full h-full overflow-y-auto no-scrollbar px-4 pb-4 pt-[env(safe-area-inset-top)]" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
       {/* Header */}
       <div className="flex items-center justify-between pt-3">
         <div>
           <p className="text-white/55 text-[11px] tracking-[0.32em] uppercase">Library</p>
           <h1 className="mt-1 text-3xl font-semibold text-white">{getGreeting()}</h1>
         </div>
         <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/10 backdrop-blur-xl">
           <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
             <circle cx="12" cy="12" r="10" />
             <path d="M12 8v8M8 12h8" strokeLinecap="round" />
           </svg>
         </div>
       </div>
 
       {/* Section Toggle */}
       <div className="mt-5 flex gap-2 rounded-[22px] border border-white/10 bg-white/8 p-1.5 backdrop-blur-xl">
         <button
           onClick={() => setActiveSection('recent')}
           className={`flex-1 rounded-[18px] px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
             activeSection === 'recent' ? 'bg-white text-black shadow-lg' : 'text-white/60'
           }`}
         >
           最近播放
         </button>
         <button
           onClick={() => setActiveSection('playlists')}
           className={`flex-1 rounded-[18px] px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
             activeSection === 'playlists' ? 'bg-white text-black shadow-lg' : 'text-white/60'
           }`}
         >
           歌单
         </button>
       </div>
 
       {activeSection === 'recent' ? (
         history.length > 0 ? (
           <div className="mt-5 space-y-2">
             <div className="flex items-center justify-between mb-2">
               <h2 className="text-lg font-semibold text-white">播放历史</h2>
               <button
                 onClick={() => {
                   localStorage.removeItem(STORAGE_KEY);
                   setHistory([]);
                 }}
                 className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs text-white/60"
               >
                 清除
               </button>
             </div>
             {history.map((track, index) => {
               const active = currentTrack?.id === track.id;
               return (
                 <button
                   key={`${track.id}-${index}`}
                   onClick={() => onPlay(track, history, index)}
                   className={`flex w-full items-center gap-3 rounded-[22px] border p-3 text-left transition-all duration-300 ${
                     active ? 'border-white/20 bg-white/10' : 'border-white/8 bg-white/6 hover:bg-white/10'
                   }`}
                 >
                   <div className="relative h-14 w-14 overflow-hidden rounded-2xl">
                     <AlbumArt track={track} isPlaying={active} size="md" className="h-14 w-14 rounded-2xl" />
                   </div>
                   <div className="min-w-0 flex-1">
                     <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                     <p className="truncate text-xs text-white/55">{track.artist}</p>
                   </div>
                   {active && isPlaying ? (
                     <div className="flex items-end gap-[3px]">
                       <span className="eq-bar-1 w-[3px] rounded-full bg-white" style={{ height: 10 }} />
                       <span className="eq-bar-2 w-[3px] rounded-full bg-white" style={{ height: 16 }} />
                       <span className="eq-bar-3 w-[3px] rounded-full bg-white" style={{ height: 12 }} />
                     </div>
                   ) : (
                     <svg className="h-4 w-4 text-white/40" viewBox="0 0 24 24" fill="currentColor">
                       <path d="M8 5v14l11-7z" />
                     </svg>
                   )}
                 </button>
               );
             })}
           </div>
         ) : (
           <div className="mt-12 flex flex-col items-center text-center">
             <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/10 bg-white/8 backdrop-blur-xl">
               <svg className="h-9 w-9 text-white/40" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
               </svg>
             </div>
             <p className="text-lg font-semibold text-white">还没有播放记录</p>
             <p className="mt-1 text-sm text-white/55">去首页或搜索听一首歌吧</p>
           </div>
         )
       ) : (
         <div className="mt-5">
           <h2 className="mb-4 text-lg font-semibold text-white">我的歌单</h2>
           <div className="grid grid-cols-2 gap-3">
             {[
               { label: '我喜欢的', icon: '♥', color: 'from-pink-500 to-rose-600', count: '0 首' },
               { label: '最近添加', icon: '♪', color: 'from-violet-500 to-indigo-600', count: '0 首' },
               { label: '私人收藏', icon: '★', color: 'from-amber-500 to-orange-600', count: '0 首' },
               { label: '智能推荐', icon: '✦', color: 'from-emerald-500 to-teal-600', count: '动态更新' },
             ].map((playlist, i) => (
               <button
                 key={i}
                 className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/8 text-left transition-all duration-300 hover:bg-white/12"
               >
                 <div
                   className={`aspect-square bg-gradient-to-br ${playlist.color} flex items-center justify-center`}
                 >
                   <span className="text-5xl text-white/80 group-hover:scale-110 transition-transform duration-500">{playlist.icon}</span>
                 </div>
                 <div className="p-3">
                   <p className="truncate text-sm font-semibold text-white">{playlist.label}</p>
                   <p className="truncate text-xs text-white/55">{playlist.count}</p>
                 </div>
               </button>
             ))}
           </div>
         </div>
       )}
 
       {/* Now playing indicator */}
       {currentTrack && (
         <div className="mt-6 rounded-[22px] border border-white/10 bg-gradient-to-r from-white/10 to-white/5 p-4 backdrop-blur-xl">
           <div className="flex items-center gap-3">
             <div className="relative h-12 w-12 overflow-hidden rounded-xl">
               <AlbumArt track={currentTrack} isPlaying={isPlaying} size="md" className="h-12 w-12 rounded-xl" />
             </div>
             <div className="min-w-0 flex-1">
               <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">正在播放</p>
               <p className="truncate text-sm font-semibold text-white">{currentTrack.title}</p>
               <p className="truncate text-xs text-white/55">{currentTrack.artist}</p>
             </div>
             {isPlaying && (
               <div className="flex items-end gap-[3px]">
                 <span className="eq-bar-1 w-[3px] rounded-full bg-white" style={{ height: 8 }} />
                 <span className="eq-bar-2 w-[3px] rounded-full bg-white" style={{ height: 14 }} />
                 <span className="eq-bar-3 w-[3px] rounded-full bg-white" style={{ height: 10 }} />
               </div>
             )}
           </div>
         </div>
       )}
     </div>
   );
 }
