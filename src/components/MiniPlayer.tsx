import { PlayerState, Track } from '../types/music';
import AlbumArt from './AlbumArt';

interface Props {
  track: Track | null;
  playerState: PlayerState;
  onTogglePlay: () => void;
  onOpen: () => void;
  onNext: () => void;
  currentTime: number;
  duration: number;
  onSeek?: (t: number) => void;
}

function formatTime(value: number) {
  if (!value || Number.isNaN(value)) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return minutes + ':' + seconds;
}

export default function MiniPlayer({
  track,
  playerState,
  onTogglePlay,
  onOpen,
  onNext,
  currentTime,
  duration,
  onSeek,
}: Props) {
  if (!track) return null;

  const isPlaying = playerState === 'playing';
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const time = pct * duration;
    if (time >= 0 && Number.isFinite(time)) onSeek(time);
  };

  return (
    <div className="mx-3 mb-2 overflow-hidden rounded-[26px] border border-white/10 bg-white/10 backdrop-blur-2xl">
      <div className="h-1 bg-white/10 relative cursor-pointer" onClick={handleSeek}>
        <div className="h-full rounded-full bg-white" style={{ width: progress + '%' }} />
      </div>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button onClick={onOpen} className="h-11 w-11 overflow-hidden rounded-2xl">
          <AlbumArt track={track} isPlaying={isPlaying} size="sm" className="h-11 w-11 rounded-2xl" />
        </button>

        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-white">{track.title}</p>
          <p className="truncate text-xs text-white/55">
            {track.artist} {formatTime(currentTime)} / {formatTime(duration)}
          </p>
        </button>

        <button onClick={onTogglePlay} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
          {playerState === 'loading' ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
          ) : isPlaying ? (
            <span className="text-sm font-bold">||</span>
          ) : (
            <span className="ml-0.5 text-sm font-bold">{'>'}</span>
          )}
        </button>

        <button onClick={onNext} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white">
          {'>'}
        </button>
      </div>
    </div>
  );
}
