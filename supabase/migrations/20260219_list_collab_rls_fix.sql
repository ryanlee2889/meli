-- Fix: infinite recursion between lists ↔ list_collaborators RLS policies
--
-- Root cause:
--   lists_collab_select  → queries list_collaborators (to check if user is collab)
--   lc_owner_all         → queries lists (to check if user is owner)
--   These form a cycle that Postgres detects as infinite recursion.
--
-- Fix: SECURITY DEFINER helper functions bypass RLS when called from policies,
-- breaking both directions of the cycle.

-- ── Helper functions ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auth_user_owns_list(p_list_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lists WHERE id = p_list_id AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_is_list_collab(p_list_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM list_collaborators WHERE list_id = p_list_id AND user_id = auth.uid()
  );
$$;

-- ── list_collaborators policies (use SECURITY DEFINER fns — no cycle) ───────

DROP POLICY IF EXISTS "lc_owner_all" ON list_collaborators;
CREATE POLICY "lc_owner_all"
  ON list_collaborators FOR ALL
  USING (auth_user_owns_list(list_id))
  WITH CHECK (auth_user_owns_list(list_id));

-- Collaborators see all rows for lists they're part of
-- (auth_user_is_list_collab queries list_collaborators via SECURITY DEFINER — no recursion)
DROP POLICY IF EXISTS "lc_member_select" ON list_collaborators;
CREATE POLICY "lc_member_select"
  ON list_collaborators FOR SELECT
  USING (auth_user_is_list_collab(list_id));

-- ── lists policy (use SECURITY DEFINER fn — no cycle) ───────────────────────

DROP POLICY IF EXISTS "lists_collab_select" ON lists;
CREATE POLICY "lists_collab_select"
  ON lists FOR SELECT
  USING (auth_user_is_list_collab(id));

-- ── list_items policy (use SECURITY DEFINER fn — no cycle) ──────────────────

DROP POLICY IF EXISTS "list_items_collab_all" ON list_items;
CREATE POLICY "list_items_collab_all"
  ON list_items FOR ALL
  USING (auth_user_is_list_collab(list_id))
  WITH CHECK (auth_user_is_list_collab(list_id));
