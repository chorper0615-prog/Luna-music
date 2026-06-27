import { useState, useRef, useEffect } from 'react';
import { searchMusic } from '../api/musicApi';
import { RECOMMEND_KEYWORDS } from '../data/defaultTracks';
import { Track } from '../types/music';

interface Props {
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlay: (track: Track, queue: Track[], index: number) => void;
  onOpenPlayer: () => void;
}

interface Card {
  keyword: string;
  label: string;
  artist: string;
  color: string;
  track?: Track | null;
  loading: boolean;
  coverError: boolean;
}

export default function HomeView({ onPlay }: Props) {
  const [cards, setCards] = useState<Card[]>(
    RECOMMEND_KEYWORDS.map((item) => ({
      ...item,
      track: {
        id: '',
        title: item.label,
        artist: item.artist,
        album: '',
        cover: `https://picsum.photos/seed/${encodeURIComponent(item.keyword)}/300/300`,
        audioUrl: '',
        duration: 0,
        color: item.color,
        vendor: 'netease',
      },
      loading: true,
      coverError: false,
    })),
  );
  const [loadingAll, setLoadingAll] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<number>(0);
  const isPullingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      // 并行加载所有卡片
      const promises = RECOMMEND_KEYWORDS.map(async (item, i) => {
        try {
          const results = await searchMusic(item.keyword);
          const track = results[0] ?? null;
          if (!cancelled && track) {
            setCards((prev) =>
              prev.map((card, idx) =>
                idx === i ? { ...card, loading: false, track, coverError: false } : card,
              ),
            );
          } else if (!cancelled) {
            setCards((prev) =>
              prev.map((card, idx) => (idx === i ? { ...card, loading: false } : card)),
            );
          }
        } catch {
          if (!cancelled) {
            setCards((prev) =>
              prev.map((card, idx) => (idx === i ? { ...card, loading: false } : card)),
            );
          }
        }
      });
      await Promise.all(promises);
    };

    setCards((prev) => prev.map((card) => ({ ...card, loading: true })));
    loadAll();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshAllCards = async () => {
    setIsRefreshing(true);
    setCards((prev) =>
      prev.map((card, i) => ({
        ...card,
        track: {
          id: '',
          title: RECOMMEND_KEYWORDS[i].label,
          artist: RECOMMEND_KEYWORDS[i].artist,
          album: '',
          cover: `https://picsum.photos/seed/${encodeURIComponent(RECOMMEND_KEYWORDS[i].keyword)}/300/300`,
          audioUrl: '',
          duration: 0,
          color: RECOMMEND_KEYWORDS[i].color,
          vendor: 'netease',
        },
        loading: true,
        coverError: false,
      })),
    );

    // 并行加载所有卡片
    const promises = RECOMMEND_KEYWORDS.map(async (item, i) => {
      try {
        const results = await searchMusic(item.keyword);
        const track = results[0] ?? null;
        if (track) {
          setCards((prev) =>
            prev.map((card, idx) =>
              idx === i ? { ...card, loading: false, track, coverError: false } : card,
            ),
          );
        } else {
          setCards((prev) =>
            prev.map((card, idx) => (idx === i ? { ...card, loading: false } : card)),
          );
        }
      } catch {
        setCards((prev) =>
          prev.map((card, idx) => (idx === i ? { ...card, loading: false } : card)),
        );
      }
    });
    await Promise.all(promises);
    setIsRefreshing(false);
  };

  const playFeatured = async () => {
    setLoadingAll(true);
    const allTracks: Track[] = [];
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].track && cards[i].track.id) {
        allTracks.push(cards[i].track);
      } else {
        const results = await searchMusic(RECOMMEND_KEYWORDS[i].keyword);
        const track = results[0];
        if (track) {
          allTracks.push(track);
          setCards((prev) =>
            prev.map((card, idx) =>
              idx === i ? { ...card, track, loading: false, coverError: false } : card,
            ),
          );
        }
      }
    }
    if (allTracks.length > 0) {
      onPlay(allTracks[0], allTracks, 0);
    }
    setLoadingAll(false);
  };

  const playCard = async (index: number) => {
    let track = cards[index].track;
    if (!track || !track.id) {
      const results = await searchMusic(RECOMMEND_KEYWORDS[index].keyword);
      track = results[0] ?? null;
      if (track) {
        setCards((prev) =>
          prev.map((card, i) =>
            i === index ? { ...card, track, loading: false, coverError: false } : card,
          ),
        );
      }
    }
    if (!track || !track.id) return;

    const allTracks: Track[] = [];
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].track && cards[i].track.id) {
        allTracks.push(cards[i].track);
      } else if (i === index && track && track.id) {
        allTracks.push(track);
      }
    }

    onPlay(
      track,
      allTracks.length > 0 ? allTracks : [track],
      Math.max(0, allTracks.findIndex((t) => t.id === track!.id)),
    );
  };

  const handleCoverError = (index: number) => {
    setCards((prev) => prev.map((card, i) => (i === index ? { ...card, coverError: true } : card)));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) {
      touchStartRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current) return;
    const touch = e.touches[0];
    const distance = Math.max(0, touch.clientY - touchStartRef.current);
    if (distance > 0) {
      setPullDistance(Math.min(distance, 120));
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      refreshAllCards();
    }
    setPullDistance(0);
    isPullingRef.current = false;
  };

  return (
    <div
      ref={scrollRef}
      className="w-full h-full overflow-y-auto no-scrollbar"
      style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex flex-col items-center justify-center py-2 transition-all duration-200"
        style={{
          height: pullDistance > 0 ? `${pullDistance}px` : 'auto',
          opacity: pullDistance > 0 ? 1 : 0,
        }}
      >
        {isRefreshing ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <div
            className="text-white/70 text-sm transition-transform duration-200"
            style={{
              transform: `rotate(${Math.min(pullDistance, 60) * 3}deg)`,
            }}
          >
            ↓
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">为你精选</h2>
            <p className="text-xs text-white/55">更接近 Apple Music 的卡片式推荐</p>
          </div>
          <button
            onClick={playFeatured}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
          >
            {loadingAll ? '加载中' : '立即播放'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 animate-stagger">
          {cards.map((card, index) => (
            <button
              key={card.keyword}
              onClick={() => playCard(index)}
              className="music-card overflow-hidden rounded-[24px] border border-white/10 bg-white/8 text-left"
            >
              <div
                className="relative aspect-square overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${card.color}88 0%, rgba(255,255,255,0.06) 100%)`,
                }}
              >
                {card.track && card.track.cover && !card.coverError ? (
                  <img
                    src={card.track.cover}
                    alt={card.label}
                    className="h-full w-full object-cover"
                    onError={() => handleCoverError(index)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl text-white/80">♪</div>
                )}
                {card.loading && <div className="absolute inset-0 bg-black/35" />}
                {card.loading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-semibold text-white">
                  {card.track && card.track.id ? card.track.title : card.label}
                </p>
                <p className="truncate text-xs text-white/55">
                  {card.track && card.track.id ? card.track.artist : card.artist}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
