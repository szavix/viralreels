import {
  RISING_STAR_HOUR_THRESHOLD,
  RISING_STAR_VIEW_THRESHOLD,
  VIRAL_SCORE_THRESHOLDS,
} from "../constants";

/**
 * Determine if a reel qualifies as a "Rising Star".
 *
 * Criteria: posted less than 48 hours ago AND > 100k views.
 */
export function isRisingStar(postedAt: Date, views: number): boolean {
  const hoursSincePost =
    (Date.now() - postedAt.getTime()) / (1000 * 60 * 60);
  return (
    hoursSincePost < RISING_STAR_HOUR_THRESHOLD &&
    views > RISING_STAR_VIEW_THRESHOLD
  );
}

/**
 * Get a human-readable label for the viral score tier.
 */
export function getViralTier(
  score: number
): "hot" | "warm" | "mild" | "cold" {
  if (score >= VIRAL_SCORE_THRESHOLDS.hot) return "hot";
  if (score >= VIRAL_SCORE_THRESHOLDS.warm) return "warm";
  if (score >= VIRAL_SCORE_THRESHOLDS.mild) return "mild";
  return "cold";
}

/**
 * Format a large number into a compact form (e.g. 1.2M, 350K).
 */
export function formatCount(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}
