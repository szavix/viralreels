import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@viralreels/supabase";
import { findActiveScrapeJob, processScrapeJobBatch } from "@/services/scrape-jobs";

const CRON_LOOP_BUDGET_MS = 500_000;

/**
 * GET /api/cron/scrape-runner
 *
 * High-frequency cron that continues any in-progress scrape job.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const supabase = createServiceClient();

  try {
    let active = await findActiveScrapeJob(supabase);
    if (!active) {
      return NextResponse.json({
        message: "No active scrape job",
        duration_ms: Date.now() - startTime,
        done: true,
      });
    }

    let loops = 0;
    while (Date.now() - startTime < CRON_LOOP_BUDGET_MS && loops < 100) {
      const progress = await processScrapeJobBatch(supabase, active.id);
      if (!progress) break;
      active = progress.job;
      loops += 1;
      if (active.status === "completed" || active.status === "failed") break;
    }

    return NextResponse.json({
      message:
        active.status === "completed"
          ? "Scrape job completed"
          : "Scrape job progressed",
      duration_ms: Date.now() - startTime,
      job_id: active.id,
      status: active.status,
      done: active.status === "completed",
      hasMore: active.status !== "completed",
      accounts_total: active.accounts_total,
      accounts_processed: active.accounts_processed,
      failed_accounts: active.failed_accounts,
      total_reels: active.total_reels,
      loops_executed: loops,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Scrape runner failed", message },
      { status: 500 }
    );
  }
}

export const maxDuration = 600;
