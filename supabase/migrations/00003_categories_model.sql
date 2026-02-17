-- Migration: Add global categories and account-category assignments

-- ===================
-- Table: categories
-- ===================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Keep category names globally unique regardless of casing/spacing.
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_normalized
  ON categories (lower(trim(name)));

-- ===================
-- Table: account_categories (junction)
-- ===================
CREATE TABLE IF NOT EXISTS account_categories (
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (account_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_account_categories_category_id
  ON account_categories (category_id);

-- ===================
-- Row Level Security
-- ===================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_categories ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read categories and mappings
CREATE POLICY "Authenticated users can read categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read account_categories"
  ON account_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert account_categories"
  ON account_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete account_categories"
  ON account_categories FOR DELETE
  TO authenticated
  USING (true);

-- Service role full access
CREATE POLICY "Service role full access on categories"
  ON categories FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on account_categories"
  ON account_categories FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
