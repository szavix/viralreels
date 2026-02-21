import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/auth";
import type { Account } from "@viralreels/shared";
import {
  createServiceClient,
  fetchActiveAccounts,
  fetchAccountById,
  upsertReels,
  linkReelToAccount,
  updateAccountProfile,
} from "@viralreels/supabase";
import { scrapeAccount, throttle, type ScrapeResult } from "@/services/apify";

const DEFAULT_BATCH_SIZE = 8;
const MAX_BATCH_SIZE = 20;
const SOFT_TIME_BUDGET_MS = 250_000;

/**
 * POST /api/scrape
 *
 * Manual scrape trigger. Authenticated (not cron-secret).
 * Accepts optional { accountId } to scrape a single account,
 * or scrapes active accounts in continuation-safe batches if omitted.
 */
export async function POST(request: NextRequest) {
  const { error } = await getAuthenticatedClient(request);
  if (error) return error;

  const startTime = Date.now();
  const supabase = createServiceClient();

  try {
    const body = await request.json().catch(() => ({}));
    const {
      accountId,
      cursor: rawCursor,
      batchSize: rawBatchSize,
    } = body as {
      accountId?: string;
      cursor?: number;
      batchSize?: number;
    };

    const cursor = Math.max(0, Number.isFinite(rawCursor) ? Number(rawCursor) : 0);
    const batchSize = Math.min(
      MAX_BATCH_SIZE,
      Math.max(1, Number.isFinite(rawBatchSize) ? Number(rawBatchSize) : DEFAULT_BATCH_SIZE)
    );

    let accounts;
    let accountsTotal = 0;
    let batchAccounts: Account[] = [];
    let batchStart = 0;
    if (accountId) {
      const account = await fetchAccountById(supabase, accountId);
      accounts = [account];
      accountsTotal = 1;
      batchAccounts = accounts;
    } else {
      accounts = await fetchActiveAccounts(supabase);
      accountsTotal = accounts.length;
      batchStart = Math.min(cursor, accountsTotal);
      const batchEnd = Math.min(batchStart + batchSize, accountsTotal);
      batchAccounts = accounts.slice(batchStart, batchEnd);
    }

    if (accountsTotal === 0) {
      return NextResponse.json({
        message: "No accounts to scrape",
        duration_ms: Date.now() - startTime,
        done: true,
        nextCursor: null,
        hasMore: false,
        accounts_total: 0,
        accounts_processed: 0,
        failed_accounts: 0,
        total_reels: 0,
        results: [],
      });
    }

    const results: ScrapeResult[] = [];
    let processed = 0;

    for (let i = 0; i < batchAccounts.length; i++) {
      if (!accountId && Date.now() - startTime > SOFT_TIME_BUDGET_MS) {
        break;
      }
      const account = batchAccounts[i];
      console.log(
        `[Scrape] Processing account ${accountId ? i + 1 : batchStart + i + 1}/${accountsTotal}: @${account.username}`
      );

      try {
        const scrapeResult = await scrapeAccount(account);
        results.push(scrapeResult);

        if (scrapeResult.profileMetadata) {
          await updateAccountProfile(
            supabase,
            account.id,
            scrapeResult.profileMetadata
          );
        }

        if (scrapeResult.reels.length > 0) {
          const upsertedReels = await upsertReels(supabase, scrapeResult.reels);

          for (const reel of upsertedReels) {
            await linkReelToAccount(supabase, reel.id, account.id);
          }
        }
      } catch (accountErr) {
        const message =
          accountErr instanceof Error ? accountErr.message : String(accountErr);
        results.push({
          account,
          totalFetched: 0,
          reelsFiltered: 0,
          reels: [],
          error: message,
        });
      }
      processed++;

      if (i < batchAccounts.length - 1) {
        await throttle();
      }
    }

    const failedAccounts = results.filter((r) => r.error).length;
    const nextCursor = accountId
      ? null
      : Math.min(batchStart + processed, accountsTotal);
    const done = accountId ? true : (nextCursor ?? 0) >= accountsTotal;

    const summary = {
      message: "Scrape completed",
      duration_ms: Date.now() - startTime,
      done,
      hasMore: !done,
      nextCursor,
      batch_size: batchSize,
      accounts_total: accountsTotal,
      accounts_processed: processed,
      failed_accounts: failedAccounts,
      results: results.map((r) => ({
        username: r.account.username,
        fetched: r.totalFetched,
        reels: r.reelsFiltered,
        error: r.error ?? null,
      })),
      total_reels: results.reduce((sum, r) => sum + r.reelsFiltered, 0),
    };

    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Scrape] Manual scrape failed:", message);

    return NextResponse.json(
      {
        error: "Scrape failed",
        message,
        duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

export const maxDuration = 300;
