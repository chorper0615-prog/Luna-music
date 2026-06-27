import { useState, useRef, useCallback, useEffect } from 'react';
import { Track } from '../types/music';
import { RECOMMEND_KEYWORDS } from '../data/defaultTracks';
import { searchMusic } from '../api/musicApi';

interface Props {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlay: (track: Track, queue: Track[], index: number) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
}

type ViewState = 'nowPlaying' | 'menu' | 'albums' | 'songs' | 'shuffle';

interface MenuItem {
  label: string;
  icon: string;
  subLabel: string;
  view: ViewState;
}

export default function IpodMode({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onTogglePlay,
  onNext,
  onPrev,
  onExit,
}: Props) {
  const [view, setView] = useState<ViewState>('nowPlaying');
  const [menuItems] = useState<MenuItem[]>([
    { label: '正在播放', icon: '🎵', subLabel: 'Now Playing', view: 'nowPlaying' },
    { label: '专辑列表', icon: '💿', subLabel: 'Albums', view: 'albums' },
    { label: '歌曲', icon: '🎶', subLabel: 'Songs', view: 'songs' },
    { label: '随机播放', icon: '🔀', subLabel: 'Shuffle', view: 'shuffle' },
  ]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedSongIndex, setSelectedSongIndex] = useState(0);
  const [albums, setAlbums] = useState<Track[]>([]);
  const [songs, setSongs] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [isTouching, setIsTouching] = useState(false);

  const wheelRef = useRef<HTMLDivElement>(null);
  const lastAngleRef = useRef(0);
  const angleAccumulatorRef = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const buttonCooldownRef = useRef(false);
  const lastCenterPressRef = useRef(0);
  const isExitingRef = useRef(false);

  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const playClickSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  }, []);

  useEffect(() => {
    const loadAlbums = async () => {
      setIsLoading(true);
      const results = await Promise.all(
        RECOMMEND_KEYWORDS.map((item) => searchMusic(item.keyword))
      );
      const allSongs = results.flat().filter(Boolean) as Track[];
      setAlbums(allSongs.slice(0, 12));
      setSongs(allSongs);
      setIsLoading(false);
    };
    loadAlbums();
  }, []);

  const getCurrentMax = useCallback(() => {
    switch (view) {
      case 'menu': return menuItems.length;
      case 'albums': return albums.length;
      case 'songs': return songs.length;
      default: return 0;
    }
  }, [view, menuItems.length, albums.length, songs.length]);

  const getCurrentIndex = useCallback(() => {
    switch (view) {
      case 'menu': return selectedIndex;
      case 'albums': return selectedIndex;
      case 'songs': return selectedSongIndex;
      default: return 0;
    }
  }, [view, selectedIndex, selectedSongIndex]);

  const setCurrentIndex = useCallback((index: number) => {
    switch (view) {
      case 'menu':
      case 'albums':
        setSelectedIndex(index);
        break;
      case 'songs':
        setSelectedSongIndex(index);
        break;
    }
  }, [view]);

  const calculateAngle = useCallback((clientX: number, clientY: number) => {
    if (!wheelRef.current) return 0;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    return (angle + 90 + 360) % 360;
  }, []);

  const handleWheelTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsTouching(true);
    lastAngleRef.current = calculateAngle(e.touches[0].clientX, e.touches[0].clientY);
    angleAccumulatorRef.current = 0;
    vibrate(5);
    playClickSound();
  }, [calculateAngle, vibrate, playClickSound]);

  const handleWheelTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const currentAngle = calculateAngle(e.touches[0].clientX, e.touches[0].clientY);
    setWheelAngle(currentAngle);

    let delta = currentAngle - lastAngleRef.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    angleAccumulatorRef.current += delta;

    const minAnglePerStep = 180;
    const steps = Math.floor(Math.abs(angleAccumulatorRef.current) / minAnglePerStep);
    const max = getCurrentMax();

    if (steps >= 1 && max > 0) {
      const direction = Math.sign(angleAccumulatorRef.current);
      const currentIdx = getCurrentIndex();
      let newIdx = currentIdx;
      
      for (let i = 0; i < steps; i++) {
        newIdx = ((newIdx + direction) % max + max) % max;
      }
      
      setCurrentIndex(newIdx);
      vibrate(8);
      angleAccumulatorRef.current -= direction * steps * minAnglePerStep;
    }
    
    lastAngleRef.current = currentAngle;
  }, [calculateAngle, getCurrentMax, getCurrentIndex, setCurrentIndex, vibrate]);

  const handleWheelTouchEnd = useCallback(() => {
    setIsTouching(false);
    setWheelAngle(0);
    angleAccumulatorRef.current = 0;
  }, []);

  const scrollToSelected = useCallback(() => {
    if (contentRef.current && selectedItemRef.current) {
      const containerRect = contentRef.current.getBoundingClientRect();
      const itemRect = selectedItemRef.current.getBoundingClientRect();
      const offsetTop = itemRect.top - containerRect.top + contentRef.current.scrollTop;
      const scrollTarget = offsetTop - containerRect.height / 2 + itemRect.height / 2;
      contentRef.current.scrollTo({
        top: Math.max(0, scrollTarget),
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => {
    if (['menu', 'albums', 'songs'].includes(view)) {
      scrollToSelected();
    }
  }, [selectedIndex, selectedSongIndex, view, scrollToSelected]);

  const handleMenuPress = useCallback(() => {
    if (buttonCooldownRef.current) return;
    buttonCooldownRef.current = true;
    setTimeout(() => { buttonCooldownRef.current = false; }, 200);
    
    vibrate(15);
    playClickSound();
    
    if (view === 'nowPlaying') {
      setView('menu');
      setSelectedIndex(0);
    } else if (view !== 'menu') {
      setView('menu');
    }
  }, [view, vibrate, playClickSound]);

  const handleCenterPress = useCallback(() => {
    const now = Date.now();
    const timeSinceLastPress = now - lastCenterPressRef.current;
    
    // 如果正在退出动画中，直接返回
    if (isExitingRef.current) return;
    
    // 双击返回首页（在任何非nowPlaying视图时）
    if (timeSinceLastPress < 500 && lastCenterPressRef.current > 0) {
      // 双击检测成功
      isExitingRef.current = true;
      vibrate(25);
      playClickSound();
      
      // 退出动画
      if (contentRef.current) {
        contentRef.current.style.transform = 'scale(0.8)';
        contentRef.current.style.opacity = '0';
        contentRef.current.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
      }
      
      setTimeout(() => {
        onExit();
      }, 300);
      
      lastCenterPressRef.current = 0;
      return;
    }
    
    // 单击处理
    lastCenterPressRef.current = now;
    vibrate(20);
    playClickSound();
    
    // 清除上次的双击检测
    setTimeout(() => {
      if (lastCenterPressRef.current === now) {
        lastCenterPressRef.current = 0;
      }
    }, 500);
    
    if (view === 'menu') {
      const item = menuItems[selectedIndex];
      if (item.view === 'nowPlaying') {
        setView('nowPlaying');
      } else if (item.view === 'shuffle') {
        if (albums.length > 0) {
          const shuffled = [...albums].sort(() => Math.random() - 0.5);
          onPlay(shuffled[0], shuffled, 0);
          setView('nowPlaying');
        }
      } else {
        setView(item.view);
        if (item.view === 'songs') setSelectedSongIndex(0);
        setSelectedIndex(0);
      }
    } else if (view === 'albums' && albums[selectedIndex]) {
      const track = albums[selectedIndex];
      onPlay(track, albums, selectedIndex);
      setView('nowPlaying');
    } else if (view === 'songs' && songs[selectedSongIndex]) {
      onPlay(songs[selectedSongIndex], songs, selectedSongIndex);
      setView('nowPlaying');
    }
  }, [view, selectedIndex, selectedSongIndex, menuItems, albums, songs, onPlay, onExit, vibrate, playClickSound]);

  const handlePrevPress = useCallback(() => {
    if (buttonCooldownRef.current) return;
    buttonCooldownRef.current = true;
    setTimeout(() => { buttonCooldownRef.current = false; }, 200);
    
    vibrate(10);
    playClickSound();
    
    const max = getCurrentMax();
    if (max > 0) {
      const currentIdx = getCurrentIndex();
      setCurrentIndex((currentIdx - 1 + max) % max);
    } else {
      onPrev();
    }
  }, [view, getCurrentMax, getCurrentIndex, setCurrentIndex, onPrev, vibrate, playClickSound]);

  const handleNextPress = useCallback(() => {
    if (buttonCooldownRef.current) return;
    buttonCooldownRef.current = true;
    setTimeout(() => { buttonCooldownRef.current = false; }, 200);
    
    vibrate(10);
    playClickSound();
    
    const max = getCurrentMax();
    if (max > 0) {
      const currentIdx = getCurrentIndex();
      setCurrentIndex((currentIdx + 1) % max);
    } else {
      onNext();
    }
  }, [view, getCurrentMax, getCurrentIndex, setCurrentIndex, onNext, vibrate, playClickSound]);

  const handlePlayPress = useCallback(() => {
    if (buttonCooldownRef.current) return;
    buttonCooldownRef.current = true;
    setTimeout(() => { buttonCooldownRef.current = false; }, 200);
    
    vibrate(12);
    playClickSound();
    onTogglePlay();
  }, [onTogglePlay, vibrate, playClickSound]);

  const formatTime = (time: number) => {
    if (!Number.isFinite(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const isListMode = ['songs', 'menu'].includes(view);

  return (
    <div className="fixed inset-0 z-50" style={{ 
      background: 'linear-gradient(180deg, #0a0a0f 0%, #000000 100%)',
      overflowY: 'auto',
      overscrollBehavior: 'contain',
    }}>
      {/* Animated Background Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute w-[400px] h-[400px] rounded-full blur-[120px] opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(100,180,255,0.4) 0%, transparent 70%)',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'pulse 4s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full blur-[100px] opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(180,120,255,0.4) 0%, transparent 70%)',
            bottom: '100px',
            right: '-50px',
            animation: 'pulse 5s ease-in-out infinite 1s',
          }}
        />
      </div>

      {/* Top Section - Liquid Glass Display */}
      <div
        className="relative h-[55vh] overflow-hidden"
        style={{
          borderRadius: '0 0 48px 48px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.01) 100%)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderTop: 'none',
        }}
      >
        {/* Liquid Glass Effect Overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.08) 100%)',
            borderRadius: 'inherit',
          }}
        />

        {/* Edge Highlight */}
        <div
          className="absolute inset-x-0 top-0 h-[1px]"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 20%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 80%, transparent 100%)',
          }}
        />

        {/* Content Area */}
        <div ref={contentRef} className="relative px-4 pb-6 overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(100% - 20px)' }}>
          {/* Now Playing View */}
          {view === 'nowPlaying' && currentTrack ? (
            <div className="animate-fade-in flex flex-col items-center pt-6">
              <div className="relative mb-4" style={{ width: '190px' }}>
                <div
                  className="relative rounded-3xl overflow-hidden shadow-2xl"
                  style={{
                    transform: isPlaying ? 'scale(1)' : 'scale(0.98)',
                    transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <div
                    className="absolute -inset-1 rounded-[28px] z-[-1]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(100,200,255,0.3) 0%, rgba(180,120,255,0.2) 50%, rgba(255,100,180,0.2) 100%)',
                      backdropFilter: 'blur(20px)',
                    }}
                  />
                  <img
                    src={currentTrack.cover}
                    alt={currentTrack.title}
                    className="w-full aspect-square object-cover"
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 rounded-3xl overflow-hidden">
                      <div
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
                          animation: 'shimmer 2s ease-in-out infinite',
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center mb-4 mt-2">
                <h3 className="text-lg font-bold text-white mb-1 truncate w-64">{currentTrack.title}</h3>
                <p className="text-sm text-white/50 truncate">{currentTrack.artist}</p>
              </div>

              <div className="w-full max-w-[280px] mb-4">
                <div
                  className="h-1 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                      background: 'rgba(255,255,255,0.7)',
                      boxShadow: '0 0 8px rgba(255,255,255,0.3)',
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-white/40">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-8 mt-2">
                <button
                  onClick={onPrev}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  <svg className="w-6 h-6 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                  </svg>
                </button>
                <button
                  onClick={onTogglePlay}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.25)',
                  }}
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white/90 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>
                <button
                  onClick={onNext}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  <svg className="w-6 h-6 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                  </svg>
                </button>
              </div>
            </div>
          ) : null}

          {/* Menu View */}
          {view === 'menu' && (
            <div className="animate-fade-in py-4">
              <div className="space-y-2">
                {menuItems.map((item, index) => (
                  <button
                    ref={index === selectedIndex ? selectedItemRef : null}
                    key={item.label}
                    onClick={() => {
                      setSelectedIndex(index);
                      handleCenterPress();
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 ${
                      index === selectedIndex ? 'scale-[1.02]' : ''
                    }`}
                    style={{
                      background: index === selectedIndex
                        ? 'linear-gradient(135deg, rgba(100,181,246,0.25) 0%, rgba(165,130,255,0.15) 100%)'
                        : 'rgba(255,255,255,0.05)',
                      border: index === selectedIndex
                        ? '1px solid rgba(100,181,246,0.3)'
                        : '1px solid rgba(255,255,255,0.05)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                    }}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1 text-left">
                      <p className={`font-medium ${index === selectedIndex ? 'text-white' : 'text-white/80'}`}>
                        {item.label}
                      </p>
                      <p className="text-xs text-white/40">{item.subLabel}</p>
                    </div>
                    {index === selectedIndex && (
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Albums View */}
          {view === 'albums' && (
            <div className="animate-fade-in py-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-blue-400/60 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {albums.map((track, index) => (
                    <button
                      ref={index === selectedIndex ? selectedItemRef : null}
                      key={track.id}
                      onClick={() => {
                        setSelectedIndex(index);
                        handleCenterPress();
                      }}
                      className={`relative rounded-2xl overflow-hidden transition-all duration-200 ${
                        index === selectedIndex ? 'ring-2 ring-blue-400 scale-[1.02]' : 'opacity-80'
                      }`}
                      style={{ aspectRatio: '1' }}
                    >
                      <img src={track.cover} alt={track.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/>
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-xs font-medium text-white truncate">{track.title}</p>
                        <p className="text-[10px] text-white/60 truncate">{track.artist}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Songs View */}
          {view === 'songs' && (
            <div className="animate-fade-in py-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-blue-400/60 animate-spin" />
                </div>
              ) : (
                <div className="space-y-1">
                  {songs.map((song, index) => (
                    <button
                      ref={index === selectedSongIndex ? selectedItemRef : null}
                      key={song.id}
                      onClick={() => {
                        setSelectedSongIndex(index);
                        handleCenterPress();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                        index === selectedSongIndex ? 'scale-[1.01]' : ''
                      }`}
                      style={{
                        background: index === selectedSongIndex
                          ? 'linear-gradient(135deg, rgba(100,181,246,0.25) 0%, rgba(165,130,255,0.15) 100%)'
                          : 'rgba(255,255,255,0.03)',
                        border: index === selectedSongIndex
                          ? '1px solid rgba(100,181,246,0.3)'
                          : '1px solid transparent',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                      }}
                    >
                      <span className={`text-sm w-5 text-center font-medium ${index === selectedSongIndex ? 'text-blue-400' : 'text-white/40'}`}>
                        {index + 1}
                      </span>
                      <img src={song.cover} alt={song.title} className="w-10 h-10 rounded-lg object-cover" />
                      <div className="flex-1 text-left min-w-0">
                        <p className={`text-sm font-medium truncate ${index === selectedSongIndex ? 'text-white' : 'text-white/80'}`}>
                          {song.title}
                        </p>
                        <p className="text-xs text-white/40 truncate">{song.artist}</p>
                      </div>
                      <span className="text-xs text-white/30">{formatTime(song.duration)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}


        </div>

        {/* Bottom Gradient */}
        <div
          className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
          style={{
            background: 'linear-gradient(0deg, rgba(0,0,0,0.3) 0%, transparent 100%)',
          }}
        />
      </div>

      {/* Bottom Section - iPod Wheel Controller */}
      <div className="relative h-[45vh] flex items-center justify-center">
        <div
          ref={wheelRef}
          className="relative w-[260px] h-[260px] select-none"
          onTouchStart={handleWheelTouchStart}
          onTouchMove={handleWheelTouchMove}
          onTouchEnd={handleWheelTouchEnd}
        >
          {/* Outer Glow */}
          <div
            className="absolute inset-[-20px] rounded-full transition-opacity duration-500 pointer-events-none"
            style={{
              background: isTouching
                ? `conic-gradient(from ${wheelAngle}deg, rgba(100,181,246,0.3) 0deg, rgba(165,130,255,0.15) 120deg, transparent 120deg)`
                : 'conic-gradient(from 0deg, rgba(100,181,246,0.15) 0deg, rgba(165,130,255,0.08) 120deg, transparent 120deg)',
              filter: 'blur(20px)',
              animation: isTouching ? 'none' : 'rotate 8s linear infinite',
            }}
          />

          {/* Main Wheel - Metal Texture */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                radial-gradient(circle at 35% 25%, rgba(120,120,130,0.9) 0%, rgba(70,70,80,0.85) 30%, rgba(45,45,55,0.9) 60%, rgba(25,25,30,1) 100%)
              `,
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.08),
                inset 0 2px 4px rgba(255,255,255,0.12),
                inset 0 -4px 8px rgba(0,0,0,0.4),
                0 12px 40px rgba(0,0,0,0.6),
                0 0 80px rgba(0,0,0,0.3)
              `,
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `
                  repeating-conic-gradient(
                    from 0deg,
                    rgba(255,255,255,0.02) 0deg 3deg,
                    transparent 3deg 6deg
                  )
                `,
              }}
            />
          </div>

          {/* Inner Ring */}
          <div
            className="absolute inset-[10px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(35,35,45,1) 0%, rgba(30,30,38,1) 100%)',
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.05)',
            }}
          />

          {/* Touch Indicator - Blue Glow */}
          {isTouching && (
            <div
              className="absolute pointer-events-none"
              style={{
                width: '200px',
                height: '200px',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) rotate(${wheelAngle}deg)`,
                transition: 'transform 0.05s linear',
              }}
            >
              <div
                className="absolute w-full h-full"
                style={{
                  background: 'conic-gradient(from -30deg, transparent 0deg, rgba(100,180,255,0.6) 20deg, rgba(100,200,255,0.4) 50deg, transparent 60deg)',
                  borderRadius: '50%',
                }}
              />
              <div
                className="absolute w-full h-full"
                style={{
                  background: 'conic-gradient(from -35deg, transparent 0deg, rgba(150,220,255,0.8) 25deg, rgba(100,180,255,0.5) 55deg, transparent 65deg)',
                  filter: 'blur(8px)',
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  width: '8px',
                  height: '8px',
                  top: '0',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(100,200,255,0.6) 50%, transparent 70%)',
                  boxShadow: '0 0 15px rgba(100,200,255,0.8), 0 0 30px rgba(100,200,255,0.4)',
                }}
              />
            </div>
          )}

          {/* Static Glow */}
          {!isTouching && (
            <div
              className="absolute pointer-events-none"
              style={{
                width: '200px',
                height: '200px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className="absolute w-full h-full rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, transparent 0deg, rgba(100,180,255,0.08) 60deg, transparent 120deg)',
                  animation: 'glow-rotate 10s linear infinite',
                }}
              />
            </div>
          )}

          {/* Texture Lines */}
          {[...Array(60)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white/6"
              style={{
                width: i % 5 === 0 ? '2px' : '1px',
                height: i % 5 === 0 ? '14px' : '8px',
                left: '50%',
                top: '14px',
                transformOrigin: `0px ${102}px`,
                transform: `translateX(-50%) rotate(${i * 6}deg)`,
              }}
            />
          ))}

          {/* Menu Button */}
          <button
            onClick={handleMenuPress}
            className="absolute top-[6px] left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
            style={{
              background: 'linear-gradient(180deg, rgba(100,100,110,0.9) 0%, rgba(70,70,80,0.95) 100%)',
              boxShadow: '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <svg className="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          {/* Previous Button */}
          <button
            onClick={handlePrevPress}
            className="absolute left-[6px] top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
            style={{
              background: 'linear-gradient(180deg, rgba(100,100,110,0.9) 0%, rgba(70,70,80,0.95) 100%)',
              boxShadow: '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <svg className="w-5 h-5 text-white/90" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          {/* Next Button */}
          <button
            onClick={handleNextPress}
            className="absolute right-[6px] top-1/2 -translate-y-1/2 translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
            style={{
              background: 'linear-gradient(180deg, rgba(100,100,110,0.9) 0%, rgba(70,70,80,0.95) 100%)',
              boxShadow: '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <svg className="w-5 h-5 text-white/90" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPress}
            className="absolute bottom-[6px] left-1/2 -translate-x-1/2 translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
            style={{
              background: 'linear-gradient(180deg, rgba(100,100,110,0.9) 0%, rgba(70,70,80,0.95) 100%)',
              boxShadow: '0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {isPlaying ? (
              <svg className="w-5 h-5 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white/90 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          {/* Center Button */}
          <button
            onClick={handleCenterPress}
            className="absolute inset-[52px] rounded-full transition-transform duration-150 active:scale-95"
            style={{
              background: `
                radial-gradient(circle at 30% 25%, rgba(80,80,90,1) 0%, rgba(50,50,60,1) 50%, rgba(35,35,45,1) 100%)
              `,
              boxShadow: `
                inset 0 3px 8px rgba(0,0,0,0.6),
                inset 0 -2px 4px rgba(255,255,255,0.05),
                0 4px 12px rgba(0,0,0,0.4)
              `,
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            {isListMode ? (
              <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
            ) : (
              <div className="w-3 h-3 rounded-full bg-white/40"/>
            )}
          </button>

          {/* Inner Ring Highlight */}
          <div
            className="absolute inset-[58px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.06) 0%, transparent 50%)',
            }}
          />
        </div>
      </div>

      {/* Keyframe Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.3; transform: translateX(-50%) scale(1.1); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(200%) rotate(45deg); }
        }
        @keyframes glow-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
