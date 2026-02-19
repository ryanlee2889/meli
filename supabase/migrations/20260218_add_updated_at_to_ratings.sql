-- The ratings table is missing an updated_at column that a trigger expects.
-- Error surfaced as: "record 'new' has no field 'updated_at'"
--
-- Run this in Supabase Dashboard → SQL Editor.

ALTER TABLE ratings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Keep it current on every update (mirrors the pattern used on other tables).
CREATE OR REPLACE TRIGGER set_ratings_updated_at
  BEFORE UPDATE ON ratings
  FOR EACH ROW
  EXECUTE PROCEDURE moddatetime(updated_at);
