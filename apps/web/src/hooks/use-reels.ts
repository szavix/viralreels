"use client";

import { useState, useEffect, useCallback } from "react";
import type { Reel, Account, FilterOption } from "@viralreels/shared";

interface UseReelsResult {
  reels: Reel[];
  isLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  total: number;
  setPage: (page: number) => void;
  refetch: () => void;
}

interface UseReelsOptions {
  filter: FilterOption;
  accountId: string | null;
  pageSize?: number;
}

export function useReels({ filter, accountId, pageSize = 24 }: UseReelsOptions): UseReelsResult {
  const [reels, setReels] = useState<Reel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        filter,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (accountId) {
        params.set("accountId", accountId);
      }

      const response = await fetch(`/api/reels?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setReels(data.reels);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch reels");
      setReels([]);
    } finally {
      setIsLoading(false);
    }
  }, [filter, accountId, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter, accountId]);

  return {
    reels,
    isLoading,
    error,
    page,
    totalPages,
    total,
    setPage,
    refetch: fetchData,
  };
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await fetch("/api/accounts");
        if (response.ok) {
          const data = await response.json();
          setAccounts(data);
        }
      } catch {
        // Silently fail; account selector just won't populate
      } finally {
        setIsLoading(false);
      }
    }

    fetchAccounts();
  }, []);

  return { accounts, isLoading };
}
