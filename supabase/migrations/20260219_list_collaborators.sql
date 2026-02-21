-- list_collaborators: users invited to collaborate on a list by the owner
CREATE TABLE IF NOT EXISTS list_collaborators (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id     UUID        NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by  UUID        REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (list_id, user_id)
);

ALTER TABLE list_collaborators ENABLE ROW LEVEL SECURITY;

-- List owner can manage all collaborator entries for their lists
DROP POLICY IF EXISTS "lc_owner_all" ON list_collaborators;
CREATE POLICY "lc_owner_all"
  ON list_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_collaborators.list_id
        AND lists.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_collaborators.list_id
        AND lists.owner_id = auth.uid()
    )
  );

-- Any involved user (collaborator or owner) can view the collaborator list
DROP POLICY IF EXISTS "lc_member_select" ON list_collaborators;
CREATE POLICY "lc_member_select"
  ON list_collaborators FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM list_collaborators lc2
      WHERE lc2.list_id = list_collaborators.list_id
        AND lc2.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_collaborators.list_id
        AND lists.owner_id = auth.uid()
    )
  );

-- Allow collaborators to SELECT lists they've been invited to (even private)
DROP POLICY IF EXISTS "lists_collab_select" ON lists;
CREATE POLICY "lists_collab_select"
  ON lists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM list_collaborators lc
      WHERE lc.list_id = lists.id AND lc.user_id = auth.uid()
    )
  );

-- Allow collaborators to manage items in lists they're on
DROP POLICY IF EXISTS "list_items_collab_all" ON list_items;
CREATE POLICY "list_items_collab_all"
  ON list_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM list_collaborators lc
      WHERE lc.list_id = list_items.list_id AND lc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM list_collaborators lc
      WHERE lc.list_id = list_items.list_id AND lc.user_id = auth.uid()
    )
  );

-- Allow authenticated users to look up profiles by username (needed for invite flow)
DROP POLICY IF EXISTS "profiles_auth_select" ON profiles;
CREATE POLICY "profiles_auth_select"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');
