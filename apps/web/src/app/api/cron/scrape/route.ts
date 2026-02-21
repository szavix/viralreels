import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@viralreels/supabase";
import {
  ensureScrapeJob,
  processScrapeJobBatch,
  findActiveScrapeJob,
} from "@/services/scrape-jobs";

const CRON_LOOP_BUDGET_MS = 500_000;
const DAILY_DEFAULT_BATCH_SIZE = 4;

/**
 * GET /api/cron/scrape
 *
 * Daily kickoff cron.
 * Starts/continues a persistent scrape job and processes batches.
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
    const requestedBatchSize = Number.parseInt(
      request.nextUrl.searchParams.get("batchSize") ?? `${DAILY_DEFAULT_BATCH_SIZE}`,
      10
    );
    const job = await ensureScrapeJob(supabase, null, requestedBatchSize);

    let latest = job;
    let loops = 0;
    while (Date.now() - startTime < CRON_LOOP_BUDGET_MS && loops < 100) {
      const progress = await processScrapeJobBatch(supabase, latest.id);
      if (!progress) break;
      latest = progress.job;
      loops += 1;
      if (latest.status === "completed" || latest.status === "failed") {
        break;
      }
    }

    const active = await findActiveScrapeJob(supabase);
    return NextResponse.json({
      message:
        latest.status === "completed"
          ? "Cron scrape completed"
          : "Cron scrape progressed",
      duration_ms: Date.now() - startTime,
      active_job_id: active?.id ?? null,
      job_id: latest.id,
      status: latest.status,
      done: latest.status === "completed",
      hasMore: latest.status !== "completed",
      accounts_total: latest.accounts_total,
      accounts_processed: latest.accounts_processed,
      failed_accounts: latest.failed_accounts,
      total_reels: latest.total_reels,
      batch_size: latest.batch_size,
      loops_executed: loops,
    });
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

export const maxDuration = 600;
