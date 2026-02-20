-- Migration: Add per-user favorite reels with completion status

-- ===================
-- Table: user_favorites
-- ===================
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reel_id uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, reel_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id
  ON user_favorites (user_id);

CREATE INDEX IF NOT EXISTS idx_user_favorites_reel_id
  ON user_favorites (reel_id);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_completed
  ON user_favorites (user_id, completed);

-- Keep updated_at current for completion toggles.
CREATE OR REPLACE FUNCTION set_user_favorites_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_user_favorites_updated_at ON user_favorites;
CREATE TRIGGER trg_set_user_favorites_updated_at
  BEFORE UPDATE ON user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION set_user_favorites_updated_at();

-- ===================
-- Row Level Security
-- ===================
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own user_favorites"
  ON user_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own user_favorites"
  ON user_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own user_favorites"
  ON user_favorites FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own user_favorites"
  ON user_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access on user_favorites"
  ON user_favorites FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
