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
  onSeek: (time: number) => void;
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
  onSeek,
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
  const wheelSoundAccumulatorRef = useRef(0);
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

  const playWheelSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'sine';
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(900, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.04);
    
    gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.04);
  }, []);

  const playWheelTickSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = 'triangle';
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.015);
    
    gainNode.gain.setValueAtTime(0.015, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.015);
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
    wheelSoundAccumulatorRef.current = 0;
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
    wheelSoundAccumulatorRef.current += delta;

    // 连续滚轮音效：每滑动20度播放一次短促的"咔"声
    const wheelSoundStep = 20;
    const soundSteps = Math.floor(Math.abs(wheelSoundAccumulatorRef.current) / wheelSoundStep);
    if (soundSteps >= 1) {
      playWheelTickSound();
      wheelSoundAccumulatorRef.current -= Math.sign(wheelSoundAccumulatorRef.current) * soundSteps * wheelSoundStep;
    }

    if (view === 'nowPlaying' && duration > 0) {
      // 正在播放界面：滑动调节进度
      const progressStepDegrees = 12;
      const progressSteps = Math.floor(Math.abs(angleAccumulatorRef.current) / progressStepDegrees);
      
      if (progressSteps >= 1) {
        const direction = Math.sign(angleAccumulatorRef.current);
        const seekDelta = direction * progressSteps * (duration * 0.01);
        const newTime = Math.max(0, Math.min(duration, currentTime + seekDelta));
        onSeek(newTime);
        vibrate(4);
        angleAccumulatorRef.current -= direction * progressSteps * progressStepDegrees;
      }
    } else {
      // 其他界面：滑动切换菜单项
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
        playWheelSound();
        angleAccumulatorRef.current -= direction * steps * minAnglePerStep;
      }
    }
    
    lastAngleRef.current = currentAngle;
  }, [view, duration, currentTime, calculateAngle, getCurrentMax, getCurrentIndex, setCurrentIndex, onSeek, vibrate, playWheelSound, playWheelTickSound]);

  const handleWheelTouchEnd = useCallback(() => {
    setIsTouching(false);
    setWheelAngle(0);
    angleAccumulatorRef.current = 0;
    wheelSoundAccumulatorRef.current = 0;
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
    
    // 双击返回首页（任何视图都可以双击退出）
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
    
    // 正在播放界面：单击暂停/播放
    if (view === 'nowPlaying') {
      onTogglePlay();
    } else if (view === 'menu') {
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
  }, [view, selectedIndex, selectedSongIndex, menuItems, albums, songs, onPlay, onTogglePlay, onExit, vibrate, playClickSound]);

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
      background: '#000000',
      overflow: 'hidden',
      touchAction: 'none',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
    }}>
      {/* 顶部与屏幕交接虚化 */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: '60px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
          zIndex: 10,
        }}
      />

      {/* Top Section - Liquid Glass Display - iOS 26 风格 */}
      <div
        className="relative h-[55vh] overflow-hidden mx-3 mt-4"
        style={{
          borderRadius: '40px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 35%, rgba(255,255,255,0.025) 65%, rgba(255,255,255,0.04) 100%)',
          backdropFilter: 'blur(80px) saturate(200%)',
          WebkitBackdropFilter: 'blur(80px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: `
            0 20px 60px rgba(0,0,0,0.6),
            0 6px 20px rgba(0,0,0,0.4),
            inset 0 1.5px 0 rgba(255,255,255,0.22),
            inset 0 -1.5px 0 rgba(0,0,0,0.3),
            inset 0 0 80px rgba(255,255,255,0.02)
          `,
        }}
      >
        {/* 屏显背景极光光团 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ borderRadius: '40px' }}>
          <div
            className="absolute rounded-full"
            style={{
              top: '-30%', left: '-20%', width: '60%', height: '50%',
              background: 'radial-gradient(ellipse at center, rgba(255,107,129,0.12) 0%, transparent 60%)',
              filter: 'blur(40px)',
              animation: 'screen-aurora 10s ease-in-out infinite',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              top: '-10%', right: '-25%', width: '55%', height: '45%',
              background: 'radial-gradient(ellipse at center, rgba(81,168,255,0.1) 0%, transparent 60%)',
              filter: 'blur(45px)',
              animation: 'screen-aurora 12s ease-in-out infinite reverse',
              animationDelay: '-3s',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              bottom: '-20%', left: '10%', width: '50%', height: '40%',
              background: 'radial-gradient(ellipse at center, rgba(147,112,255,0.09) 0%, transparent 60%)',
              filter: 'blur(42px)',
              animation: 'screen-aurora 14s ease-in-out infinite',
              animationDelay: '-6s',
            }}
          />
        </div>

        {/* 噪点纹理 */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            borderRadius: '40px',
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* 外边框光晕 - 更精致 */}
        <div
          className="absolute -inset-[1.5px] pointer-events-none rounded-[40px]"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 25%, transparent 45%, transparent 55%, rgba(255,255,255,0.05) 75%, rgba(255,255,255,0.15) 100%)',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'xor',
            WebkitMaskComposite: 'xor',
            padding: '1.5px',
          }}
        />

        {/* Liquid Glass Effect Overlay - 增强版 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(165deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.06) 20%, transparent 40%, transparent 60%, rgba(255,255,255,0.03) 80%, rgba(255,255,255,0.08) 100%)',
            borderRadius: 'inherit',
          }}
        />

        {/* 顶部高光条 - 更宽更亮 */}
        <div
          className="absolute inset-x-10 top-0 h-[1.5px] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0.4) 75%, transparent 100%)',
          }}
        />

        {/* Inner Shadow - 更有层次 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: 'inherit',
            boxShadow: `
              inset 0 6px 40px rgba(0,0,0,0.3),
              inset 0 -4px 20px rgba(0,0,0,0.15),
              inset 0 0 60px rgba(255,255,255,0.02)
            `,
          }}
        />

        {/* Edge Highlight - 更大面积 */}
        <div
          className="absolute inset-x-0 top-0 h-2.5 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, transparent 100%)',
            borderTopLeftRadius: '40px',
            borderTopRightRadius: '40px',
          }}
        />

        {/* 底部反光 */}
        <div
          className="absolute inset-x-0 bottom-0 h-1.5 pointer-events-none"
          style={{
            background: 'linear-gradient(0deg, rgba(255,255,255,0.08) 0%, transparent 100%)',
            borderBottomLeftRadius: '40px',
            borderBottomRightRadius: '40px',
          }}
        />

        {/* 底部虚化交接遮罩 - 与圆盘区域衔接 */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: '80px',
            background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 40%, transparent 100%)',
            borderBottomLeftRadius: '40px',
            borderBottomRightRadius: '40px',
          }}
        />

        {/* Content Area */}
        <div ref={contentRef} className="relative px-5 pb-6 overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(100% - 20px)' }}>
          {/* Now Playing View - iOS 26 风格 */}
          {view === 'nowPlaying' && currentTrack ? (
            <div className="animate-fade-in flex flex-col items-center pt-7">
              <div className="relative mb-5" style={{ width: '185px' }}>
                {/* 封面主图 - 更精致 */}
                <div
                  className="relative rounded-[28px] overflow-hidden"
                  style={{
                    transform: isPlaying ? 'scale(1)' : 'scale(0.97)',
                    transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isPlaying
                      ? '0 20px 60px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)'
                      : '0 15px 50px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.25)',
                    transitionProperty: 'transform, box-shadow',
                    transitionDuration: '0.6s',
                    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {/* 外边框光晕 */}
                  <div
                    className="absolute -inset-[1.5px] rounded-[26px] z-[-1]"
                    style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.05) 60%, rgba(255,255,255,0.2) 100%)',
                    }}
                  />
                  <img
                    src={currentTrack.cover}
                    alt={currentTrack.title}
                    className="w-full aspect-square object-cover relative z-10"
                  />
                  {/* 表面高光 - 更细腻 */}
                  <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-[28px]">
                    <div
                      style={{
                        background: 'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, transparent 35%, transparent 55%, rgba(0,0,0,0.12) 100%)',
                      }}
                      className="absolute inset-0"
                    />
                  </div>
                  {/* 播放时的流动光效 */}
                  {isPlaying && (
                    <div className="absolute inset-0 z-20 overflow-hidden rounded-[28px]">
                      <div
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.05) 100%)',
                          animation: 'shimmer 3.5s ease-in-out infinite',
                        }}
                      />
                    </div>
                  )}
                  {/* 底部暗角 */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-1/3 z-20 pointer-events-none"
                    style={{
                      background: 'linear-gradient(0deg, rgba(0,0,0,0.15) 0%, transparent 100%)',
                    }}
                  />
                </div>
              </div>

              {/* 歌曲信息 - 更精致 */}
              <div className="text-center mb-5 mt-1">
                <h3 className="text-[17px] font-semibold text-white mb-1 truncate w-64 tracking-tight">{currentTrack.title}</h3>
                <p className="text-[13px] text-white/55 truncate font-medium">{currentTrack.artist}</p>
              </div>

              {/* 进度条 - 更iOS风格 */}
              <div className="w-full max-w-[270px] mb-5">
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300 relative"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.95) 100%)',
                      boxShadow: '0 0 10px rgba(255,255,255,0.35), 0 0 20px rgba(255,255,255,0.15)',
                    }}
                  >
                    {/* 进度条末端光点 */}
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                      style={{
                        background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 60%, transparent 100%)',
                        boxShadow: '0 0 8px rgba(255,255,255,0.6)',
                        transform: 'translate(50%, -50%)',
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-between mt-1.5 text-[11px] text-white/45 font-medium">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* 播放控制按钮 - 更精致液态玻璃 */}
              <div className="flex items-center justify-center gap-7 mt-1">
                <button
                  onClick={onPrev}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-88"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 14px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.2)',
                  }}
                >
                  <svg className="w-5.5 h-5.5 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                  </svg>
                </button>
                <button
                  onClick={onTogglePlay}
                  className="w-15 h-15 rounded-full flex items-center justify-center transition-all duration-200 active:scale-88"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.1) 100%)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 6px 20px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.2)',
                    width: '60px',
                    height: '60px',
                  }}
                >
                  {isPlaying ? (
                    <svg className="w-7 h-7 text-white/95" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  ) : (
                    <svg className="w-7 h-7 text-white/95 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>
                <button
                  onClick={onNext}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-88"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 14px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.2)',
                  }}
                >
                  <svg className="w-5.5 h-5.5 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                  </svg>
                </button>
              </div>
            </div>
          ) : null}

          {/* Menu View - iOS 26 风格 */}
          {view === 'menu' && (
            <div className="animate-fade-in py-5">
              <div className="space-y-2">
                {menuItems.map((item, index) => (
                  <button
                    ref={index === selectedIndex ? selectedItemRef : null}
                    key={item.label}
                    onClick={() => {
                      setSelectedIndex(index);
                      handleCenterPress();
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                      index === selectedIndex ? 'scale-[1.015]' : ''
                    }`}
                    style={{
                      background: index === selectedIndex
                        ? 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.09) 40%, rgba(255,255,255,0.06) 70%, rgba(255,255,255,0.1) 100%)'
                        : 'rgba(255,255,255,0.03)',
                      border: index === selectedIndex
                        ? '1px solid rgba(255,255,255,0.25)'
                        : '1px solid rgba(255,255,255,0.05)',
                      backdropFilter: 'blur(32px) saturate(200%)',
                      WebkitBackdropFilter: 'blur(32px) saturate(200%)',
                      boxShadow: index === selectedIndex
                        ? `
                          0 8px 32px rgba(0,0,0,0.35),
                          0 3px 12px rgba(0,0,0,0.25),
                          inset 0 1.5px 0 rgba(255,255,255,0.25),
                          inset 0 -1px 0 rgba(0,0,0,0.1)
                        `
                        : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}
                  >
                    <div 
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all duration-300"
                      style={{
                        background: index === selectedIndex
                          ? 'linear-gradient(145deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.1) 100%)'
                          : 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                        border: index === selectedIndex 
                          ? '1px solid rgba(255,255,255,0.3)' 
                          : '1px solid rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(20px) saturate(200%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(200%)',
                        boxShadow: index === selectedIndex
                          ? '0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.1)'
                          : '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
                      }}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-semibold text-[15px] tracking-tight transition-colors duration-200 ${index === selectedIndex ? 'text-white' : 'text-white/85'}`}>
                        {item.label}
                      </p>
                      <p className="text-[11px] text-white/40 mt-0.5 font-medium">{item.subLabel}</p>
                    </div>
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                        index === selectedIndex ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                      }`}
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
                        border: '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      <svg className="w-4 h-4 text-white/75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Albums View - iOS 26 风格 */}
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
                      className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
                        index === selectedIndex ? 'ring-2 ring-white/40 scale-[1.03]' : 'opacity-90'
                      }`}
                      style={{ 
                        aspectRatio: '1',
                        boxShadow: index === selectedIndex 
                          ? '0 8px 24px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' 
                          : '0 4px 12px rgba(0,0,0,0.25)',
                      }}
                    >
                      <img src={track.cover} alt={track.title} className="w-full h-full object-cover" />
                      {/* 渐变遮罩 */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
                      {/* 顶部高光 */}
                      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                      {/* 选中指示器 */}
                      {index === selectedIndex && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center border border-white/30">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                          </svg>
                        </div>
                      )}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5">
                        <p className="text-xs font-semibold text-white truncate tracking-tight">{track.title}</p>
                        <p className="text-[10px] text-white/60 truncate mt-0.5">{track.artist}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Songs View - iOS 26 风格 */}
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
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-250 ${
                        index === selectedSongIndex ? 'scale-[1.01]' : ''
                      }`}
                      style={{
                        background: index === selectedSongIndex
                          ? 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.1) 100%)'
                          : 'rgba(255,255,255,0.025)',
                        border: index === selectedSongIndex
                          ? '1px solid rgba(255,255,255,0.22)'
                          : '1px solid rgba(255,255,255,0.04)',
                        backdropFilter: 'blur(28px) saturate(200%)',
                        WebkitBackdropFilter: 'blur(28px) saturate(200%)',
                        boxShadow: index === selectedSongIndex
                          ? '0 6px 20px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2), inset 0 1.5px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.08)'
                          : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                      }}
                    >
                      <span className={`text-sm w-5 text-center font-semibold transition-colors duration-200 ${index === selectedSongIndex ? 'text-white/90' : 'text-white/40'}`}>
                        {index + 1}
                      </span>
                      <div className="relative">
                        <img src={song.cover} alt={song.title} className="w-10 h-10 rounded-lg object-cover" />
                        {index === selectedSongIndex && (
                          <div className="absolute inset-0 rounded-lg bg-black/20 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className={`text-sm font-medium truncate transition-colors duration-200 ${index === selectedSongIndex ? 'text-white' : 'text-white/80'}`}>
                          {song.title}
                        </p>
                        <p className="text-xs text-white/40 truncate">{song.artist}</p>
                      </div>
                      <span className="text-xs text-white/35 font-medium">{formatTime(song.duration)}</span>
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

      {/* Bottom Section - iPod Wheel Controller - iOS 26 风格 */}
      <div className="relative h-[45vh] flex items-center justify-center">
        {/* 顶部虚化交接遮罩 - 与屏幕区域衔接 */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            height: '80px',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
            zIndex: 5,
          }}
        />
        <div
          ref={wheelRef}
          className="relative w-[270px] h-[270px] select-none"
          onTouchStart={handleWheelTouchStart}
          onTouchMove={handleWheelTouchMove}
          onTouchEnd={handleWheelTouchEnd}
        >
          {/* 外层柔和光晕 */}
          <div
            className="absolute inset-[-30px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(100,180,255,0.08) 0%, transparent 70%)',
              filter: 'blur(20px)',
            }}
          />

          {/* Outer Glow - 更精致 */}
          <div
            className="absolute inset-[-18px] rounded-full transition-all duration-500 pointer-events-none"
            style={{
              background: isTouching
                ? `conic-gradient(from ${wheelAngle}deg, rgba(120,200,255,0.35) 0deg, rgba(180,150,255,0.2) 90deg, rgba(100,180,255,0.1) 180deg, transparent 240deg)`
                : 'conic-gradient(from 0deg, rgba(100,180,255,0.18) 0deg, rgba(160,130,255,0.1) 120deg, transparent 180deg)',
              filter: 'blur(18px)',
              animation: isTouching ? 'none' : 'rotate 12s linear infinite',
              opacity: isTouching ? 1 : 0.7,
            }}
          />

          {/* Main Wheel - Premium Metal Texture - iOS 26 风格 */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                radial-gradient(circle at 35% 22%, rgba(140,140,150,0.95) 0%, rgba(100,100,110,0.9) 15%, rgba(70,70,80,0.88) 35%, rgba(50,50,60,0.9) 55%, rgba(35,35,42,0.95) 75%, rgba(22,22,28,1) 100%)
              `,
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.1),
                0 0 0 2px rgba(0,0,0,0.3),
                inset 0 3px 6px rgba(255,255,255,0.15),
                inset 0 -6px 12px rgba(0,0,0,0.5),
                0 16px 50px rgba(0,0,0,0.7),
                0 4px 16px rgba(0,0,0,0.4),
                0 0 100px rgba(0,0,0,0.25)
              `,
            }}
          >
            {/* 细腻的同心圆纹理 */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `
                  repeating-radial-gradient(
                    circle at center,
                    transparent 0px,
                    transparent 2px,
                    rgba(255,255,255,0.015) 2px,
                    rgba(255,255,255,0.015) 3px
                  )
                `,
              }}
            />
            {/* 角度纹理 - 更细腻 */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `
                  repeating-conic-gradient(
                    from 0deg,
                    rgba(255,255,255,0.025) 0deg 1.5deg,
                    transparent 1.5deg 3deg
                  )
                `,
                opacity: 0.6,
              }}
            />
          </div>

          {/* 外圈金属边框 */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              border: '1.5px solid rgba(255,255,255,0.08)',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)',
            }}
          />

          {/* Inner Ring - 更深邃 */}
          <div
            className="absolute inset-[12px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 35% 25%, rgba(42,42,52,1) 0%, rgba(32,32,40,1) 50%, rgba(25,25,32,1) 100%)',
              boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.6), inset 0 -2px 4px rgba(255,255,255,0.03), 0 1px 0 rgba(255,255,255,0.05)',
            }}
          />

          {/* Touch Indicator - Blue Glow - 更灵动 */}
          {isTouching && (
            <div
              className="absolute pointer-events-none"
              style={{
                width: '210px',
                height: '210px',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) rotate(${wheelAngle}deg)`,
                transition: 'transform 0.04s linear',
              }}
            >
              {/* 主光带 */}
              <div
                className="absolute w-full h-full"
                style={{
                  background: 'conic-gradient(from -25deg, transparent 0deg, rgba(120,200,255,0.5) 15deg, rgba(100,220,255,0.35) 35deg, rgba(80,180,255,0.2) 50deg, transparent 65deg)',
                  borderRadius: '50%',
                }}
              />
              {/* 模糊光晕 */}
              <div
                className="absolute w-full h-full"
                style={{
                  background: 'conic-gradient(from -30deg, transparent 0deg, rgba(150,220,255,0.6) 20deg, rgba(100,180,255,0.4) 45deg, transparent 60deg)',
                  filter: 'blur(10px)',
                }}
              />
              {/* 光点 */}
              <div
                className="absolute rounded-full"
                style={{
                  width: '10px',
                  height: '10px',
                  top: '-2px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(120,210,255,0.7) 40%, rgba(80,180,255,0.3) 70%, transparent 100%)',
                  boxShadow: '0 0 20px rgba(100,200,255,0.9), 0 0 40px rgba(100,200,255,0.5), 0 0 60px rgba(80,180,255,0.3)',
                }}
              />
              {/* 光点拖尾 */}
              <div
                className="absolute"
                style={{
                  width: '30px',
                  height: '6px',
                  top: '0',
                  left: '50%',
                  transform: 'translateX(-50%) rotate(15deg)',
                  background: 'linear-gradient(90deg, transparent 0%, rgba(150,220,255,0.4) 50%, rgba(100,200,255,0.6) 100%)',
                  filter: 'blur(3px)',
                  borderRadius: '3px',
                }}
              />
            </div>
          )}

          {/* Static Glow - 更柔和的呼吸感 */}
          {!isTouching && (
            <div
              className="absolute pointer-events-none"
              style={{
                width: '210px',
                height: '210px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className="absolute w-full h-full rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, transparent 0deg, rgba(100,180,255,0.06) 50deg, rgba(160,130,255,0.04) 100deg, transparent 160deg)',
                  animation: 'glow-rotate 12s linear infinite',
                }}
              />
              <div
                className="absolute w-full h-full rounded-full"
                style={{
                  background: 'conic-gradient(from 180deg, transparent 0deg, rgba(120,200,255,0.04) 40deg, transparent 90deg)',
                  animation: 'glow-rotate 18s linear infinite reverse',
                }}
              />
            </div>
          )}

          {/* Texture Lines - 更精致的刻度 */}
          {[...Array(72)].map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                width: i % 6 === 0 ? '2px' : '1px',
                height: i % 6 === 0 ? '16px' : i % 3 === 0 ? '10px' : '6px',
                left: '50%',
                top: '12px',
                transformOrigin: `0px ${111}px`,
                transform: `translateX(-50%) rotate(${i * 5}deg)`,
                background: i % 6 === 0 
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)' 
                  : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                borderRadius: '1px',
              }}
            />
          ))}

          {/* 中心参考圈 */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: '40px',
              height: '40px',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          />

          {/* Menu Button - 更精致的金属按钮 */}
          <button
            onClick={handleMenuPress}
            className="absolute top-[8px] left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-85"
            style={{
              background: 'linear-gradient(180deg, rgba(130,130,145,0.95) 0%, rgba(90,90,105,0.95) 40%, rgba(65,65,78,1) 100%)',
              boxShadow: `
                0 4px 12px rgba(0,0,0,0.5),
                0 1px 3px rgba(0,0,0,0.3),
                inset 0 1.5px 0 rgba(255,255,255,0.2),
                inset 0 -2px 4px rgba(0,0,0,0.3),
                inset 0 0 0 1px rgba(255,255,255,0.05)
              `,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* 按钮顶部高光 */}
            <div
              className="absolute top-0.5 inset-x-2 h-[1px] pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.3) 30%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0.3) 70%, transparent 90%)',
              }}
            />
            <svg className="w-5 h-5 text-white/90 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>

          {/* Previous Button - 更精致的金属按钮 */}
          <button
            onClick={handlePrevPress}
            className="absolute left-[8px] top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-85"
            style={{
              background: 'linear-gradient(180deg, rgba(130,130,145,0.95) 0%, rgba(90,90,105,0.95) 40%, rgba(65,65,78,1) 100%)',
              boxShadow: `
                0 4px 12px rgba(0,0,0,0.5),
                0 1px 3px rgba(0,0,0,0.3),
                inset 0 1.5px 0 rgba(255,255,255,0.2),
                inset 0 -2px 4px rgba(0,0,0,0.3),
                inset 0 0 0 1px rgba(255,255,255,0.05)
              `,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div
              className="absolute top-0.5 inset-x-2 h-[1px] pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.3) 30%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0.3) 70%, transparent 90%)',
              }}
            />
            <svg className="w-5 h-5 text-white/90 relative z-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          {/* Next Button - 更精致的金属按钮 */}
          <button
            onClick={handleNextPress}
            className="absolute right-[8px] top-1/2 -translate-y-1/2 translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-85"
            style={{
              background: 'linear-gradient(180deg, rgba(130,130,145,0.95) 0%, rgba(90,90,105,0.95) 40%, rgba(65,65,78,1) 100%)',
              boxShadow: `
                0 4px 12px rgba(0,0,0,0.5),
                0 1px 3px rgba(0,0,0,0.3),
                inset 0 1.5px 0 rgba(255,255,255,0.2),
                inset 0 -2px 4px rgba(0,0,0,0.3),
                inset 0 0 0 1px rgba(255,255,255,0.05)
              `,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div
              className="absolute top-0.5 inset-x-2 h-[1px] pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.3) 30%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0.3) 70%, transparent 90%)',
              }}
            />
            <svg className="w-5 h-5 text-white/90 relative z-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>

          {/* Play/Pause Button - 更精致的金属按钮 */}
          <button
            onClick={handlePlayPress}
            className="absolute bottom-[8px] left-1/2 -translate-x-1/2 translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-85"
            style={{
              background: 'linear-gradient(180deg, rgba(130,130,145,0.95) 0%, rgba(90,90,105,0.95) 40%, rgba(65,65,78,1) 100%)',
              boxShadow: `
                0 4px 12px rgba(0,0,0,0.5),
                0 1px 3px rgba(0,0,0,0.3),
                inset 0 1.5px 0 rgba(255,255,255,0.2),
                inset 0 -2px 4px rgba(0,0,0,0.3),
                inset 0 0 0 1px rgba(255,255,255,0.05)
              `,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div
              className="absolute top-0.5 inset-x-2 h-[1px] pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.3) 30%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0.3) 70%, transparent 90%)',
              }}
            />
            {isPlaying ? (
              <svg className="w-5 h-5 text-white/90 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white/90 ml-0.5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          {/* Center Button - 更精致的金属质感 */}
          <button
            onClick={handleCenterPress}
            className="absolute inset-[54px] rounded-full transition-all duration-200 active:scale-92"
            style={{
              background: `
                radial-gradient(circle at 32% 22%, rgba(95,95,108,1) 0%, rgba(65,65,78,1) 35%, rgba(48,48,58,1) 65%, rgba(32,32,40,1) 100%)
              `,
              boxShadow: `
                inset 0 4px 10px rgba(0,0,0,0.65),
                inset 0 -3px 6px rgba(255,255,255,0.04),
                0 5px 15px rgba(0,0,0,0.45),
                0 1px 3px rgba(0,0,0,0.3),
                inset 0 0 0 1px rgba(255,255,255,0.06)
              `,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* 中心按钮内圈高光 */}
            <div
              className="absolute inset-[6px] rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.08) 0%, transparent 60%)',
              }}
            />
            {/* 中心按钮图标 */}
            {isListMode ? (
              <svg className="w-6 h-6 text-white/60 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
              </svg>
            ) : (
              <div className="w-3.5 h-3.5 rounded-full bg-white/40 relative z-10" 
                   style={{ boxShadow: '0 0 8px rgba(255,255,255,0.1)' }} />
            )}
          </button>

          {/* Inner Ring Highlight - 更精致 */}
          <div
            className="absolute inset-[60px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 32% 20%, rgba(255,255,255,0.07) 0%, transparent 55%)',
            }}
          />
        </div>
      </div>

      {/* Keyframe Animations - iOS 26 风格 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.3; transform: translateX(-50%) scale(1.1); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(200%) rotate(45deg); }
        }
        @keyframes cover-glow {
          0%, 100% {
            opacity: 0.65;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.12);
          }
        }
        @keyframes glow-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        /* 极光漂移动画 */
        @keyframes aurora-drift {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.8;
          }
          25% {
            transform: translate(30px, -20px) scale(1.05);
            opacity: 1;
          }
          50% {
            transform: translate(-20px, 25px) scale(0.98);
            opacity: 0.9;
          }
          75% {
            transform: translate(25px, 15px) scale(1.02);
            opacity: 0.85;
          }
        }
        /* 呼吸动画 */
        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.02);
            opacity: 0.9;
          }
        }
        /* 浮动动画 */
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(12px) scale(0.98); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        /* 屏显极光动画 */
        @keyframes screen-aurora {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          25% {
            transform: translate(25px, -15px) scale(1.08);
            opacity: 0.9;
          }
          50% {
            transform: translate(-20px, 18px) scale(0.95);
            opacity: 1;
          }
          75% {
            transform: translate(18px, -10px) scale(1.03);
            opacity: 0.85;
          }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* 底部虚化交接 */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: '60px',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
          zIndex: 10,
        }}
      />
    </div>
  );
}
