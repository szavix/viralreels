import { getViralTier, VIRAL_TIER_COLORS } from "@viralreels/shared";
import { cn } from "@/lib/utils";

interface ScoreIndicatorProps {
  score: number;
  className?: string;
}

export function ScoreIndicator({ score, className }: ScoreIndicatorProps) {
  const tier = getViralTier(score);

  const tierLabel = {
    hot: "HOT",
    warm: "WARM",
    mild: "MILD",
    cold: "COLD",
  }[tier];

  const tierBg = {
    hot: "bg-red-500/20 text-red-400 border-red-500/30",
    warm: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    mild: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    cold: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  }[tier];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold",
        tierBg,
        className
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: VIRAL_TIER_COLORS[tier] }}
      />
      {tierLabel} {score.toFixed(1)}%
    </div>
  );
}
