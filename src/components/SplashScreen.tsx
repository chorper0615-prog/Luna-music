import { useEffect, useState } from 'react';

interface Props {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 300);
    const t2 = setTimeout(() => setPhase('out'), 1500);
    const t3 = setTimeout(() => onDone(), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        zIndex: 100,
        background: 'linear-gradient(145deg, #0d0d1a 0%, #1a0a2e 40%, #0d1a2e 100%)',
        opacity: phase === 'out' ? 0 : 1,
        transition: phase === 'out' ? 'opacity 0.5s ease' : phase === 'in' ? 'opacity 0.3s ease' : 'none',
      }}
    >
      {/* Animated blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute animate-blob"
          style={{
            top: '-10%', left: '-10%', width: '60%', height: '60%',
            background: 'radial-gradient(ellipse, rgba(124,58,237,0.4), transparent)',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute animate-blob"
          style={{
            bottom: '-10%', right: '-10%', width: '60%', height: '60%',
            background: 'radial-gradient(ellipse, rgba(59,130,246,0.3), transparent)',
            filter: 'blur(50px)',
            animationDelay: '-4s',
          }}
        />
      </div>

      {/* Logo */}
      <div
        className="relative flex flex-col items-center gap-4"
        style={{
          transform: phase === 'in' ? 'scale(0.8) translateY(20px)' : 'scale(1) translateY(0)',
          opacity: phase === 'in' ? 0 : 1,
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Icon */}
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.8) 0%, rgba(59,130,246,0.6) 100%)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 20px 60px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-white text-3xl font-bold tracking-wide" style={{ letterSpacing: '0.05em' }}>
            Luna
          </h1>
          <p className="text-white text-sm opacity-50 mt-0.5 font-medium tracking-widest uppercase">Music</p>
        </div>

        {/* Loading dots */}
        <div className="flex gap-1.5 mt-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white"
              style={{
                opacity: 0.3,
                animation: `pulse 1.2s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
