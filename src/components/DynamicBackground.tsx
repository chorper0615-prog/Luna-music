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
        <div className="absolute inset-0">
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full scale-150 object-cover opacity-20"
            style={{
              filter: 'blur(80px) saturate(180%)',
              transform: 'scale(1.5)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />
        </div>
      ) : null}

      {/* iOS 风格极光流动效果 */}
      <div
        className="absolute -top-32 -left-32 h-[70vw] w-[70vw] rounded-full"
        style={{
          background: `radial-gradient(ellipse at center, rgba(${r},${g},${b},0.35) 0%, rgba(${r},${g},${b},0.1) 40%, transparent 70%)`,
          filter: 'blur(60px)',
          animation: 'aurora-float 20s ease-in-out infinite',
        }}
      />

      <div
        className="absolute -top-20 -right-40 h-[60vw] w-[60vw] rounded-full"
        style={{
          background: `radial-gradient(ellipse at center, rgba(${Math.min(255, r + 60)},${Math.min(255, g + 30)},${Math.min(255, b + 80)},0.28) 0%, transparent 60%)`,
          filter: 'blur(70px)',
          animation: 'aurora-float 25s ease-in-out infinite reverse',
          animationDelay: '-5s',
        }}
      />

      <div
        className="absolute -bottom-40 left-1/4 h-[55vw] w-[55vw] rounded-full"
        style={{
          background: `radial-gradient(ellipse at center, rgba(${Math.max(0, r - 20)},${Math.min(255, g + 50)},${Math.min(255, b + 60)},0.22) 0%, transparent 65%)`,
          filter: 'blur(80px)',
          animation: 'aurora-float 30s ease-in-out infinite',
          animationDelay: '-10s',
        }}
      />

      {/* 中心光晕 */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[40vw] w-[40vw] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(${r},${g},${b},0.12) 0%, transparent 70%)`,
          filter: 'blur(40px)',
        }}
      />

      {/* 顶部高光 */}
      <div
        className="absolute top-0 left-0 right-0 h-1/2"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 60%)',
        }}
      />

      {/* 底部暗部 */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3"
        style={{
          background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
        }}
      />

      {/* 细腻噪点质感 */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\' viewBox=\'0 0 200 200\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3CfeColorMatrix type=\'saturate\' values=\'0\'/%3E%3C/filter%3E%3Crect width=\'200\' height=\'200\' filter=\'url(%23n)\' opacity=\'0.35\'/%3E%3C/svg%3E")',
        }}
      />

      {/* 播放时的呼吸光环 */}
      {isPlaying ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="absolute h-[60vh] w-[60vh] rounded-full"
            style={{
              border: `1px solid rgba(${r},${g},${b},0.08)`,
              animation: 'pulse-ring 4s ease-out infinite',
            }}
          />
          <div
            className="absolute h-[80vh] w-[80vh] rounded-full"
            style={{
              border: `1px solid rgba(${r},${g},${b},0.05)`,
              animation: 'pulse-ring 4s ease-out infinite',
              animationDelay: '1.3s',
            }}
          />
        </div>
      ) : null}

      <style>{`
        @keyframes aurora-float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(8%, 6%) scale(1.08);
          }
          50% {
            transform: translate(-4%, 10%) scale(0.95);
          }
          75% {
            transform: translate(-8%, -4%) scale(1.05);
          }
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(0.9);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
