import type { SupabaseClient } from "@supabase/supabase-js";
import type { Account } from "@viralreels/shared";
import {
  fetchActiveAccounts,
  upsertReels,
  linkReelToAccount,
  updateAccountProfile,
} from "@viralreels/supabase";
import { scrapeAccount, throttle } from "@/services/apify";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any>;

const DEFAULT_BATCH_SIZE = 4;
const MAX_BATCH_SIZE = 20;
const PROCESS_TIME_BUDGET_MS = 500_000;

export interface ScrapeJob {
  id: string;
  requested_by: string | null;
  status: "queued" | "running" | "completed" | "failed";
  cursor: number;
  batch_size: number;
  accounts_total: number;
  accounts_processed: number;
  failed_accounts: number;
  total_reels: number;
  last_error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

function normalizeBatchSize(input?: number) {
  return Math.min(MAX_BATCH_SIZE, Math.max(1, input ?? DEFAULT_BATCH_SIZE));
}

export async function getScrapeJobById(client: Client, jobId: string) {
  const { data, error } = await client
    .from("scrape_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) throw error;
  return data as ScrapeJob;
}

export async function getLatestUserScrapeJob(client: Client, userId: string) {
  const { data, error } = await client
    .from("scrape_jobs")
    .select("*")
    .eq("requested_by", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as ScrapeJob | null;
}

export async function findActiveScrapeJob(client: Client) {
  const { data, error } = await client
    .from("scrape_jobs")
    .select("*")
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as ScrapeJob | null;
}

export async function createScrapeJob(
  client: Client,
  requestedBy: string | null,
  batchSize?: number
) {
  const accounts = await fetchActiveAccounts(client);
  const normalizedBatchSize = normalizeBatchSize(batchSize);

  const { data, error } = await client
    .from("scrape_jobs")
    .insert({
      requested_by: requestedBy,
      status: "queued",
      batch_size: normalizedBatchSize,
      accounts_total: accounts.length,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as ScrapeJob;
}

export async function ensureScrapeJob(
  client: Client,
  requestedBy: string | null,
  batchSize?: number
) {
  const active = await findActiveScrapeJob(client);
  if (active) return active;
  return createScrapeJob(client, requestedBy, batchSize);
}

export async function processScrapeJobBatch(client: Client, jobId?: string) {
  const startTime = Date.now();
  const job = jobId ? await getScrapeJobById(client, jobId) : await findActiveScrapeJob(client);

  if (!job) return null;
  if (job.status === "completed" || job.status === "failed") return { job, batchProcessed: 0 };

  const accounts = await fetchActiveAccounts(client);
  const accountsTotal = accounts.length;
  const startCursor = Math.min(job.cursor, accountsTotal);

  if (accountsTotal === 0 || startCursor >= accountsTotal) {
    const { data, error } = await client
      .from("scrape_jobs")
      .update({
        status: "completed",
        accounts_total: accountsTotal,
        accounts_processed: startCursor,
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .select("*")
      .single();
    if (error) throw error;
    return { job: data as ScrapeJob, batchProcessed: 0 };
  }

  const batchEnd = Math.min(startCursor + normalizeBatchSize(job.batch_size), accountsTotal);
  const batchAccounts: Account[] = accounts.slice(startCursor, batchEnd);

  let processed = 0;
  let failed = 0;
  let reels = 0;
  let lastError: string | null = null;

  await client
    .from("scrape_jobs")
    .update({
      status: "running",
      started_at: job.started_at ?? new Date().toISOString(),
      accounts_total: accountsTotal,
    })
    .eq("id", job.id);

  for (let i = 0; i < batchAccounts.length; i++) {
    if (Date.now() - startTime > PROCESS_TIME_BUDGET_MS) break;
    const account = batchAccounts[i];

    try {
      const scrapeResult = await scrapeAccount(account);
      if (scrapeResult.profileMetadata) {
        await updateAccountProfile(
          client,
          account.id,
          scrapeResult.profileMetadata
        );
      }
      if (scrapeResult.reels.length > 0) {
        const upsertedReels = await upsertReels(client, scrapeResult.reels);
        for (const reel of upsertedReels) {
          await linkReelToAccount(client, reel.id, account.id);
        }
      }
      reels += scrapeResult.reelsFiltered;
      if (scrapeResult.error) {
        failed += 1;
        lastError = scrapeResult.error;
      }
    } catch (err) {
      failed += 1;
      lastError = err instanceof Error ? err.message : String(err);
    }

    processed += 1;
    if (i < batchAccounts.length - 1) {
      await throttle();
    }
  }

  const newCursor = Math.min(startCursor + processed, accountsTotal);
  const done = newCursor >= accountsTotal;

  const { data, error } = await client
    .from("scrape_jobs")
    .update({
      status: done ? "completed" : "running",
      cursor: newCursor,
      accounts_total: accountsTotal,
      accounts_processed: newCursor,
      failed_accounts: (job.failed_accounts ?? 0) + failed,
      total_reels: (job.total_reels ?? 0) + reels,
      last_error: lastError,
      finished_at: done ? new Date().toISOString() : null,
    })
    .eq("id", job.id)
    .select("*")
    .single();

  if (error) throw error;

  return {
    job: data as ScrapeJob,
    batchProcessed: processed,
  };
}
