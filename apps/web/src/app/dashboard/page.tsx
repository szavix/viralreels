"use client";

import { useState } from "react";
import type { Reel, FilterOption } from "@viralreels/shared";
import { useReels, useAccounts } from "@/hooks/use-reels";
import { FilterBar } from "@/components/filter-bar";
import { AccountSelector } from "@/components/account-selector";
import { ReelGrid } from "@/components/reel-grid";
import { ReelModal } from "@/components/reel-modal";
import { Pagination } from "@/components/pagination";
import { formatCount } from "@viralreels/shared";
import { TrendingUp, RefreshCw, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [filter, setFilter] = useState<FilterOption>("all");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { accounts } = useAccounts();
  const { reels, isLoading, page, totalPages, total, setPage, refetch } = useReels({
    filter,
    accountId: selectedAccountId,
  });

  async function handleScrapeNow() {
    setIsScraping(true);
    setScrapeStatus(null);

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Scrape failed");
      }

      setScrapeStatus({
        type: "success",
        message: `Scraped ${data.accounts_processed} account(s) — ${data.total_reels} reels found`,
      });
      refetch();
      setTimeout(() => setScrapeStatus(null), 5000);
    } catch (err) {
      setScrapeStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Scrape failed",
      });
      setTimeout(() => setScrapeStatus(null), 5000);
    } finally {
      setIsScraping(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <TrendingUp className="h-6 w-6 text-primary" />
            Viral Reels
          </h1>
          <p className="text-sm text-muted-foreground">
            {total > 0
              ? `${formatCount(total)} reels tracked across your accounts`
              : "No reels yet. Add accounts in Settings and run a scrape."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AccountSelector
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onAccountChange={setSelectedAccountId}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleScrapeNow}
            disabled={isScraping}
          >
            {isScraping ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Scrape Now
          </Button>
        </div>
      </div>

      {/* Scrape status toast */}
      {scrapeStatus && (
        <div
          className={`flex items-center gap-2 rounded-md border p-3 text-sm ${
            scrapeStatus.type === "success"
              ? "border-green-500/50 bg-green-500/10 text-green-400"
              : "border-destructive/50 bg-destructive/10 text-destructive"
          }`}
        >
          {scrapeStatus.type === "success" ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {scrapeStatus.message}
        </div>
      )}

      {/* Filters */}
      <FilterBar activeFilter={filter} onFilterChange={setFilter} />

      {/* Grid */}
      <ReelGrid
        reels={reels}
        isLoading={isLoading}
        onReelClick={setSelectedReel}
      />

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Modal */}
      <ReelModal
        reel={selectedReel}
        onClose={() => setSelectedReel(null)}
      />
    </div>
  );
}
