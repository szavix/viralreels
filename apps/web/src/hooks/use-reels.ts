"use client";

import { useState, useEffect, useCallback } from "react";
import type { Reel, Account, Category, FilterOption, ReelSortOption } from "@viralreels/shared";

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
  categoryIds: string[];
  sortBy: ReelSortOption;
  pageSize?: number;
}

export function useReels({ filter, accountId, categoryIds, sortBy, pageSize = 24 }: UseReelsOptions): UseReelsResult {
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
      if (categoryIds.length > 0) {
        params.set("categoryIds", categoryIds.join(","));
      }
      params.set("sortBy", sortBy);

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
  }, [filter, accountId, categoryIds, sortBy, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter, accountId, categoryIds, sortBy]);

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

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/categories");
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch {
        // Silently fail; category selector just won't populate
      } finally {
        setIsLoading(false);
      }
    }

    fetchCategories();
  }, []);

  return { categories, isLoading };
}
