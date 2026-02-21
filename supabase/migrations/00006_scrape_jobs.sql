-- Migration: Persistent scrape jobs for resumable scraping

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  cursor integer NOT NULL DEFAULT 0,
  batch_size integer NOT NULL DEFAULT 4 CHECK (batch_size >= 1 AND batch_size <= 20),
  accounts_total integer NOT NULL DEFAULT 0,
  accounts_processed integer NOT NULL DEFAULT 0,
  failed_accounts integer NOT NULL DEFAULT 0,
  total_reels integer NOT NULL DEFAULT 0,
  last_error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status_created_at
  ON scrape_jobs (status, created_at);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_requested_by_created_at
  ON scrape_jobs (requested_by, created_at DESC);

CREATE OR REPLACE FUNCTION set_scrape_jobs_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_scrape_jobs_updated_at ON scrape_jobs;
CREATE TRIGGER trg_set_scrape_jobs_updated_at
  BEFORE UPDATE ON scrape_jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_scrape_jobs_updated_at();

ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own scrape jobs"
  ON scrape_jobs FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

CREATE POLICY "Users can create own scrape jobs"
  ON scrape_jobs FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Service role full access on scrape_jobs"
  ON scrape_jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
