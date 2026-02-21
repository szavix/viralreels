/** Rising Star detection thresholds */
export const RISING_STAR_HOUR_THRESHOLD = 48;
export const RISING_STAR_VIEW_THRESHOLD = 100_000;

/**
 * Viral score tier thresholds.
 * Scores are on a strict 0..100 scale.
 */
export const VIRAL_SCORE_THRESHOLDS = {
  hot: 10,
  warm: 5,
  mild: 2,
} as const;

/** Colors for viral score tiers */
export const VIRAL_TIER_COLORS = {
  hot: "#ef4444",
  warm: "#f97316",
  mild: "#eab308",
  cold: "#6b7280",
} as const;

/** Apify actor ID for the Instagram Reel Scraper (Reels tab) */
export const APIFY_REEL_SCRAPER_ACTOR = "apify/instagram-reel-scraper";

/** Number of latest reels to fetch per account to control cost */
export const APIFY_REELS_PER_ACCOUNT_LIMIT = 5;

/** Delay between Apify calls to avoid rate limits (ms) */
export const APIFY_CALL_DELAY_MS = 2000;

/** Max retry attempts for Apify calls */
export const APIFY_MAX_RETRIES = 3;

/** Dashboard page size */
export const REELS_PAGE_SIZE = 24;

/** Filter options for the dashboard */
export const FILTER_OPTIONS = {
  all: "All",
  last24h: "Last 24h",
  risingStars: "Rising Stars",
  audioTrending: "Audio Trending",
} as const;

export type FilterOption = keyof typeof FILTER_OPTIONS;

/** Sort options for reel ranking */
export const REEL_SORT_OPTIONS = {
  virality: "Virality",
  views: "Views",
  shares: "Shares",
  comments: "Comments",
} as const;

export type ReelSortOption = keyof typeof REEL_SORT_OPTIONS;
