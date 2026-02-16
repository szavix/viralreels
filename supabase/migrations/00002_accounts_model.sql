-- Migration: Replace niches/reel_niches with accounts/reel_accounts
-- Also adds follower_count to reels table for historical tracking

-- ===================
-- Drop old tables
-- ===================
DROP TABLE IF EXISTS reel_niches CASCADE;
DROP TABLE IF EXISTS niches CASCADE;

-- ===================
-- Table: accounts
-- ===================
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  full_name text,
  profile_pic_url text,
  follower_count integer,
  biography text,
  active boolean DEFAULT true,
  last_scraped_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ===================
-- Table: reel_accounts (junction)
-- ===================
CREATE TABLE IF NOT EXISTS reel_accounts (
  reel_id uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  PRIMARY KEY (reel_id, account_id)
);

-- ===================
-- Add follower_count to reels
-- ===================
ALTER TABLE reels ADD COLUMN IF NOT EXISTS follower_count integer DEFAULT 0;

-- ===================
-- Indexes
-- ===================
CREATE INDEX idx_reel_accounts_account_id ON reel_accounts (account_id);
CREATE INDEX idx_accounts_username ON accounts (username);

-- ===================
-- Row Level Security
-- ===================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_accounts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage accounts
CREATE POLICY "Authenticated users can read accounts"
  ON accounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete accounts"
  ON accounts FOR DELETE
  TO authenticated
  USING (true);

-- Authenticated users can read reel_accounts
CREATE POLICY "Authenticated users can read reel_accounts"
  ON reel_accounts FOR SELECT
  TO authenticated
  USING (true);

-- Service role full access
CREATE POLICY "Service role full access on accounts"
  ON accounts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on reel_accounts"
  ON reel_accounts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
