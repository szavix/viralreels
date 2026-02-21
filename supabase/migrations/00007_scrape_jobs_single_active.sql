-- Ensure only one active scrape job exists at a time.
-- This prevents concurrent UI/cron requests from creating duplicate active jobs.

WITH ranked_active_jobs AS (
  SELECT
    id,
    row_number() OVER (
      ORDER BY COALESCE(started_at, created_at) DESC, created_at DESC
    ) AS rn
  FROM scrape_jobs
  WHERE status IN ('queued', 'running')
)
UPDATE scrape_jobs AS j
SET
  status = 'failed',
  finished_at = NOW(),
  last_error = COALESCE(j.last_error, 'Superseded by a newer active scrape job')
FROM ranked_active_jobs AS r
WHERE j.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS scrape_jobs_single_active_idx
  ON scrape_jobs ((1))
  WHERE status IN ('queued', 'running');
