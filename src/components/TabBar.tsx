import { ReactElement, useEffect, useRef, useState } from 'react';
import { Tab } from '../types/music';

interface Props {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; icon: (active: boolean) => ReactElement }[] = [
  {
    id: 'home',
    label: '首页',
    icon: (active) => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill={active ? 'white' : 'rgba(255,255,255,0.48)'}>
        <path d="M12 3l9 8h-3v10H6V11H3l9-8z" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: '搜索',
    icon: (active) => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={active ? 'white' : 'rgba(255,255,255,0.48)'} strokeWidth="2.3">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'library',
    label: '资料库',
    icon: (active) => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill={active ? 'white' : 'rgba(255,255,255,0.48)'}>
        <rect x="4" y="5" width="16" height="14" rx="2" opacity=".2" />
        <path d="M6 7h12v2H6zm0 4h12v2H6zm0 4h8v2H6z" />
      </svg>
    ),
  },
];

const TAB_IDS = TABS.map(t => t.id);

export default function TabBar({ activeTab, onChange }: Props) {
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const idx = TAB_IDS.indexOf(activeTab);
    const el = tabRefs.current[idx];
    if (el) {
      const parent = el.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        setPillStyle({
          left: elRect.left - parentRect.left,
          width: elRect.width,
        });
      }
    }
  }, [activeTab]);

  return (
    <div className="mx-4 mb-3 overflow-hidden">
      <div 
        className="relative overflow-hidden"
        style={{
          borderRadius: '28px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.08) 100%)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: `
            0 15px 40px rgba(0,0,0,0.4),
            0 4px 16px rgba(0,0,0,0.3),
            inset 0 1.5px 0 rgba(255,255,255,0.2),
            inset 0 -1px 0 rgba(0,0,0,0.2)
          `,
        }}
      >
        {/* 内部微光照 */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.02) 100%)',
          }}
        />
        
        {/* 边框高光 */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: '28px',
            padding: '1px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 25%, transparent 75%, rgba(255,255,255,0.1) 100%)',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'xor',
            WebkitMaskComposite: 'xor',
          }}
        />

        <div className="relative grid grid-cols-3">
          {/* 活动指示胶囊 - 液态玻璃 */}
          <div 
            className="tab-pill"
            style={{ 
              left: `${pillStyle.left}px`, 
              width: `${pillStyle.width}px`,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.16) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: `
                0 4px 16px rgba(0,0,0,0.25),
                0 2px 8px rgba(0,0,0,0.15),
                inset 0 1px 0 rgba(255,255,255,0.3),
                inset 0 -1px 0 rgba(0,0,0,0.1)
              `,
            }}
          />
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            const tabIndex = TAB_IDS.indexOf(tab.id);
            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[tabIndex] = el; }}
                onClick={() => onChange(tab.id)}
                className="flex flex-col items-center gap-1 py-3 touch-active transition-all duration-200 active:scale-95"
              >
                <div 
                  className="flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-300"
                  style={{
                    background: active 
                      ? 'linear-gradient(145deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)' 
                      : 'transparent',
                    boxShadow: active
                      ? '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)'
                      : 'none',
                    border: active ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
                  }}
                >
                  {tab.icon(active)}
                </div>
                <span 
                  className="text-[11px] font-semibold transition-all duration-200"
                  style={{ color: active ? '#fff' : 'rgba(255,255,255,0.5)' }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
