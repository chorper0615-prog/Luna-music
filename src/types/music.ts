export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  audioUrl: string;
  duration: number;
  color?: string;
  mid?: string;
  vendor?: string;
}

export interface ApiResponse {
  status: string;
  data?: {
    title?: string;
    author?: string;
    pic?: string;
    url?: string;
    lrc?: string;
    time?: number;
    name?: string;
    singer?: string;
    cover?: string;
    audio?: string;
    duration?: number;
    [key: string]: any;
  };
  msg?: string;
  message?: string;
  [key: string]: any;
}

export type PlayerState = 'playing' | 'paused' | 'loading' | 'idle';
export type RepeatMode = 'none' | 'one' | 'all';
export type Tab = 'home' | 'search' | 'library' | 'player';
