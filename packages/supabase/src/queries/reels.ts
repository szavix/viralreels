import type { SupabaseClient } from "@supabase/supabase-js";
import type { Reel, ReelInsert, FilterOption } from "@viralreels/shared";
import { REELS_PAGE_SIZE } from "@viralreels/shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

export interface FetchReelsOptions {
  filter?: FilterOption;
  accountId?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

/**
 * Fetch reels with filtering, sorting, and pagination.
 */
export async function fetchReels(client: Client, options: FetchReelsOptions = {}) {
  const {
    filter = "all",
    accountId,
    page = 1,
    pageSize = REELS_PAGE_SIZE,
    search,
  } = options;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from("reels")
    .select("*, reel_accounts!inner(account_id)", { count: "exact" });

  // Apply account filter via junction table
  if (accountId) {
    query = query.eq("reel_accounts.account_id", accountId);
  }

  // Apply filter presets
  switch (filter) {
    case "last24h": {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query.gte("posted_at", yesterday);
      break;
    }
    case "risingStars":
      query = query.eq("is_rising_star", true);
      break;
    case "audioTrending":
      query = query.not("audio_track", "is", null).eq("is_original_audio", false);
      break;
  }

  // Search in description
  if (search) {
    query = query.ilike("description", `%${search}%`);
  }

  // Sort by viral score descending, then by posted_at
  query = query
    .order("viral_score", { ascending: false })
    .order("posted_at", { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    reels: (data ?? []) as unknown as Reel[],
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  };
}

/**
 * Fetch a single reel by ID.
 */
export async function fetchReelById(client: Client, id: string) {
  const { data, error } = await client
    .from("reels")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Reel;
}

/**
 * Upsert a reel (insert or update on instagram_id conflict).
 */
export async function upsertReel(client: Client, reel: ReelInsert) {
  const { data, error } = await client
    .from("reels")
    .upsert(reel, { onConflict: "instagram_id" })
    .select()
    .single();

  if (error) throw error;
  return data as Reel;
}

/**
 * Batch upsert multiple reels.
 */
export async function upsertReels(client: Client, reels: ReelInsert[]) {
  const { data, error } = await client
    .from("reels")
    .upsert(reels, { onConflict: "instagram_id" })
    .select();

  if (error) throw error;
  return (data ?? []) as Reel[];
}

/**
 * Link a reel to an account (insert into junction table).
 */
export async function linkReelToAccount(
  client: Client,
  reelId: string,
  accountId: string
) {
  const { error } = await client
    .from("reel_accounts")
    .upsert({ reel_id: reelId, account_id: accountId }, {
      onConflict: "reel_id,account_id",
    });

  if (error) throw error;
}

/**
 * Get trending audio tracks (most common non-original audio).
 */
export async function fetchTrendingAudio(client: Client, limit = 10) {
  const { data, error } = await client
    .from("reels")
    .select("audio_track, audio_id")
    .eq("is_original_audio", false)
    .not("audio_track", "is", null)
    .order("viral_score", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
