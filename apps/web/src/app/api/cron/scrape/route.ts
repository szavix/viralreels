import { NextRequest, NextResponse } from "next/server";
import {
  createServiceClient,
  fetchActiveAccounts,
  upsertReels,
  linkReelToAccount,
  updateAccountProfile,
} from "@viralreels/supabase";
import { scrapeAccount, throttle, type ScrapeResult } from "@/services/apify";

/**
 * GET /api/cron/scrape
 *
 * Triggered by Vercel Cron daily at 8 AM UTC.
 * Scrapes all active accounts via Apify, calculates viral scores
 * using follower counts, and upserts results into Supabase.
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

  try {
    const accounts = await fetchActiveAccounts(supabase);

    if (accounts.length === 0) {
      return NextResponse.json({
        message: "No active accounts to scrape",
        duration_ms: Date.now() - startTime,
      });
    }

    const results: ScrapeResult[] = [];

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      console.log(
        `[Cron] Scraping account ${i + 1}/${accounts.length}: @${account.username}`
      );

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

      if (i < accounts.length - 1) {
        await throttle();
      }
    }

    const summary = {
      message: "Scrape completed",
      duration_ms: Date.now() - startTime,
      accounts_processed: accounts.length,
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
