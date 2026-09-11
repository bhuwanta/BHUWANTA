-- migration-015-hierarchy-lineage.sql
--
-- One round trip for a person's ancestor chain, instead of one query per
-- level. The hierarchy visualizer walked parent_id upward in a loop: at
-- roughly 170ms per round trip, an LIA eight levels down cost ~1.9s of
-- pure network wait before the chart drew anything. Depth is bounded by
-- the hierarchy (~10), not headcount, so this stays flat whether there
-- are 50 users or 50,000 — the walk never touches rows outside the chain.
--
-- Safe to re-run: CREATE OR REPLACE, and it only reads.

CREATE OR REPLACE FUNCTION public.get_ancestor_chain(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    role TEXT,
    parent_id UUID,
    is_active BOOLEAN,
    depth INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH RECURSIVE chain AS (
        SELECT u.id, u.full_name::TEXT, u.role::TEXT, u.parent_id, u.is_active, 0 AS depth
        FROM public.S_realestate_users u
        WHERE u.id = p_user_id

        UNION ALL

        -- Walk to the parent. The depth guard is a cycle brake: parent_id
        -- has no DB-level constraint preventing a loop (only the reassign
        -- UI keeps them out), and without it a bad row would spin forever
        -- inside the database rather than in application code.
        SELECT p.id, p.full_name::TEXT, p.role::TEXT, p.parent_id, p.is_active, c.depth + 1
        FROM public.S_realestate_users p
        JOIN chain c ON p.id = c.parent_id
        WHERE c.depth < 25
    )
    SELECT chain.id, chain.full_name, chain.role, chain.parent_id, chain.is_active, chain.depth
    FROM chain
    ORDER BY chain.depth;
$$;

COMMENT ON FUNCTION public.get_ancestor_chain(UUID) IS
  'Self + every ancestor via parent_id, nearest first (depth 0 = the user). Used by the hierarchy visualizer''s focus mode to replace an N+1 upward walk. Depth-capped at 25 as a cycle guard.';

-- parent_id is walked on every level of both this function and the
-- downline queries; without an index each hop is a sequential scan.
CREATE INDEX IF NOT EXISTS idx_s_realestate_users_parent_id
    ON public.S_realestate_users(parent_id);

GRANT EXECUTE ON FUNCTION public.get_ancestor_chain(UUID) TO service_role;
