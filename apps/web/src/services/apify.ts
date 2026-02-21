import { ApifyClient } from "apify-client";
import type {
  ApifyReelScraperItem,
  ReelInsert,
  Account,
} from "@viralreels/shared";
import {
  calculateViralityScores,
  isRisingStar,
  APIFY_REEL_SCRAPER_ACTOR,
  APIFY_REELS_PER_ACCOUNT_LIMIT,
  APIFY_CALL_DELAY_MS,
  APIFY_MAX_RETRIES,
} from "@viralreels/shared";

const apifyClient = new ApifyClient({
  token: process.env.APIFY_TOKEN!,
});

/**
 * Sleep utility for adding delays between API calls.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run the Apify Instagram Reel Scraper for one or more usernames.
 * Includes retry logic with exponential backoff for rate limits.
 */
async function runReelScraper(
  usernames: string[]
): Promise<ApifyReelScraperItem[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < APIFY_MAX_RETRIES; attempt++) {
    try {
      const run = await apifyClient
        .actor(APIFY_REEL_SCRAPER_ACTOR)
        .call({
          username: usernames,
          resultsLimit: APIFY_REELS_PER_ACCOUNT_LIMIT,
        });

      const { items } = await apifyClient
        .dataset(run.defaultDatasetId)
        .listItems();

      return items as unknown as ApifyReelScraperItem[];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isRateLimit =
        lastError.message.includes("429") ||
        lastError.message.toLowerCase().includes("rate limit");

      if (isRateLimit && attempt < APIFY_MAX_RETRIES - 1) {
        const backoffMs = APIFY_CALL_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[Apify] Rate limited on reels batch (${usernames.length} usernames). Retrying in ${backoffMs}ms (attempt ${attempt + 1}/${APIFY_MAX_RETRIES})`
        );
        await sleep(backoffMs);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError ?? new Error("Max retries exceeded");
}

function firstDefinedNumber(...values: Array<number | null | undefined>): number {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

function firstDefinedString(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return null;
}

/**
 * Map a raw Apify reels actor result to a database ReelInsert record.
 */
function mapApifyResultToReel(
  item: ApifyReelScraperItem,
  account: Account,
  followerCount: number,
  viralScore: number
): ReelInsert {
  const views = firstDefinedNumber(item.play_count, item.videoPlayCount, item.videoViewCount, item.igPlayCount);
  const likes = Math.max(0, firstDefinedNumber(item.like_count, item.likesCount));
  const comments = Math.max(0, firstDefinedNumber(item.comment_count, item.commentsCount));

  const timestamp = firstDefinedString(item.timestamp, item.created_at, item.crawled_at);
  const postedAt = timestamp ? new Date(timestamp) : null;
  const rising = postedAt ? isRisingStar(postedAt, views) : false;

  const reelUrl =
    firstDefinedString(item.reel_url, item.url) ??
    (item.shortcode ? `https://www.instagram.com/reel/${item.shortcode}/` : null) ??
    (item.shortCode ? `https://www.instagram.com/reel/${item.shortCode}/` : null);
  const instagramId =
    firstDefinedString(item.id, item.pk, item.shortcode, item.shortCode, reelUrl) ??
    `${account.username}-${Date.now()}`;

  return {
    instagram_id: instagramId,
    url: reelUrl ?? `https://www.instagram.com/${account.username}/reels/`,
    thumbnail_url: firstDefinedString(item.image, item.displayUrl),
    video_url: firstDefinedString(item.video_url, item.videoUrl),
    view_count: views,
    like_count: likes,
    comment_count: comments,
    share_count: 0,
    author_username: firstDefinedString(item.ownerUsername, account.username),
    author_full_name: firstDefinedString(item.ownerFullName, account.full_name),
    description: item.caption ?? null,
    hashtags: item.hashtags ?? [],
    audio_track: null,
    audio_id: null,
    is_original_audio: false,
    video_duration: null,
    follower_count: followerCount,
    posted_at: timestamp,
    viral_score: viralScore,
    is_rising_star: rising,
  };
}

/** Profile metadata extracted from the scraper result */
export interface ProfileMetadata {
  full_name: string;
  profile_pic_url: string;
  follower_count: number;
  biography: string;
  last_scraped_at: string;
}

export interface ScrapeResult {
  account: Account;
  profileMetadata?: ProfileMetadata;
  totalFetched: number;
  reelsFiltered: number;
  reels: ReelInsert[];
  error?: string;
}

function mapItemsToScrapeResult(account: Account, reelItems: ApifyReelScraperItem[]): ScrapeResult {
  if (reelItems.length === 0) {
    return {
      account,
      totalFetched: 0,
      reelsFiltered: 0,
      reels: [],
      error: `No reels data returned for @${account.username}`,
    };
  }

  const followerCount = Math.max(0, account.follower_count ?? 0);
  const last10ReelsViews = reelItems
    .slice(0, 10)
    .map((item) =>
      firstDefinedNumber(item.play_count, item.videoPlayCount, item.videoViewCount, item.igPlayCount)
    );

  const scoringInputs = reelItems.map((item) => {
    const views = firstDefinedNumber(item.play_count, item.videoPlayCount, item.videoViewCount, item.igPlayCount);
    return {
      follower_count: followerCount,
      views,
      likes: Math.max(0, firstDefinedNumber(item.like_count, item.likesCount)),
      comments: Math.max(0, firstDefinedNumber(item.comment_count, item.commentsCount)),
      shares: 0,
      date_posted: firstDefinedString(item.timestamp, item.created_at, item.crawled_at),
      daily_views_history: [],
      last_10_reels_views: last10ReelsViews,
    };
  });

  const scoredReels = calculateViralityScores(scoringInputs);
  const mappedReels = reelItems.map((item, idx) =>
    mapApifyResultToReel(item, account, followerCount, scoredReels[idx]?.viral_score ?? 0)
  );

  return {
    account,
    totalFetched: reelItems.length,
    reelsFiltered: mappedReels.length,
    reels: mappedReels,
  };
}

/**
 * Scrape reels for a batch of accounts in a single actor run.
 * Falls back to per-account runs if the batch run fails.
 */
export async function scrapeAccountsBatch(accounts: Account[]): Promise<ScrapeResult[]> {
  if (accounts.length === 0) return [];

  const usernames = accounts.map((account) => account.username);
  const accountByUsername = new Map(accounts.map((account) => [account.username.toLowerCase(), account]));

  try {
    const reelItems = await runReelScraper(usernames);
    const itemsByUsername = new Map<string, ApifyReelScraperItem[]>();

    for (const item of reelItems) {
      const owner = firstDefinedString(item.ownerUsername)?.toLowerCase();
      if (!owner || !accountByUsername.has(owner)) continue;
      const bucket = itemsByUsername.get(owner);
      if (bucket) {
        bucket.push(item);
      } else {
        itemsByUsername.set(owner, [item]);
      }
    }

    return accounts.map((account) => {
      const key = account.username.toLowerCase();
      const matchedItems = itemsByUsername.get(key) ?? [];
      return mapItemsToScrapeResult(account, matchedItems);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[Scraper] Batch run failed for ${accounts.length} accounts. Falling back to per-account calls:`,
      message
    );

    const fallbackResults: ScrapeResult[] = [];

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      try {
        const singleItems = await runReelScraper([account.username]);
        fallbackResults.push(mapItemsToScrapeResult(account, singleItems));
      } catch (singleError) {
        const singleMessage = singleError instanceof Error ? singleError.message : String(singleError);
        fallbackResults.push({
          account,
          totalFetched: 0,
          reelsFiltered: 0,
          reels: [],
          error: singleMessage,
        });
      }
      if (i < accounts.length - 1) {
        await sleep(APIFY_CALL_DELAY_MS);
      }
    }

    return fallbackResults;
  }
}

/**
 * Scrape reels for a single Instagram account.
 * Fetches reels directly from the account Reels tab actor output.
 */
export async function scrapeAccount(account: Account): Promise<ScrapeResult> {
  const [result] = await scrapeAccountsBatch([account]);
  return result;
}

/**
 * Delay between consecutive Apify calls to respect rate limits.
 */
export async function throttle(): Promise<void> {
  await sleep(APIFY_CALL_DELAY_MS);
}
