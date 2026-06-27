import { useCallback, useRef } from 'react';

interface Props {
  value: number;
  max: number;
  onChange: (value: number) => void;
  height?: number;
  thumbSize?: number;
  trackColor?: string;
  progressColor?: string;
  thumbColor?: string;
  className?: string;
}

export default function ProgressBar({
  value,
  max,
  onChange,
  height = 4,
  thumbSize = 14,
  trackColor = 'rgba(255,255,255,0.15)',
  progressColor = '#ffffff',
  thumbColor = '#ffffff',
  className = '',
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const getValueFromX = useCallback((clientX: number): number => {
    if (!trackRef.current || max <= 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * max;
  }, [max]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    trackRef.current?.setPointerCapture(e.pointerId);
    const val = getValueFromX(e.clientX);
    onChange(val);
  }, [getValueFromX, onChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    const val = getValueFromX(e.clientX);
    onChange(val);
  }, [getValueFromX, onChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      trackRef.current?.releasePointerCapture(e.pointerId);
    } catch (_) {}
    const val = getValueFromX(e.clientX);
    onChange(val);
  }, [getValueFromX, onChange]);

  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

  return (
    <div
      ref={trackRef}
      className={`relative w-full cursor-pointer select-none touch-none ${className}`}
      style={{ padding: `${thumbSize / 2}px 0` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="relative w-full rounded-full overflow-hidden"
        style={{ height: `${height}px`, background: trackColor }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 rounded-full"
          style={{
            width: `${percent}%`,
            background: progressColor,
            boxShadow: '0 0 8px rgba(255,255,255,0.3)',
          }}
        />
      </div>
      <div
        className="absolute top-1/2 rounded-full shadow-lg pointer-events-none"
        style={{
          width: `${thumbSize}px`,
          height: `${thumbSize}px`,
          left: `calc(${percent}% - ${thumbSize / 2}px)`,
          transform: 'translateY(-50%)',
          background: thumbColor,
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  );
}
