import { useState } from 'react';
import { Track } from '../types/music';

interface Props {
  track: Track | null;
  isPlaying: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const GRADIENT_COLORS = [
  'from-violet-600 to-indigo-800',
  'from-pink-600 to-rose-800',
  'from-amber-500 to-orange-700',
  'from-emerald-500 to-teal-700',
  'from-sky-500 to-blue-700',
  'from-fuchsia-500 to-purple-800',
];

export default function AlbumArt({ track, isPlaying, size = 'lg', className = '' }: Props) {
  const [imgError, setImgError] = useState(false);

  const gradientClass = track
    ? GRADIENT_COLORS[track.id.charCodeAt(6) % GRADIENT_COLORS.length]
    : 'from-violet-600 to-indigo-800';

  const sizeMap = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-full h-full',
  };

  const renderFallback = () => (
    <div className={`${sizeMap[size]} bg-gradient-to-br ${gradientClass} flex items-center justify-center ${className}`}>
      <svg className="w-1/3 h-1/3 text-white opacity-60" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
      </svg>
    </div>
  );

  return (
    <div
      className={`relative overflow-hidden ${sizeMap[size]} ${className}`}
      style={{
        boxShadow: isPlaying
          ? `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${track?.color || '#7C3AED'}40`
          : '0 10px 40px rgba(0,0,0,0.4)',
        transform: isPlaying ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.5s ease',
      }}
    >
      {track?.cover && !imgError ? (
        <img
          src={track.cover}
          alt={track.title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          style={{
            filter: isPlaying ? 'brightness(1.05) saturate(1.1)' : 'brightness(0.95)',
            transition: 'filter 0.5s ease',
          }}
        />
      ) : (
        renderFallback()
      )}

      {/* Shine overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
        }}
      />
    </div>
  );
}
