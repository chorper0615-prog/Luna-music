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
     <div className="mx-4 mb-3 overflow-hidden rounded-[28px] border border-white/10 bg-white/8 backdrop-blur-2xl">
       <div className="relative grid grid-cols-3">
         <div className="tab-pill" style={{ left: `${pillStyle.left}px`, width: `${pillStyle.width}px` }} />
         {TABS.map((tab) => {
           const active = tab.id === activeTab;
           const tabIndex = TAB_IDS.indexOf(tab.id);
           return (
             <button
               key={tab.id}
               ref={(el) => { tabRefs.current[tabIndex] = el; }}
               onClick={() => onChange(tab.id)}
               className="flex flex-col items-center gap-1 py-3 touch-active"
             >
               <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${active ? 'bg-white/14' : ''}`}>
                 {tab.icon(active)}
               </div>
               <span className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-white/50'}`}>{tab.label}</span>
             </button>
           );
         })}
       </div>
     </div>
   );
 }
