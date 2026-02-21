import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/auth";
import { createServiceClient } from "@viralreels/supabase";
import {
  createScrapeJob,
  ensureScrapeJob,
  getLatestUserScrapeJob,
  getScrapeJobById,
  processScrapeJobBatch,
} from "@/services/scrape-jobs";

/**
 * POST /api/scrape
 *
 * Start or continue a persistent scrape job.
 * Safe to call from UI: if a job is already running, it reuses it.
 */
export async function POST(request: NextRequest) {
  const { user, error } = await getAuthenticatedClient(request);
  if (error) return error;

  const supabase = createServiceClient();

  try {
    const body = await request.json().catch(() => ({}));
    const { batchSize, forceNew } = body as {
      batchSize?: number;
      forceNew?: boolean;
    };

    let job;
    try {
      job = forceNew
        ? await createScrapeJob(supabase, user!.id, batchSize)
        : await ensureScrapeJob(supabase, user!.id, batchSize);
    } catch (createError) {
      const code = (createError as { code?: string } | null)?.code;
      if (code === "23505") {
        job = await ensureScrapeJob(supabase, user!.id, batchSize);
      } else {
        throw createError;
      }
    }

    const progress = await processScrapeJobBatch(supabase, job.id);
    const current = progress?.job ?? (await getScrapeJobById(supabase, job.id));

    return NextResponse.json({
      message:
        current.status === "completed"
          ? "Scrape completed"
          : "Scrape started",
      job_id: current.id,
      status: current.status,
      done: current.status === "completed",
      hasMore: current.status !== "completed",
      nextCursor: current.cursor,
      batch_size: current.batch_size,
      accounts_total: current.accounts_total,
      accounts_processed: current.accounts_processed,
      failed_accounts: current.failed_accounts,
      total_reels: current.total_reels,
      last_error: current.last_error,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Scrape] Manual scrape failed:", message);

    return NextResponse.json(
      {
        error: "Scrape failed",
        message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scrape?jobId=<uuid>
 *
 * Read status for a scrape job.
 */
export async function GET(request: NextRequest) {
  const { user, error } = await getAuthenticatedClient(request);
  if (error) return error;

  const supabase = createServiceClient();

  try {
    const jobId = request.nextUrl.searchParams.get("jobId");
    const shouldAdvance =
      request.nextUrl.searchParams.get("advance") === "1" ||
      request.nextUrl.searchParams.get("advance") === "true";
    const job = jobId
      ? await getScrapeJobById(supabase, jobId)
      : await getLatestUserScrapeJob(supabase, user!.id);

    if (!job) {
      return NextResponse.json({
        message: "No scrape job found",
        job_id: null,
        status: "idle",
        done: true,
        hasMore: false,
        nextCursor: null,
        accounts_total: 0,
        accounts_processed: 0,
        failed_accounts: 0,
        total_reels: 0,
        last_error: null,
      });
    }

    let currentJob = job;
    if (
      shouldAdvance &&
      currentJob.status !== "completed" &&
      currentJob.status !== "failed"
    ) {
      const progress = await processScrapeJobBatch(supabase, currentJob.id);
      if (progress?.job) {
        currentJob = progress.job;
      }
    }

    return NextResponse.json({
      message:
        currentJob.status === "completed"
          ? "Scrape completed"
          : "Scrape in progress",
      job_id: currentJob.id,
      status: currentJob.status,
      done: currentJob.status === "completed",
      hasMore: currentJob.status !== "completed",
      nextCursor: currentJob.cursor,
      batch_size: currentJob.batch_size,
      accounts_total: currentJob.accounts_total,
      accounts_processed: currentJob.accounts_processed,
      failed_accounts: currentJob.failed_accounts,
      total_reels: currentJob.total_reels,
      last_error: currentJob.last_error,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to fetch scrape status", message },
      { status: 500 }
    );
  }
}

export const maxDuration = 300;
