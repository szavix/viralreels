/** Rising Star detection thresholds */
export const RISING_STAR_HOUR_THRESHOLD = 48;
export const RISING_STAR_VIEW_THRESHOLD = 100_000;

/**
 * Viral score tier thresholds.
 * With the real formula (Likes + Comments) / FollowerCount,
 * typical values are higher than the old engagement-rate proxy.
 */
export const VIRAL_SCORE_THRESHOLDS = {
  hot: 0.1,
  warm: 0.05,
  mild: 0.02,
} as const;

/** Colors for viral score tiers */
export const VIRAL_TIER_COLORS = {
  hot: "#ef4444",
  warm: "#f97316",
  mild: "#eab308",
  cold: "#6b7280",
} as const;

/** Apify actor ID for the Instagram Profile Scraper */
export const APIFY_PROFILE_SCRAPER_ACTOR = "apify/instagram-profile-scraper";

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
