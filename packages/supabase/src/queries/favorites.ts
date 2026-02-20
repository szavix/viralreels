import type { SupabaseClient } from "@supabase/supabase-js";
import type { Reel, UserFavorite } from "@viralreels/shared";
import { REELS_PAGE_SIZE } from "@viralreels/shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

export interface FavoriteReel extends Reel {
  completed: boolean;
  favorited_at: string;
}

export interface FetchFavoriteReelsOptions {
  page?: number;
  pageSize?: number;
}

export async function fetchFavoriteReels(
  client: Client,
  userId: string,
  options: FetchFavoriteReelsOptions = {}
) {
  const { page = 1, pageSize = REELS_PAGE_SIZE } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await client
    .from("user_favorites")
    .select("completed, created_at, reels!inner(*)", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const reels = (data ?? [])
    .map((row) => {
      const reel = Array.isArray(row.reels) ? row.reels[0] : row.reels;
      if (!reel) return null;
      return {
        ...(reel as Reel),
        completed: row.completed,
        favorited_at: row.created_at,
      } as FavoriteReel;
    })
    .filter(Boolean) as FavoriteReel[];

  return {
    reels,
    total: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  };
}

export async function addFavorite(client: Client, userId: string, reelId: string) {
  const { data, error } = await client
    .from("user_favorites")
    .upsert(
      { user_id: userId, reel_id: reelId, completed: false },
      { onConflict: "user_id,reel_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as UserFavorite;
}

export async function removeFavorite(client: Client, userId: string, reelId: string) {
  const { error } = await client
    .from("user_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("reel_id", reelId);

  if (error) throw error;
}

export async function updateFavoriteCompleted(
  client: Client,
  userId: string,
  reelId: string,
  completed: boolean
) {
  const { data, error } = await client
    .from("user_favorites")
    .update({ completed })
    .eq("user_id", userId)
    .eq("reel_id", reelId)
    .select("*")
    .single();

  if (error) throw error;
  return data as UserFavorite;
}

export async function fetchFavoriteStatus(client: Client, userId: string, reelId: string) {
  const { data, error } = await client
    .from("user_favorites")
    .select("completed")
    .eq("user_id", userId)
    .eq("reel_id", reelId)
    .maybeSingle();

  if (error) throw error;
  return {
    isFavorited: !!data,
    completed: data?.completed ?? false,
  };
}

export async function fetchFavoriteStatusesForReels(
  client: Client,
  userId: string,
  reelIds: string[]
) {
  if (reelIds.length === 0) return new Map<string, boolean>();

  const { data, error } = await client
    .from("user_favorites")
    .select("reel_id, completed")
    .eq("user_id", userId)
    .in("reel_id", reelIds);

  if (error) throw error;

  const statuses = new Map<string, boolean>();
  for (const row of data ?? []) {
    statuses.set(row.reel_id, row.completed);
  }
  return statuses;
}
