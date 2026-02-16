-- ViralReelsAI Initial Schema
-- Tables: niches, reels, reel_niches

-- ===================
-- Table: niches
-- ===================
CREATE TABLE IF NOT EXISTS niches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hashtag text UNIQUE NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ===================
-- Table: reels
-- ===================
CREATE TABLE IF NOT EXISTS reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_id text UNIQUE NOT NULL,
  url text NOT NULL,
  thumbnail_url text,
  video_url text,
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  author_username text,
  author_full_name text,
  description text,
  hashtags text[] DEFAULT '{}',
  audio_track text,
  audio_id text,
  is_original_audio boolean DEFAULT false,
  video_duration float,
  posted_at timestamptz,
  scraped_at timestamptz DEFAULT now(),
  viral_score float DEFAULT 0,
  is_rising_star boolean DEFAULT false
);

-- ===================
-- Table: reel_niches (junction)
-- ===================
CREATE TABLE IF NOT EXISTS reel_niches (
  reel_id uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  niche_id uuid NOT NULL REFERENCES niches(id) ON DELETE CASCADE,
  PRIMARY KEY (reel_id, niche_id)
);

-- ===================
-- Indexes
-- ===================
CREATE INDEX idx_reels_viral_score ON reels (viral_score DESC);
CREATE INDEX idx_reels_posted_at ON reels (posted_at DESC);
CREATE INDEX idx_reels_is_rising_star ON reels (is_rising_star) WHERE is_rising_star = true;
CREATE INDEX idx_reels_audio_track ON reels (audio_track) WHERE audio_track IS NOT NULL;
CREATE INDEX idx_reels_instagram_id ON reels (instagram_id);
CREATE INDEX idx_reel_niches_niche_id ON reel_niches (niche_id);

-- ===================
-- Row Level Security
-- ===================
ALTER TABLE niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_niches ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all data
CREATE POLICY "Authenticated users can read niches"
  ON niches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert niches"
  ON niches FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update niches"
  ON niches FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete niches"
  ON niches FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read reels"
  ON reels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read reel_niches"
  ON reel_niches FOR SELECT
  TO authenticated
  USING (true);

-- Service role (used by cron/scraper) can do everything
CREATE POLICY "Service role full access on reels"
  ON reels FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on reel_niches"
  ON reel_niches FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on niches"
  ON niches FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
