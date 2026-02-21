/** Input configuration for the Apify instagram-reel-scraper actor */
export interface ApifyReelScraperInput {
  username: string[];
  resultsLimit?: number;
}

/** Dataset item shape returned by instagram-reel-scraper actor */
export interface ApifyReelScraperItem {
  id?: string;
  pk?: string;
  shortcode?: string;
  shortCode?: string;
  reel_url?: string;
  url?: string;
  image?: string;
  displayUrl?: string;
  video_url?: string;
  videoUrl?: string;
  caption?: string;
  hashtags?: string[];
  mentions?: string[];
  comment_count?: number;
  commentsCount?: number;
  like_count?: number;
  likesCount?: number;
  play_count?: number;
  videoViewCount?: number;
  videoPlayCount?: number;
  igPlayCount?: number;
  ownerUsername?: string;
  ownerFullName?: string;
  timestamp?: string;
  created_at?: string;
  crawled_at?: string;
}
