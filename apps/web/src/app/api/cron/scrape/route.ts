import { NextRequest, NextResponse } from "next/server";
import type { Account } from "@viralreels/shared";
import {
  createServiceClient,
  fetchActiveAccounts,
  upsertReels,
  linkReelToAccount,
  updateAccountProfile,
} from "@viralreels/supabase";
import { scrapeAccount, throttle, type ScrapeResult } from "@/services/apify";

const DEFAULT_BATCH_SIZE = 8;
const MAX_BATCH_SIZE = 20;
const SOFT_TIME_BUDGET_MS = 250_000;

/**
 * GET /api/cron/scrape
 *
 * Triggered by Vercel Cron daily at 8 AM UTC.
 * Scrapes active accounts via Apify in continuation-safe batches.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  const supabase = createServiceClient();
  const cursor = Math.max(
    0,
    Number.parseInt(request.nextUrl.searchParams.get("cursor") ?? "0", 10) || 0
  );
  const batchSize = Math.min(
    MAX_BATCH_SIZE,
    Math.max(
      1,
      Number.parseInt(request.nextUrl.searchParams.get("batchSize") ?? `${DEFAULT_BATCH_SIZE}`, 10) ||
        DEFAULT_BATCH_SIZE
    )
  );

  try {
    const accounts = await fetchActiveAccounts(supabase);
    const accountsTotal = accounts.length;
    const batchStart = Math.min(cursor, accountsTotal);
    const batchEnd = Math.min(batchStart + batchSize, accountsTotal);
    const batchAccounts: Account[] = accounts.slice(batchStart, batchEnd);

    if (accountsTotal === 0) {
      return NextResponse.json({
        message: "No active accounts to scrape",
        duration_ms: Date.now() - startTime,
        done: true,
        hasMore: false,
        nextCursor: null,
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
      if (Date.now() - startTime > SOFT_TIME_BUDGET_MS) {
        break;
      }
      const account = batchAccounts[i];
      console.log(
        `[Cron] Scraping account ${batchStart + i + 1}/${accountsTotal}: @${account.username}`
      );

      try {
        const scrapeResult = await scrapeAccount(account);
        results.push(scrapeResult);

        // Update account profile metadata if we got data
        if (scrapeResult.profileMetadata) {
          await updateAccountProfile(
            supabase,
            account.id,
            scrapeResult.profileMetadata
          );
        }

        // Upsert reels and create junction records
        if (scrapeResult.reels.length > 0) {
          const upsertedReels = await upsertReels(supabase, scrapeResult.reels);

          for (const reel of upsertedReels) {
            await linkReelToAccount(supabase, reel.id, account.id);
          }

          console.log(
            `[Cron] Upserted ${upsertedReels.length} reels for @${account.username}`
          );
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
    const nextCursor = Math.min(batchStart + processed, accountsTotal);
    const done = nextCursor >= accountsTotal;

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

    console.log("[Cron] Scrape summary:", JSON.stringify(summary, null, 2));

    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Cron] Scrape failed:", message);

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
