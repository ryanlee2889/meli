-- The ratings table is missing an updated_at column that a trigger expects.
-- Error surfaced as: "record 'new' has no field 'updated_at'"
--
-- Run this in Supabase Dashboard → SQL Editor.

ALTER TABLE ratings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- moddatetime lives in the pg_moddatetime extension (available on Supabase).
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- Keep it current on every update (mirrors the pattern used on other tables).
DROP TRIGGER IF EXISTS set_ratings_updated_at ON ratings;
CREATE TRIGGER set_ratings_updated_at
  BEFORE UPDATE ON ratings
  FOR EACH ROW
  EXECUTE PROCEDURE extensions.moddatetime(updated_at);
