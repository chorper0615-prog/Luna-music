import { useState, useEffect, useCallback } from 'react';
import { Track } from '../types/music';

const STORAGE_KEY = 'luna_favorites';

function loadFavorites(): Track[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(tracks: Track[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
  } catch {}
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Track[]>(loadFavorites);

  useEffect(() => {
    const onStorage = () => setFavorites(loadFavorites());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isFavorite = useCallback((trackId: string) => {
    return favorites.some(t => t.id === trackId);
  }, [favorites]);

  const toggleFavorite = useCallback((track: Track) => {
    setFavorites(prev => {
      const exists = prev.some(t => t.id === track.id);
      let next: Track[];
      if (exists) {
        next = prev.filter(t => t.id !== track.id);
      } else {
        next = [track, ...prev];
      }
      saveFavorites(next);
      return next;
    });
  }, []);

  const addFavorite = useCallback((track: Track) => {
    setFavorites(prev => {
      if (prev.some(t => t.id === track.id)) return prev;
      const next = [track, ...prev];
      saveFavorites(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((trackId: string) => {
    setFavorites(prev => {
      const next = prev.filter(t => t.id !== trackId);
      saveFavorites(next);
      return next;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    clearFavorites,
  };
}
