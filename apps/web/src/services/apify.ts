import { ApifyClient } from "apify-client";
import type {
  ApifyProfileResult,
  ApifyReelResult,
  ReelInsert,
  Account,
} from "@viralreels/shared";
import {
  isReelResult,
  calculateViralScore,
  isRisingStar,
  APIFY_PROFILE_SCRAPER_ACTOR,
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
 * Run the Apify Instagram Profile Scraper for a single username.
 * Includes retry logic with exponential backoff for rate limits.
 */
async function runProfileScraper(
  username: string
): Promise<ApifyProfileResult | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < APIFY_MAX_RETRIES; attempt++) {
    try {
      const run = await apifyClient
        .actor(APIFY_PROFILE_SCRAPER_ACTOR)
        .call({
          usernames: [username],
        });

      const { items } = await apifyClient
        .dataset(run.defaultDatasetId)
        .listItems();

      if (items.length === 0) return null;
      return items[0] as unknown as ApifyProfileResult;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isRateLimit =
        lastError.message.includes("429") ||
        lastError.message.toLowerCase().includes("rate limit");

      if (isRateLimit && attempt < APIFY_MAX_RETRIES - 1) {
        const backoffMs = APIFY_CALL_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[Apify] Rate limited on profile "${username}". Retrying in ${backoffMs}ms (attempt ${attempt + 1}/${APIFY_MAX_RETRIES})`
        );
        await sleep(backoffMs);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError ?? new Error("Max retries exceeded");
}

/**
 * Map a raw Apify reel result to a database ReelInsert record,
 * including the follower count from the profile.
 */
function mapApifyResultToReel(
  item: ApifyReelResult,
  followerCount: number
): ReelInsert {
  const views = item.videoPlayCount ?? item.videoViewCount ?? item.igPlayCount ?? 0;
  const likes = item.likesCount >= 0 ? item.likesCount : 0;
  const comments = item.commentsCount ?? 0;

  const viralScore = calculateViralScore(views, likes, comments, followerCount);

  const postedAt = item.timestamp ? new Date(item.timestamp) : null;
  const rising = postedAt ? isRisingStar(postedAt, views) : false;

  const audioTrack =
    item.musicInfo?.song_name && item.musicInfo?.artist_name
      ? `${item.musicInfo.artist_name} - ${item.musicInfo.song_name}`
      : item.musicInfo?.song_name ?? null;

  return {
    instagram_id: item.id,
    url: item.url,
    thumbnail_url: item.displayUrl ?? null,
    video_url: item.videoUrl ?? null,
    view_count: views,
    like_count: likes,
    comment_count: comments,
    share_count: item.reshareCount ?? 0,
    author_username: item.ownerUsername ?? null,
    author_full_name: item.ownerFullName ?? null,
    description: item.caption ?? null,
    hashtags: item.hashtags ?? [],
    audio_track: audioTrack,
    audio_id: item.musicInfo?.audio_id ?? null,
    is_original_audio: item.musicInfo?.uses_original_audio ?? false,
    video_duration: item.videoDuration ?? null,
    follower_count: followerCount,
    posted_at: item.timestamp ?? null,
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

/**
 * Scrape reels for a single Instagram account.
 * Fetches the profile, extracts reel posts from latestPosts,
 * and calculates viral scores using follower count.
 */
export async function scrapeAccount(account: Account): Promise<ScrapeResult> {
  try {
    const profile = await runProfileScraper(account.username);

    if (!profile) {
      return {
        account,
        totalFetched: 0,
        reelsFiltered: 0,
        reels: [],
        error: `No profile data returned for @${account.username}`,
      };
    }

    const followerCount = profile.followersCount ?? 0;

    const profileMetadata: ProfileMetadata = {
      full_name: profile.fullName ?? "",
      profile_pic_url: profile.profilePicUrlHD ?? profile.profilePicUrl ?? "",
      follower_count: followerCount,
      biography: profile.biography ?? "",
      last_scraped_at: new Date().toISOString(),
    };

    const latestPosts = profile.latestPosts ?? [];
    const reelResults = latestPosts.filter(isReelResult);
    const mappedReels = reelResults.map((item) =>
      mapApifyResultToReel(item, followerCount)
    );

    return {
      account,
      profileMetadata,
      totalFetched: latestPosts.length,
      reelsFiltered: mappedReels.length,
      reels: mappedReels,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[Scraper] Failed to scrape account "@${account.username}":`,
      message
    );
    return {
      account,
      totalFetched: 0,
      reelsFiltered: 0,
      reels: [],
      error: message,
    };
  }
}

/**
 * Delay between consecutive Apify calls to respect rate limits.
 */
export async function throttle(): Promise<void> {
  await sleep(APIFY_CALL_DELAY_MS);
}
