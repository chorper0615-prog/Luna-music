import { useEffect, useState } from 'react';

interface Props {
  color?: string;
  cover?: string;
  isPlaying?: boolean;
}

export default function DynamicBackground({ color = '#ff6b81', cover, isPlaying }: Props) {
  const [themeColor, setThemeColor] = useState(color);

  useEffect(() => {
    const id = window.setTimeout(() => setThemeColor(color), 120);
    return () => window.clearTimeout(id);
  }, [color]);

  const hex = themeColor.replace('#', '');
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);

  return (
    <div className="fixed inset-0 -z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#050507]" />
      {cover ? (
        <img src={cover} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-3xl" />
      ) : null}
      <div
        className="absolute -left-20 top-[-10%] h-[60vw] w-[60vw] rounded-full blur-3xl animate-float-up"
        style={{
          background: `radial-gradient(circle, rgba(${r},${g},${b},0.42) 0%, rgba(${r},${g},${b},0.05) 58%, transparent 72%)`,
        }}
      />
      <div
        className="absolute right-[-10%] top-[18%] h-[50vw] w-[50vw] rounded-full blur-3xl animate-float-up"
        style={{
          animationDelay: '-2s',
          background: `radial-gradient(circle, rgba(${Math.min(255, r + 50)},${Math.max(0, g - 12)},${Math.min(255, b + 42)},0.28) 0%, transparent 72%)`,
        }}
      />
      <div
        className="absolute left-[20%] bottom-[-8%] h-[48vw] w-[48vw] rounded-full blur-3xl animate-float-up"
        style={{
          animationDelay: '-4s',
          background: `radial-gradient(circle, rgba(${Math.max(0, r - 28)},${Math.min(255, g + 24)},${Math.min(255, b + 18)},0.22) 0%, transparent 70%)`,
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.06),rgba(0,0,0,0.58))]" />
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'180\' height=\'180\' viewBox=\'0 0 180 180\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'180\' height=\'180\' filter=\'url(%23n)\' opacity=\'0.4\'/%3E%3C/svg%3E")',
        }}
      />
      {isPlaying ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute h-56 w-56 rounded-full border border-white/12 animate-pulse-soft" />
          <div className="absolute h-80 w-80 rounded-full border border-white/8 animate-pulse-soft" style={{ animationDelay: '1s' }} />
        </div>
      ) : null}
    </div>
  );
}
