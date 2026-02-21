-- Unique constraint required for upsert ON CONFLICT to work
ALTER TABLE items ADD CONSTRAINT items_spotify_id_unique UNIQUE (spotify_id);

-- The items table is a shared music catalog.
-- Authenticated users need to be able to upsert tracks discovered via Spotify
-- so that daily queues and ratings can reference them.

-- Read: anyone authenticated can read the catalog
DROP POLICY IF EXISTS "items_select" ON items;
CREATE POLICY "items_select"
  ON items FOR SELECT
  USING (auth.role() = 'authenticated');

-- Insert: authenticated users can add new catalog entries
DROP POLICY IF EXISTS "items_insert" ON items;
CREATE POLICY "items_insert"
  ON items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Update: authenticated users can update existing catalog entries
-- (e.g. refresh image URLs, preview URLs from Spotify)
DROP POLICY IF EXISTS "items_update" ON items;
CREATE POLICY "items_update"
  ON items FOR UPDATE
  USING (auth.role() = 'authenticated');
