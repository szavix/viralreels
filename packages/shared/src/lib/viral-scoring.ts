type ViralCategory =
  | "Underperforming"
  | "Average"
  | "Strong"
  | "Viral"
  | "Exploding";

export interface ReelViralityInput {
  follower_count?: number | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  date_posted?: string | Date | null;
  daily_views_history?: Array<number | null | undefined>;
  last_10_reels_views?: Array<number | null | undefined>;
}

export interface ReelViralityMetrics {
  view_to_follower_ratio: number;
  engagement_rate_per_view: number;
  share_rate: number;
  baseline_views: number;
  virality_multiplier: number;
  acceleration: number;
}

export interface ReelViralityScoreResult extends ReelViralityMetrics {
  viral_score: number;
  viral_category: ViralCategory;
}

interface PercentileBounds {
  lower: number;
  upper: number;
}

function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return numerator / denominator;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function toFinite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function toSafeCount(value: number | null | undefined): number {
  const finite = Number.isFinite(value) ? Number(value) : 0;
  return finite > 0 ? finite : 0;
}

function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const idx = (sortedValues.length - 1) * percentile;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);

  if (lower === upper) return sortedValues[lower];

  const weight = idx - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function getOutlierBounds(values: number[]): PercentileBounds {
  const finiteValues = values.map(toFinite);
  if (finiteValues.length < 5) {
    return {
      lower: Math.min(...finiteValues),
      upper: Math.max(...finiteValues),
    };
  }

  const sorted = [...finiteValues].sort((a, b) => a - b);
  return {
    lower: calculatePercentile(sorted, 0.05),
    upper: calculatePercentile(sorted, 0.95),
  };
}

function minMaxNormalize(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return 0;
  if (max <= min) return 0;
  return (value - min) / (max - min);
}

function getViralCategory(score: number): ViralCategory {
  if (score < 30) return "Underperforming";
  if (score < 50) return "Average";
  if (score < 70) return "Strong";
  if (score < 85) return "Viral";
  return "Exploding";
}

/**
 * Calculate raw virality metrics for a single reel.
 */
export function calculateReelViralityMetrics(
  reel: ReelViralityInput
): ReelViralityMetrics {
  const followerCount = toSafeCount(reel.follower_count);
  const views = toSafeCount(reel.views);
  const likes = toSafeCount(reel.likes);
  const comments = toSafeCount(reel.comments);
  const shares = toSafeCount(reel.shares);

  const view_to_follower_ratio = safeDivide(views, followerCount);
  const engagement_rate_per_view = safeDivide(likes + comments, views);
  const share_rate = safeDivide(shares, views);

  const last10 = (reel.last_10_reels_views ?? [])
    .map((value) => toSafeCount(value))
    .filter((value) => value >= 0);
  const baseline_views = average(last10);
  const virality_multiplier = safeDivide(views, baseline_views);

  let acceleration = 0;
  const history = (reel.daily_views_history ?? []).map((value) => toSafeCount(value));
  if (history.length >= 2) {
    const latestViews = history[history.length - 1];
    const previousDayViews = history[history.length - 2];
    acceleration = safeDivide(latestViews - previousDayViews, followerCount);
  }

  return {
    view_to_follower_ratio,
    engagement_rate_per_view,
    share_rate,
    baseline_views,
    virality_multiplier,
    acceleration,
  };
}

/**
 * Calculate full virality scores for tracked reels using:
 * - outlier capping (5th/95th percentile)
 * - min-max normalization across the input batch
 * - weighted composite score, clamped to [0, 100]
 */
export function calculateViralityScores(
  reels: ReelViralityInput[]
): ReelViralityScoreResult[] {
  if (reels.length === 0) return [];

  const metrics = reels.map(calculateReelViralityMetrics);

  const vfrValues = metrics.map((m) => m.view_to_follower_ratio);
  const ervValues = metrics.map((m) => m.engagement_rate_per_view * 10);
  const multiplierValues = metrics.map((m) => m.virality_multiplier);
  const accelerationValues = metrics.map((m) => m.acceleration);

  const vfrBounds = getOutlierBounds(vfrValues);
  const ervBounds = getOutlierBounds(ervValues);
  const multiplierBounds = getOutlierBounds(multiplierValues);
  const accelerationBounds = getOutlierBounds(accelerationValues);

  return metrics.map((metric) => {
    const vfrCapped = clamp(metric.view_to_follower_ratio, vfrBounds.lower, vfrBounds.upper);
    const ervCapped = clamp(metric.engagement_rate_per_view * 10, ervBounds.lower, ervBounds.upper);
    const multiplierCapped = clamp(metric.virality_multiplier, multiplierBounds.lower, multiplierBounds.upper);
    const accelerationCapped = clamp(metric.acceleration, accelerationBounds.lower, accelerationBounds.upper);

    const vfrNorm = minMaxNormalize(vfrCapped, vfrBounds.lower, vfrBounds.upper);
    const ervNorm = minMaxNormalize(ervCapped, ervBounds.lower, ervBounds.upper);
    const multiplierNorm = minMaxNormalize(
      multiplierCapped,
      multiplierBounds.lower,
      multiplierBounds.upper
    );
    const accelerationNorm = minMaxNormalize(
      accelerationCapped,
      accelerationBounds.lower,
      accelerationBounds.upper
    );

    const weighted =
      0.4 * vfrNorm +
      0.35 * ervNorm +
      0.2 * multiplierNorm +
      0.05 * accelerationNorm;

    const viral_score = clamp(weighted * 100, 0, 100);

    return {
      ...metric,
      viral_score: Math.round(viral_score * 100) / 100,
      viral_category: getViralCategory(viral_score),
    };
  });
}
