"use client";

import Image from "next/image";
import type { Reel } from "@viralreels/shared";
import { formatCount, formatTimeAgo } from "@viralreels/shared";
import { Badge } from "@/components/ui/badge";
import { ScoreIndicator } from "@/components/score-indicator";
import { Eye, Heart, MessageCircle, Music, Zap, Play, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ReelCardProps {
  reel: Reel;
  onClick: (reel: Reel) => void;
  isFavorited?: boolean;
  isCompleted?: boolean;
  onToggleFavorite?: (reelId: string) => void;
}

export function ReelCard({
  reel,
  onClick,
  isFavorited = false,
  isCompleted = false,
  onToggleFavorite,
}: ReelCardProps) {
  const postedAgo = formatTimeAgo(reel.posted_at);

  return (
    <button
      onClick={() => onClick(reel)}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/50 text-left"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-muted">
        {reel.thumbnail_url ? (
          <Image
            src={reel.thumbnail_url}
            alt={reel.description ?? "Instagram Reel"}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Play className="h-12 w-12" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
          <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
            <Play className="h-8 w-8 text-white" fill="white" />
          </div>
        </div>

        {/* Top badges */}
        <div className="absolute left-2 right-2 top-2 pr-9">
          <div className="flex flex-wrap items-center gap-1.5">
            <ScoreIndicator score={reel.viral_score} />
            {isCompleted && (
              <Badge className="bg-emerald-500/90 text-white hover:bg-emerald-500">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Done
              </Badge>
            )}
            {reel.is_rising_star && (
              <Badge className="bg-amber-500/90 text-white hover:bg-amber-500">
                <Zap className="mr-1 h-3 w-3" />
                Rising
              </Badge>
            )}
          </div>
        </div>
        {onToggleFavorite && (
          <Button
            type="button"
            size="icon"
            variant={isFavorited ? "default" : "secondary"}
            className={cn(
              "absolute right-2 top-2 z-10 h-7 w-7 rounded-full",
              isFavorited && "bg-pink-500 text-white hover:bg-pink-500/90"
            )}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(reel.id);
            }}
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={cn("h-3.5 w-3.5", isFavorited && "fill-current")} />
          </Button>
        )}

        {/* Audio track */}
        {reel.audio_track && !reel.is_original_audio && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
              <Music className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{reel.audio_track}</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats & info */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Author */}
        <p className="text-sm font-medium text-foreground truncate">
          @{reel.author_username}
        </p>
        {postedAgo && (
          <p className="text-xs text-muted-foreground">{postedAgo}</p>
        )}

        {/* Caption preview */}
        {reel.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {reel.description}
          </p>
        )}

        {/* Engagement stats */}
        <div className="mt-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {formatCount(reel.view_count)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            {formatCount(reel.like_count)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {formatCount(reel.comment_count)}
          </span>
        </div>
      </div>
    </button>
  );
}
