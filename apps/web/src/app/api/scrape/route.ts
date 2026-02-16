import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/auth";
import {
  createServiceClient,
  fetchActiveAccounts,
  fetchAccountById,
  upsertReels,
  linkReelToAccount,
  updateAccountProfile,
} from "@viralreels/supabase";
import { scrapeAccount, throttle, type ScrapeResult } from "@/services/apify";

/**
 * POST /api/scrape
 *
 * Manual scrape trigger. Authenticated (not cron-secret).
 * Accepts optional { accountId } to scrape a single account,
 * or scrapes all active accounts if omitted.
 */
export async function POST(request: NextRequest) {
  const { error } = await getAuthenticatedClient();
  if (error) return error;

  const startTime = Date.now();
  const supabase = createServiceClient();

  try {
    const body = await request.json().catch(() => ({}));
    const { accountId } = body as { accountId?: string };

    let accounts;
    if (accountId) {
      const account = await fetchAccountById(supabase, accountId);
      accounts = [account];
    } else {
      accounts = await fetchActiveAccounts(supabase);
    }

    if (accounts.length === 0) {
      return NextResponse.json({
        message: "No accounts to scrape",
        duration_ms: Date.now() - startTime,
      });
    }

    const results: ScrapeResult[] = [];

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      console.log(
        `[Scrape] Processing account ${i + 1}/${accounts.length}: @${account.username}`
      );

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
