-- Add custom cover image URL to lists table
ALTER TABLE lists ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Storage bucket for list cover images (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('list-covers', 'list-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Policies: owner can upload/update/delete, anyone can read
DROP POLICY IF EXISTS "list_covers_insert" ON storage.objects;
CREATE POLICY "list_covers_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'list-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "list_covers_update" ON storage.objects;
CREATE POLICY "list_covers_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'list-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "list_covers_select" ON storage.objects;
CREATE POLICY "list_covers_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'list-covers');

DROP POLICY IF EXISTS "list_covers_delete" ON storage.objects;
CREATE POLICY "list_covers_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'list-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
