import { useEffect, useState } from 'react';

interface Props {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 200);
    const t2 = setTimeout(() => setPhase('out'), 2200);
    const t3 = setTimeout(() => onDone(), 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    if (phase === 'hold') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) return 100;
          const increment = prev < 30 ? 3 : prev < 60 ? 2 : prev < 85 ? 1 : 0.5;
          return Math.min(prev + increment, 100);
        });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [phase]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{
        zIndex: 100,
        background: 'linear-gradient(180deg, #0a0a0f 0%, #0f0f18 50%, #0a0a0f 100%)',
        opacity: phase === 'out' ? 0 : 1,
        transform: phase === 'out' ? 'scale(1.05)' : 'scale(1)',
        transition: phase === 'out' 
          ? 'opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1), transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)' 
          : phase === 'in' 
            ? 'opacity 0.4s ease, transform 0.4s ease' 
            : 'none',
      }}
    >
      {/* 动态极光背景 */}
      <div className="absolute inset-0 overflow-hidden">
        {/* 主光团 - 左上粉色 */}
        <div
          className="absolute rounded-full"
          style={{
            top: '-20%',
            left: '-15%',
            width: '70%',
            height: '60%',
            background: 'radial-gradient(ellipse at center, rgba(255, 107, 129, 0.25) 0%, transparent 60%)',
            filter: 'blur(60px)',
            animation: 'aurora-float 8s ease-in-out infinite',
          }}
        />
        {/* 右上蓝色 */}
        <div
          className="absolute rounded-full"
          style={{
            top: '-10%',
            right: '-20%',
            width: '65%',
            height: '55%',
            background: 'radial-gradient(ellipse at center, rgba(81, 168, 255, 0.22) 0%, transparent 60%)',
            filter: 'blur(70px)',
            animation: 'aurora-float 10s ease-in-out infinite reverse',
            animationDelay: '-2s',
          }}
        />
        {/* 底部紫色 */}
        <div
          className="absolute rounded-full"
          style={{
            bottom: '-25%',
            left: '20%',
            width: '60%',
            height: '50%',
            background: 'radial-gradient(ellipse at center, rgba(147, 112, 255, 0.2) 0%, transparent 60%)',
            filter: 'blur(65px)',
            animation: 'aurora-float 12s ease-in-out infinite',
            animationDelay: '-4s',
          }}
        />
        {/* 右下青色 */}
        <div
          className="absolute rounded-full"
          style={{
            bottom: '-15%',
            right: '-10%',
            width: '50%',
            height: '45%',
            background: 'radial-gradient(ellipse at center, rgba(64, 224, 208, 0.18) 0%, transparent 60%)',
            filter: 'blur(55px)',
            animation: 'aurora-float 9s ease-in-out infinite reverse',
            animationDelay: '-6s',
          }}
        />
      </div>

      {/* 噪点纹理 */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 主内容 */}
      <div
        className="relative flex flex-col items-center"
        style={{
          transform: phase === 'in' 
            ? 'scale(0.85) translateY(30px)' 
            : phase === 'out'
              ? 'scale(1.08) translateY(-10px)'
              : 'scale(1) translateY(0)',
          opacity: phase === 'in' ? 0 : phase === 'out' ? 0.3 : 1,
          transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Logo 容器 - 液态玻璃 */}
        <div
          className="relative w-28 h-28 rounded-[32px] flex items-center justify-center mb-6"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 40%, rgba(0,0,0,0.1) 100%)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: `
              0 25px 80px rgba(255, 107, 129, 0.2),
              0 10px 40px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.3),
              inset 0 -1px 0 rgba(0, 0, 0, 0.1)
            `,
          }}
        >
          {/* 顶部高光 */}
          <div
            className="absolute top-0 left-0 right-0 h-1/2 rounded-t-[32px]"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />
          
          {/* 底部光泽 */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1/3 rounded-b-[32px]"
            style={{
              background: 'linear-gradient(0deg, rgba(255,107,129,0.1) 0%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* 音符图标 */}
          <div className="relative z-10" style={{ animation: 'logo-bounce 2s ease-in-out infinite' }}>
            <svg className="w-14 h-14" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="musicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff6b81" />
                  <stop offset="50%" stopColor="#ff8f5a" />
                  <stop offset="100%" stopColor="#ffd166" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <path 
                d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
                fill="url(#musicGradient)"
                filter="url(#glow)"
              />
            </svg>
          </div>

          {/* 光晕效果 */}
          <div
            className="absolute inset-0 rounded-[32px] pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 40px rgba(255, 107, 129, 0.15)',
              animation: 'glow-pulse 3s ease-in-out infinite',
            }}
          />
        </div>

        {/* App 名称 */}
        <div className="text-center mb-8">
          <h1 
            className="text-white text-4xl font-bold tracking-tight"
            style={{
              textShadow: '0 0 40px rgba(255, 107, 129, 0.3)',
              animation: 'title-float 4s ease-in-out infinite',
            }}
          >
            Luna
          </h1>
          <p className="text-white/50 text-sm mt-1 font-medium tracking-[0.2em] uppercase">
            Music
          </p>
        </div>

        {/* 液态玻璃进度条容器 */}
        <div className="relative w-56">
          <div
            className="relative h-2 rounded-full overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.2)',
            }}
          >
            {/* 进度条 */}
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all duration-150 ease-out"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #ff6b81 0%, #ff8f5a 50%, #ffd166 100%)',
                boxShadow: '0 0 10px rgba(255, 107, 129, 0.5), 0 0 20px rgba(255, 143, 90, 0.3)',
              }}
            >
              {/* 进度条高光 */}
              <div
                className="absolute top-0 left-0 right-0 h-1/2 rounded-t-full"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)',
                }}
              />
            </div>

            {/* 流光效果 */}
            <div
              className="absolute top-0 h-full w-1/3 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                animation: 'shimmer 1.5s ease-in-out infinite',
              }}
            />
          </div>

          {/* 进度数字 */}
          <div className="flex justify-between mt-2 px-0.5">
            <span className="text-white/40 text-xs font-medium">加载中...</span>
            <span className="text-white/60 text-xs font-mono">{Math.floor(progress)}%</span>
          </div>
        </div>

        {/* 底部装饰 - 液态玻璃 pill */}
        <div
          className="mt-10 px-4 py-2 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            opacity: phase === 'hold' ? 1 : 0,
            transition: 'opacity 0.5s ease 0.5s',
          }}
        >
          <div className="flex items-center gap-2">
            {/* 音乐波形动画 */}
            <div className="flex items-end gap-0.5 h-4">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="w-1 rounded-full"
                  style={{
                    background: 'linear-gradient(180deg, #ff6b81, #ff8f5a)',
                    animation: `wave-bar 1.2s ease-in-out infinite`,
                    animationDelay: `${i * 0.12}s`,
                    height: '100%',
                  }}
                />
              ))}
            </div>
            <span className="text-white/60 text-xs font-medium">准备音乐...</span>
          </div>
        </div>
      </div>

      {/* 全局样式 */}
      <style>{`
        @keyframes aurora-float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(30px, -20px) scale(1.05);
          }
          50% {
            transform: translate(-20px, 15px) scale(0.98);
          }
          75% {
            transform: translate(-30px, -10px) scale(1.02);
          }
        }
        
        @keyframes logo-bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        
        @keyframes title-float {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.9;
          }
        }
        
        @keyframes glow-pulse {
          0%, 100% {
            box-shadow: inset 0 0 40px rgba(255, 107, 129, 0.15);
          }
          50% {
            box-shadow: inset 0 0 60px rgba(255, 107, 129, 0.25), inset 0 0 30px rgba(255, 143, 90, 0.2);
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
        
        @keyframes wave-bar {
          0%, 100% {
            transform: scaleY(0.3);
          }
          50% {
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}
