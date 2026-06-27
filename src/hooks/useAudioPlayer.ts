import { useCallback, useEffect, useRef, useState } from 'react';
import { PlayerState, RepeatMode, Track } from '../types/music';
import { getSongUrl } from '../api/musicApi';

const HISTORY_KEY = 'luna_play_history';
const MAX_HISTORY = 100;

function shuffleTracks<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function loadHistory(): Track[] {
  try { const raw = localStorage.getItem(HISTORY_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveHistory(track: Track) {
  const history = loadHistory();
  const filtered = history.filter((t) => t.id !== track.id);
  const updated = [track, ...filtered].slice(0, MAX_HISTORY);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { /* quota exceeded */ }
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const latestTrackRef = useRef<string | null>(null);
  const queueRef = useRef<Track[]>([]);
  const indexRef = useRef(0);
  const repeatRef = useRef<RepeatMode>('none');
  const shuffledRef = useRef(false);
  const shuffledQueueRef = useRef<Track[]>([]);
  const isSeekingRef = useRef(false);
  const seekTimeoutRef = useRef<number | null>(null);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueueState] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledQueue, setShuffledQueue] = useState<Track[]>([]);

  useEffect(() => { repeatRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { shuffledRef.current = isShuffled; }, [isShuffled]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { indexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { shuffledQueueRef.current = shuffledQueue; }, [shuffledQueue]);

  const playNextRef = useRef<() => void>(() => {});
  const playPrevRef = useRef<() => void>(() => {});

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = volume;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (!isSeekingRef.current) {
        setCurrentTime(audio.currentTime);
      }
    };
    const onDurationChange = () => {
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(dur);
    };
    const onLoadedMetadata = () => {
      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(dur);
    };
    const onEnded = () => {
      if (repeatRef.current === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      playNextRef.current();
    };
    const onPlay = () => setPlayerState('playing');
    const onPause = () => setPlayerState('paused');
    const onWaiting = () => setPlayerState('loading');
    const onCanPlay = () => {
      if (!audio.paused) {
        setPlayerState('playing');
      } else {
        setPlayerState((prev) => (prev === 'loading' ? 'paused' : prev));
      }
    };
    const onError = () => setPlayerState('idle');
    const onSeeking = () => {
      isSeekingRef.current = true;
    };
    const onSeeked = () => {
      isSeekingRef.current = false;
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = null;
      }
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);
    audio.addEventListener('seeking', onSeeking);
    audio.addEventListener('seeked', onSeeked);

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const doPlay = useCallback(async (track: Track, newQueue?: Track[], index = 0) => {
    const audio = audioRef.current;
    if (!audio) return;

    latestTrackRef.current = track.id;
    const nextQueue = newQueue ?? queueRef.current;

    setCurrentTrack(track);
    setQueueIndex(index);
    queueRef.current = nextQueue;
    indexRef.current = index;

    if (newQueue) {
      setQueueState(nextQueue);
      const shuffled = shuffleTracks(nextQueue);
      setShuffledQueue(shuffled);
      shuffledQueueRef.current = shuffled;
    }

    saveHistory(track);
    setPlayerState('loading');
    setCurrentTime(0);
    setDuration(0);

    let url = track.audioUrl || await getSongUrl(track);
    if (!url) {
      setPlayerState('idle');
      return;
    }

    if (latestTrackRef.current !== track.id) return;

    audio.src = url;
    audio.load();

    audio.play().catch(() => {
      if (audio.paused) setPlayerState('paused');
    });
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [currentTrack]);

  const playNext = useCallback(() => {
    const activeQueue = shuffledRef.current ? shuffledQueueRef.current : queueRef.current;
    if (activeQueue.length === 0) return;
    const nextIndex = repeatRef.current === 'all'
      ? (indexRef.current + 1) % activeQueue.length
      : Math.min(indexRef.current + 1, activeQueue.length - 1);
    const nextTrack = activeQueue[nextIndex];
    if (!nextTrack) return;
    setQueueIndex(nextIndex);
    indexRef.current = nextIndex;
    doPlay(nextTrack, undefined, nextIndex);
  }, [doPlay]);

  const playPrev = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const activeQueue = shuffledRef.current ? shuffledQueueRef.current : queueRef.current;
    if (activeQueue.length === 0) return;
    const prevIndex = Math.max(indexRef.current - 1, 0);
    const prevTrack = activeQueue[prevIndex];
    if (!prevTrack) return;
    setQueueIndex(prevIndex);
    indexRef.current = prevIndex;
    doPlay(prevTrack, undefined, prevIndex);
  }, [doPlay]);

  useEffect(() => {
    playNextRef.current = playNext;
    playPrevRef.current = playPrev;
  }, [playNext, playPrev]);

  const playTrack = useCallback((track: Track, newQueue?: Track[], index = 0) => {
    doPlay(track, newQueue, index);
  }, [doPlay]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!Number.isFinite(time) || time < 0) return;

    const dur = Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : duration;

    const targetTime = dur > 0 ? Math.max(0, Math.min(dur, time)) : Math.max(0, time);
    if (!Number.isFinite(targetTime)) return;

    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }

    isSeekingRef.current = true;
    setCurrentTime(targetTime);

    seekTimeoutRef.current = window.setTimeout(() => {
      isSeekingRef.current = false;
      seekTimeoutRef.current = null;
    }, 3000);

    try {
      audio.currentTime = targetTime;
    } catch (e) {
      console.warn('seek error:', e);
      isSeekingRef.current = false;
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = null;
      }
    }
  }, [duration]);

  const changeVolume = useCallback((val: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = val;
    audio.muted = val === 0;
    setVolume(val);
    setIsMuted(val === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const n = !isMuted;
    audio.muted = n;
    setIsMuted(n);
  }, [isMuted]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((p) => p === 'none' ? 'all' : p === 'all' ? 'one' : 'none');
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffled((p) => {
      const n = !p;
      if (n) {
        const shuffled = shuffleTracks(queueRef.current);
        setShuffledQueue(shuffled);
        shuffledQueueRef.current = shuffled;
      }
      return n;
    });
  }, []);

  const setQueue = useCallback((nextQueue: Track[]) => {
    queueRef.current = nextQueue;
    setQueueState(nextQueue);
    const shuffled = shuffleTracks(nextQueue);
    setShuffledQueue(shuffled);
    shuffledQueueRef.current = shuffled;
  }, []);

  return {
    currentTrack, queue, queueIndex, playerState, currentTime, duration,
    volume, isMuted, repeatMode, isShuffled,
    playTrack, togglePlay, playNext, playPrev,
    seek, changeVolume, toggleMute, toggleRepeat, toggleShuffle, setQueue,
  };
}
