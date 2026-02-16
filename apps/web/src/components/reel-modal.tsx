"use client";

import type { Reel } from "@viralreels/shared";
import { formatCount } from "@viralreels/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScoreIndicator } from "@/components/score-indicator";
import {
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Music,
  Zap,
  ExternalLink,
  Clock,
  User,
  Calendar,
} from "lucide-react";

interface ReelModalProps {
  reel: Reel | null;
  onClose: () => void;
}

export function ReelModal({ reel, onClose }: ReelModalProps) {
  if (!reel) return null;

  const postedDate = reel.posted_at
    ? new Date(reel.posted_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown";

  const duration = reel.video_duration
    ? `${Math.floor(reel.video_duration / 60)}:${Math.floor(reel.video_duration % 60)
        .toString()
        .padStart(2, "0")}`
    : null;

  return (
    <Dialog open={!!reel} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              @{reel.author_username}
            </DialogTitle>
            <ScoreIndicator score={reel.viral_score} />
            {reel.is_rising_star && (
              <Badge className="bg-amber-500/90 text-white">
                <Zap className="mr-1 h-3 w-3" />
                Rising Star
              </Badge>
            )}
          </div>
          <DialogDescription className="sr-only">
            Reel by @{reel.author_username}
          </DialogDescription>
        </DialogHeader>

        {/* Video player */}
        <div className="relative aspect-[9/16] max-h-[50vh] w-full overflow-hidden rounded-lg bg-black">
          {reel.video_url ? (
            <video
              src={reel.video_url}
              controls
              autoPlay
              playsInline
              className="h-full w-full object-contain"
              poster={reel.thumbnail_url ?? undefined}
            />
          ) : reel.thumbnail_url ? (
            <img
              src={reel.thumbnail_url}
              alt="Reel thumbnail"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Video not available
            </div>
          )}

          {/* Duration badge */}
          {duration && (
            <div className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 text-xs text-white backdrop-blur-sm">
              <Clock className="mr-1 inline h-3 w-3" />
              {duration}
            </div>
          )}
        </div>

        {/* Engagement stats */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard icon={Eye} label="Views" value={formatCount(reel.view_count)} />
          <StatCard icon={Heart} label="Likes" value={formatCount(reel.like_count)} />
          <StatCard
            icon={MessageCircle}
            label="Comments"
            value={formatCount(reel.comment_count)}
          />
          <StatCard icon={Share2} label="Shares" value={formatCount(reel.share_count)} />
        </div>

        <Separator />

        {/* Caption */}
        {reel.description && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Caption</h4>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {reel.description}
            </p>
          </div>
        )}

        {/* Audio */}
        {reel.audio_track && (
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-3">
            <Music className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{reel.audio_track}</p>
              <p className="text-xs text-muted-foreground">
                {reel.is_original_audio ? "Original Audio" : "Trending Audio"}
              </p>
            </div>
          </div>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {postedDate}
          </span>
          {reel.author_full_name && (
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {reel.author_full_name}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <a
              href={reel.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open on Instagram
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-border/50 bg-muted/30 p-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
