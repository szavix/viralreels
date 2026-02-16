import type { Reel, Account, FilterOption } from "@viralreels/shared";
import { supabase } from "./supabase";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

/**
 * Helper to make authenticated API calls to the Next.js backend.
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
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
