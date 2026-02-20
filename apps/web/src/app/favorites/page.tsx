"use client";

import { useState } from "react";
import type { Reel } from "@viralreels/shared";
import { formatCount } from "@viralreels/shared";
import { Heart, Loader2 } from "lucide-react";
import { ReelGrid } from "@/components/reel-grid";
import { ReelModal } from "@/components/reel-modal";
import { useFavorites } from "@/hooks/use-favorites";
import { Button } from "@/components/ui/button";

export default function FavoritesPage() {
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const {
    favorites,
    isLoading,
    refetch,
    isFavorited,
    isCompleted,
    toggleFavorite,
    setFavoriteCompleted,
  } = useFavorites();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Heart className="h-6 w-6 text-pink-500" />
            Favorites
          </h1>
          <p className="text-sm text-muted-foreground">
            {favorites.length > 0
              ? `${formatCount(favorites.length)} favorite reels (completed stays visible)`
              : "No favorites yet. Favorite reels from Dashboard."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Heart className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <ReelGrid
        reels={favorites}
        isLoading={isLoading}
        onReelClick={setSelectedReel}
        isFavorited={isFavorited}
        isCompleted={isCompleted}
        onToggleFavorite={toggleFavorite}
      />

      <ReelModal
        reel={selectedReel}
        onClose={() => setSelectedReel(null)}
        isFavorited={selectedReel ? isFavorited(selectedReel.id) : false}
        isCompleted={selectedReel ? isCompleted(selectedReel.id) : false}
        onToggleFavorite={toggleFavorite}
        onToggleCompleted={setFavoriteCompleted}
      />
    </div>
  );
}
