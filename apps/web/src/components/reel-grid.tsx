"use client";

import type { Reel } from "@viralreels/shared";
import { ReelCard } from "@/components/reel-card";
import { Loader2 } from "lucide-react";

interface ReelGridProps {
  reels: Reel[];
  isLoading?: boolean;
  onReelClick: (reel: Reel) => void;
  isFavorited?: (reelId: string) => boolean;
  isCompleted?: (reelId: string) => boolean;
  onToggleFavorite?: (reelId: string) => void;
}

export function ReelGrid({
  reels,
  isLoading,
  onReelClick,
  isFavorited,
  isCompleted,
  onToggleFavorite,
}: ReelGridProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 text-muted-foreground">
        <p className="text-lg font-medium">No reels found</p>
        <p className="text-sm">
          Try changing your filters or add more accounts in Accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {reels.map((reel) => (
        <ReelCard
          key={reel.id}
          reel={reel}
          onClick={onReelClick}
          isFavorited={isFavorited?.(reel.id)}
          isCompleted={isCompleted?.(reel.id)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
