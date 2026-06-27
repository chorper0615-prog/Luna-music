import { useEffect, useMemo, useState } from 'react';
import { Track, Tab } from './types/music';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import DynamicBackground from './components/DynamicBackground';
import MiniPlayer from './components/MiniPlayer';
import FullPlayer from './components/FullPlayer';
import TabBar from './components/TabBar';
import HomeView from './components/HomeView';
import SearchView from './components/SearchView';
import LibraryView from './components/LibraryView';
import SplashScreen from './components/SplashScreen';
import IpodMode from './components/IpodMode';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [playerOpen, setPlayerOpen] = useState(false);
  const [theme] = useState<'dark' | 'light'>('dark');
  const [profileOpen, setProfileOpen] = useState(false);
  const [ipodMode, setIpodMode] = useState(false);

  useEffect(() => { document.documentElement.className = theme; }, [theme]);

  const user = { name: '音乐爱好者', avatar: null as string | null };

  const {
    currentTrack,
    queue,
    playerState,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffled,
    playTrack,
    togglePlay,
    playNext,
    playPrev,
    seek,
    changeVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    setQueue,
  } = useAudioPlayer();

  const handlePlay = (track: Track, newQueue: Track[], index: number) => {
    setQueue(newQueue);
    playTrack(track, newQueue, index);
    setPlayerOpen(true);
  };

  const handleTrackSelectFromQueue = (track: Track) => {
    const idx = queue.findIndex((t) => t.id === track.id);
    playTrack(track, queue, Math.max(0, idx));
  };

  const isPlaying = playerState === 'playing';
  const themeColor = useMemo(() => currentTrack?.color || '#ff6b81', [currentTrack]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />;

  return (
    <div className='fixed inset-0 flex flex-col overflow-hidden' style={{ height: '100dvh' }}>
      <DynamicBackground color={themeColor} cover={currentTrack?.cover} isPlaying={isPlaying} />

      <main className='relative z-10 flex h-full flex-col'>
        {/* Top bar */}
        <div className='flex items-center justify-between px-5 pt-[env(safe-area-inset-top,16px)] pt-4 pb-1 relative z-20'>
          <h1 className='text-xl font-bold' style={{ color: 'var(--text-primary)' }}>
            {activeTab === 'home' ? 'Luna' : activeTab === 'search' ? '搜索' : '资料库'}
          </h1>
          <div className='flex items-center gap-2.5'>
            <button onClick={() => setIpodMode(true)} className='w-9 h-9 rounded-full glass-ios flex items-center justify-center text-sm transition-all duration-300 active:scale-85 hover:scale-105'>
              <span style={{ color: 'var(--text-primary)' }}>🎵</span>
            </button>
            <button onClick={() => setProfileOpen(!profileOpen)} className='relative w-10 h-10 rounded-full border-2 overflow-hidden flex items-center justify-center backdrop-blur-xl transition-all duration-300 active:scale-85 hover:scale-105' style={{ borderColor: 'var(--glass-border)' }}>
              <div className='w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center'>
                <span className='text-sm font-semibold text-white'>M</span>
              </div>
            </button>
          </div>
        </div>

        {/* Profile panel - Apple Account Style */}
        {profileOpen && (
          <div className='absolute inset-0 z-30' onClick={() => setProfileOpen(false)}>
            <div className='absolute inset-0 bg-black/30 backdrop-blur-sm' />
            <div
              className='absolute inset-x-0 top-0 bottom-0 animate-profile-in'
              style={{
                background: theme === 'dark'
                  ? 'linear-gradient(180deg, #1c1c1e 0%, #000000 100%)'
                  : 'linear-gradient(180deg, #f2f2f7 0%, #e5e5ea 100%)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className='flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top,16px)+8px)] pb-3'>
                <div className='flex items-center gap-2'>
                  <div className='w-8 h-8 rounded-full flex items-center justify-center' style={{
                    background: 'linear-gradient(135deg, #ff6b6b, #ffb347, #ffd166, #34d399, #6c8cff, #9d7bff)',
                  }}>
                    <span className='text-white text-sm font-bold'>♪</span>
                  </div>
                  <span className='text-xl font-semibold' style={{ color: 'var(--text-primary)' }}>Luna 账户</span>
                </div>
                <button
                  onClick={() => setProfileOpen(false)}
                  className='w-9 h-9 rounded-full flex items-center justify-center btn-press'
                  style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
                >
                  <svg className='w-5 h-5' style={{ color: 'var(--text-secondary)' }} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                  </svg>
                </button>
              </div>

              <div className='px-5 pt-4 pb-6 overflow-y-auto no-scrollbar' style={{ height: 'calc(100% - 60px)' }}>
                <div
                  className='rounded-3xl p-4 mb-5'
                  style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)' }}
                >
                  <div className='flex items-center gap-4'>
                    <div className='w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg shrink-0'>
                      {user.name.charAt(0)}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <p className='text-lg font-semibold truncate' style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                      <p className='text-sm mt-0.5' style={{ color: 'var(--text-secondary)' }}>账户信息、付款方式和设置</p>
                    </div>
                    <svg className='w-5 h-5 shrink-0' style={{ color: 'var(--text-secondary)' }} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                    </svg>
                  </div>
                </div>

                <div
                  className='rounded-3xl p-5 mb-5'
                  style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)' }}
                >
                  <p className='text-xl font-semibold mb-2' style={{ color: '#ff3b30' }}>免费畅听 1 个月</p>
                  <p className='text-sm' style={{ color: 'var(--text-secondary)' }}>免费畅听 1 个月，之后 ¥10.99/月。</p>
                </div>

                <div
                  className='rounded-3xl overflow-hidden mb-5'
                  style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)' }}
                >
                  <button className='w-full flex items-center justify-between px-5 py-4 btn-press' style={{ borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                    <span className='text-base' style={{ color: 'var(--text-primary)' }}>购买记录</span>
                    <svg className='w-5 h-5' style={{ color: 'var(--text-secondary)' }} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                    </svg>
                  </button>
                  <button className='w-full flex items-center justify-between px-5 py-4 btn-press'>
                    <span className='text-base' style={{ color: 'var(--text-primary)' }}>通知</span>
                    <svg className='w-5 h-5' style={{ color: 'var(--text-secondary)' }} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                    </svg>
                  </button>
                </div>

                <div className='grid grid-cols-3 gap-3 mb-5'>
                  <button className='flex flex-col items-center justify-center gap-2 py-4 rounded-3xl btn-press' style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)' }}>
                    <span className='text-2xl'>💳</span>
                    <span className='text-sm font-medium' style={{ color: '#ff3b30' }}>充值</span>
                  </button>
                  <button className='flex flex-col items-center justify-center gap-2 py-4 rounded-3xl btn-press' style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)' }}>
                    <span className='text-2xl'>🎁</span>
                    <span className='text-sm font-medium' style={{ color: '#ff3b30' }}>兑换代码</span>
                  </button>
                  <button className='flex flex-col items-center justify-center gap-2 py-4 rounded-3xl btn-press' style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)' }}>
                    <span className='text-2xl'>🎫</span>
                    <span className='text-sm font-medium' style={{ color: '#ff3b30' }}>赠送充值卡</span>
                  </button>
                </div>

                <div
                  className='rounded-3xl overflow-hidden'
                  style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)' }}
                >
                  <button className='w-full flex items-center justify-between px-5 py-4 btn-press'>
                    <div className='flex items-center gap-3'>
                      <span className='text-xl'>⚙️</span>
                      <span className='text-base' style={{ color: '#ff3b30' }}>音乐设置</span>
                    </div>
                    <svg className='w-5 h-5' style={{ color: 'var(--text-secondary)' }} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className='flex-1 min-h-0 relative'>
          {activeTab === 'home' && (
            <section className='absolute inset-0 animate-fade-in' style={{ overflow: 'hidden' }}>
              <HomeView currentTrack={currentTrack} isPlaying={isPlaying} onPlay={handlePlay} onOpenPlayer={() => setPlayerOpen(true)} />
            </section>
          )}
          {activeTab === 'search' && (
            <section className='absolute inset-0 animate-fade-in' style={{ overflow: 'hidden' }}>
              <SearchView currentTrack={currentTrack} onPlay={handlePlay} />
            </section>
          )}
          {activeTab === 'library' && (
            <section className='absolute inset-0 animate-fade-in' style={{ overflow: 'hidden' }}>
              <LibraryView currentTrack={currentTrack} isPlaying={isPlaying} onPlay={handlePlay} />
            </section>
          )}
        </div>

        <div className='pb-[env(safe-area-inset-bottom)]'>
          {currentTrack && (
            <div onClick={() => setPlayerOpen(true)}>
              <MiniPlayer track={currentTrack} playerState={playerState} onTogglePlay={togglePlay} onOpen={() => setPlayerOpen(true)} onNext={playNext} currentTime={currentTime} duration={duration} />
            </div>
          )}
          <TabBar activeTab={activeTab} onChange={handleTabChange} />
        </div>
      </main>

      <FullPlayer track={currentTrack} queue={queue} playerState={playerState} currentTime={currentTime} duration={duration} volume={volume} isMuted={isMuted} repeatMode={repeatMode} isShuffled={isShuffled} isOpen={playerOpen} onClose={() => setPlayerOpen(false)} onTogglePlay={togglePlay} onNext={playNext} onPrev={playPrev} onSeek={seek} onVolumeChange={changeVolume} onToggleMute={toggleMute} onToggleRepeat={toggleRepeat} onToggleShuffle={toggleShuffle} onTrackSelect={handleTrackSelectFromQueue} />

      {ipodMode && (
        <IpodMode
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onPlay={handlePlay}
          onTogglePlay={togglePlay}
          onNext={playNext}
          onPrev={playPrev}
          onExit={() => setIpodMode(false)}
        />
      )}
    </div>
  );
}
