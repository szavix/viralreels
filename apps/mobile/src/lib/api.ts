import type { Reel, Account, Category, FilterOption, ReelSortOption } from "@viralreels/shared";
import { supabase } from "./supabase";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL!;
const REQUEST_TIMEOUT_MS = 12000;

interface ApiFetchOptions extends RequestInit {
  /** Timeout in ms. Set to 0 to disable. Defaults to REQUEST_TIMEOUT_MS. */
  timeoutMs?: number;
}

/**
 * Helper to make authenticated API calls to the Next.js backend.
 */
async function apiFetch<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_URL in apps/mobile/.env");
  }

  const timeout = options?.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = timeout > 0
    ? setTimeout(() => controller.abort(), timeout)
    : null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  try {
    const { timeoutMs: _, ...fetchOptions } = options ?? {};

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      signal: timeout > 0 ? controller.signal : undefined,
      headers: {
        "Content-Type": "application/json",
        Authorization: session ? `Bearer ${session.access_token}` : "",
        ...fetchOptions?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Aborted")) {
      throw new Error(
        `Request timed out after ${timeout / 1000}s. Check EXPO_PUBLIC_API_URL (${API_BASE_URL}) and ensure the backend is reachable from your phone.`
      );
    }
    if (message.toLowerCase().includes("network request failed")) {
      throw new Error(
        `Network request failed. Your phone cannot reach ${API_BASE_URL}. Use a LAN IP or deployed URL instead of localhost/WSL IP.`
      );
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export interface ReelsResponse {
  reels: Reel[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FavoriteReel extends Reel {
  completed: boolean;
  favorited_at: string;
}

export interface FavoritesResponse {
  reels: FavoriteReel[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function fetchReels(options: {
  filter?: FilterOption;
  accountId?: string;
  categoryIds?: string[];
  sortBy?: ReelSortOption;
  page?: number;
}): Promise<ReelsResponse> {
  const params = new URLSearchParams({
    filter: options.filter ?? "all",
    page: (options.page ?? 1).toString(),
    pageSize: "24",
  });

  if (options.accountId) {
    params.set("accountId", options.accountId);
  }
  if (options.categoryIds && options.categoryIds.length > 0) {
    params.set("categoryIds", [...new Set(options.categoryIds)].join(","));
  }
  if (options.sortBy) {
    params.set("sortBy", options.sortBy);
  }

  return apiFetch<ReelsResponse>(`/api/reels?${params}`);
}

export async function fetchAccounts(): Promise<Account[]> {
  return apiFetch<Account[]>("/api/accounts");
}

export async function addAccount(username: string): Promise<Account> {
  return apiFetch<Account>("/api/accounts", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export async function toggleAccount(id: string, active: boolean): Promise<Account> {
  return apiFetch<Account>(`/api/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}

export async function deleteAccount(id: string): Promise<void> {
  await apiFetch(`/api/accounts/${id}`, { method: "DELETE" });
}

export async function fetchCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/api/categories");
}

export async function addCategory(name: string): Promise<Category> {
  return apiFetch<Category>("/api/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
}

export async function fetchAccountCategories(accountId: string): Promise<string[]> {
  const data = await apiFetch<{ accountId: string; categoryIds: string[] }>(
    `/api/accounts/${accountId}/categories`
  );
  return data.categoryIds ?? [];
}

export async function updateAccountCategories(
  accountId: string,
  categoryIds: string[]
): Promise<string[]> {
  const data = await apiFetch<{ accountId: string; categoryIds: string[] }>(
    `/api/accounts/${accountId}/categories`,
    {
      method: "PUT",
      body: JSON.stringify({ categoryIds }),
    }
  );
  return data.categoryIds ?? [];
}

export interface ScrapeResponse {
  message: string;
  duration_ms: number;
  done?: boolean;
  hasMore?: boolean;
  nextCursor?: number | null;
  batch_size?: number;
  accounts_total: number;
  accounts_processed: number;
  failed_accounts?: number;
  total_reels: number;
  results: Array<{
    username: string;
    fetched: number;
    reels: number;
    error: string | null;
  }>;
}

export async function triggerScrape(options?: {
  accountId?: string;
  cursor?: number;
  batchSize?: number;
}): Promise<ScrapeResponse> {
  return apiFetch<ScrapeResponse>("/api/scrape", {
    method: "POST",
    body: JSON.stringify(options ?? {}),
    timeoutMs: 0,
  });
}

export async function fetchFavorites(page = 1, pageSize = 1000): Promise<FavoritesResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  return apiFetch<FavoritesResponse>(`/api/favorites?${params}`);
}

export async function favoriteReel(reelId: string) {
  return apiFetch(`/api/favorites`, {
    method: "POST",
    body: JSON.stringify({ reelId }),
  });
}

export async function unfavoriteReel(reelId: string) {
  return apiFetch(`/api/favorites/${reelId}`, {
    method: "DELETE",
  });
}

export async function getFavoriteStatus(reelId: string) {
  return apiFetch<{ isFavorited: boolean; completed: boolean }>(`/api/favorites/${reelId}`);
}

export async function updateFavoriteCompleted(reelId: string, completed: boolean) {
  return apiFetch(`/api/favorites/${reelId}`, {
    method: "PATCH",
    body: JSON.stringify({ completed }),
  });
}
