"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Reel } from "@viralreels/shared";

export interface FavoriteReel extends Reel {
  completed: boolean;
  favorited_at: string;
}

interface FavoritesResponse {
  reels: FavoriteReel[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteReel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/favorites?page=1&pageSize=1000");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as FavoritesResponse;
      setFavorites(data.reels ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch favorites");
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const favoritesMap = useMemo(() => {
    const map = new Map<string, { completed: boolean }>();
    for (const favorite of favorites) {
      map.set(favorite.id, { completed: favorite.completed });
    }
    return map;
  }, [favorites]);

  const isFavorited = useCallback(
    (reelId: string) => favoritesMap.has(reelId),
    [favoritesMap]
  );

  const isCompleted = useCallback(
    (reelId: string) => favoritesMap.get(reelId)?.completed ?? false,
    [favoritesMap]
  );

  const toggleFavorite = useCallback(
    async (reelId: string) => {
      if (isFavorited(reelId)) {
        const response = await fetch(`/api/favorites/${reelId}`, { method: "DELETE" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setFavorites((prev) => prev.filter((favorite) => favorite.id !== reelId));
        return;
      }

      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reelId }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // Re-sync so cards and favorites page stay consistent.
      await fetchFavorites();
    },
    [fetchFavorites, isFavorited]
  );

  const setFavoriteCompleted = useCallback(
    async (reelId: string, completed: boolean) => {
      const response = await fetch(`/api/favorites/${reelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      setFavorites((prev) =>
        prev.map((favorite) =>
          favorite.id === reelId ? { ...favorite, completed } : favorite
        )
      );
    },
    []
  );

  return {
    favorites,
    isLoading,
    error,
    refetch: fetchFavorites,
    isFavorited,
    isCompleted,
    toggleFavorite,
    setFavoriteCompleted,
  };
}
