import type { Reel, Account, FilterOption } from "@viralreels/shared";
import { supabase } from "./supabase";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL!;
const REQUEST_TIMEOUT_MS = 12000;

/**
 * Helper to make authenticated API calls to the Next.js backend.
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_URL in apps/mobile/.env");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: session ? `Bearer ${session.access_token}` : "",
        ...options?.headers,
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
        `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. Check EXPO_PUBLIC_API_URL (${API_BASE_URL}) and ensure the backend is reachable from your phone.`
      );
    }
    if (message.toLowerCase().includes("network request failed")) {
      throw new Error(
        `Network request failed. Your phone cannot reach ${API_BASE_URL}. Use a LAN IP or deployed URL instead of localhost/WSL IP.`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface ReelsResponse {
  reels: Reel[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function fetchReels(options: {
  filter?: FilterOption;
  accountId?: string;
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

export interface ScrapeResponse {
  message: string;
  duration_ms: number;
  accounts_processed: number;
  total_reels: number;
  results: Array<{
    username: string;
    fetched: number;
    reels: number;
    error: string | null;
  }>;
}

export async function triggerScrape(accountId?: string): Promise<ScrapeResponse> {
  return apiFetch<ScrapeResponse>("/api/scrape", {
    method: "POST",
    body: JSON.stringify(accountId ? { accountId } : {}),
  });
}
