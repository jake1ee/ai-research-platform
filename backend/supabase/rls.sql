-- =============================================================================
-- ModelCompare – Row Level Security (RLS) Policies
-- =============================================================================
-- Run AFTER schema.sql.
--
-- Design rules
-- ------------
--   • auth.uid()  – the UUID of the currently authenticated Supabase user.
--   • Service-role key bypasses RLS entirely (used by backend for writes).
--   • User-facing reads always use the anon/user JWT (RLS enforced).
--   • "workspace member" check is a subquery to avoid recursive RLS issues.
--
-- Policy naming convention:
--   "<table>_<action>_<subject>"
--   e.g. "evaluations_select_own" – users can SELECT their own evaluations.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: is the current user a member of a given workspace?
--   Used in multiple policies to avoid duplicated subqueries.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE          -- result is constant within one SQL statement
SECURITY INVOKER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM   public.workspace_members
        WHERE  workspace_id = p_workspace_id
        AND    user_id      = auth.uid()
    );
$$;

-- Helper: is the current user an admin of a given workspace?
CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM   public.workspace_members
        WHERE  workspace_id = p_workspace_id
        AND    user_id      = auth.uid()
        AND    role         = 'admin'
    );
$$;


-- =============================================================================
-- 1. users
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile.
-- Workspace members can read each other's minimal profiles (for the member list UI).
CREATE POLICY "users_select_self_or_coworker"
    ON public.users
    FOR SELECT
    USING (
        -- own profile
        id = auth.uid()
        OR
        -- co-worker: both users share at least one workspace
        EXISTS (
            SELECT 1
            FROM   public.workspace_members wm1
            JOIN   public.workspace_members wm2
                   ON wm1.workspace_id = wm2.workspace_id
            WHERE  wm1.user_id = auth.uid()
            AND    wm2.user_id = public.users.id
        )
    );

-- Users can update only their own profile (name, avatar_url, etc.).
-- plan_tier and stripe_customer_id are updated via service role only.
CREATE POLICY "users_update_self"
    ON public.users
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Deletion is handled by Supabase Auth (CASCADE from auth.users); not user-facing.
-- No DELETE policy needed on public.users.


-- =============================================================================
-- 2. workspaces
-- =============================================================================
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Any member of the workspace can see it.
CREATE POLICY "workspaces_select_member"
    ON public.workspaces
    FOR SELECT
    USING (public.is_workspace_member(id));

-- Any authenticated user can create a workspace (they become the owner).
CREATE POLICY "workspaces_insert_authenticated"
    ON public.workspaces
    FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- Only workspace admins can update workspace settings.
CREATE POLICY "workspaces_update_admin"
    ON public.workspaces
    FOR UPDATE
    USING  (public.is_workspace_admin(id))
    WITH CHECK (public.is_workspace_admin(id));

-- Only the owner can delete the workspace.
CREATE POLICY "workspaces_delete_owner"
    ON public.workspaces
    FOR DELETE
    USING (owner_id = auth.uid());


-- =============================================================================
-- 3. workspace_members
-- =============================================================================
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Any member can list who else is in the workspace.
CREATE POLICY "workspace_members_select_member"
    ON public.workspace_members
    FOR SELECT
    USING (public.is_workspace_member(workspace_id));

-- Only workspace admins can invite new members.
CREATE POLICY "workspace_members_insert_admin"
    ON public.workspace_members
    FOR INSERT
    WITH CHECK (public.is_workspace_admin(workspace_id));

-- Only workspace admins can change someone's role.
CREATE POLICY "workspace_members_update_admin"
    ON public.workspace_members
    FOR UPDATE
    USING  (public.is_workspace_admin(workspace_id))
    WITH CHECK (public.is_workspace_admin(workspace_id));

-- Admins can remove any member; users can remove themselves.
CREATE POLICY "workspace_members_delete_admin_or_self"
    ON public.workspace_members
    FOR DELETE
    USING (
        public.is_workspace_admin(workspace_id)
        OR user_id = auth.uid()
    );


-- =============================================================================
-- 4. models
-- =============================================================================
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

-- The model catalogue is readable by all authenticated users.
CREATE POLICY "models_select_authenticated"
    ON public.models
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- INSERT / UPDATE / DELETE are performed via the service role key only
-- (no user-facing mutation policies needed – service role bypasses RLS).


-- =============================================================================
-- 5. prompts
-- =============================================================================
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

-- Users can read:
--   a) their own prompts (personal)
--   b) prompts in workspaces they belong to
--   c) prompts marked as public
CREATE POLICY "prompts_select"
    ON public.prompts
    FOR SELECT
    USING (
        user_id    = auth.uid()
        OR is_public = TRUE
        OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
    );

-- Users can only insert prompts where they are the author.
CREATE POLICY "prompts_insert_self"
    ON public.prompts
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Authors can update their own prompts; workspace admins can update team prompts.
CREATE POLICY "prompts_update_author_or_admin"
    ON public.prompts
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR (workspace_id IS NOT NULL AND public.is_workspace_admin(workspace_id))
    )
    WITH CHECK (
        user_id = auth.uid()
        OR (workspace_id IS NOT NULL AND public.is_workspace_admin(workspace_id))
    );

-- Same rule for deletion.
CREATE POLICY "prompts_delete_author_or_admin"
    ON public.prompts
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR (workspace_id IS NOT NULL AND public.is_workspace_admin(workspace_id))
    );


-- =============================================================================
-- 6. evaluations
-- =============================================================================
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Users can see:
--   a) their own personal evaluations
--   b) evaluations in workspaces they belong to
CREATE POLICY "evaluations_select"
    ON public.evaluations
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
    );

-- Users can only create evaluations for themselves.
-- The API enforces workspace membership before inserting.
CREATE POLICY "evaluations_insert_self"
    ON public.evaluations
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Only the evaluation owner can update the row (e.g. status changes by the backend
-- are done via the service role key which bypasses this).
CREATE POLICY "evaluations_update_owner"
    ON public.evaluations
    FOR UPDATE
    USING  (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Owners can delete their own evaluations (CASCADE removes results).
CREATE POLICY "evaluations_delete_owner"
    ON public.evaluations
    FOR DELETE
    USING (user_id = auth.uid());


-- =============================================================================
-- 7. evaluation_results
-- =============================================================================
ALTER TABLE public.evaluation_results ENABLE ROW LEVEL SECURITY;

-- Users can read results if they can see the parent evaluation.
CREATE POLICY "evaluation_results_select"
    ON public.evaluation_results
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM   public.evaluations e
            WHERE  e.id = evaluation_results.evaluation_id
            AND    (
                e.user_id = auth.uid()
                OR (e.workspace_id IS NOT NULL AND public.is_workspace_member(e.workspace_id))
            )
        )
    );

-- INSERT / UPDATE / DELETE only via service role key (backend writes results).
-- No user-facing mutation policies.


-- =============================================================================
-- 8. usage_tracking
-- =============================================================================
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can read only their own usage data.
CREATE POLICY "usage_tracking_select_self"
    ON public.usage_tracking
    FOR SELECT
    USING (user_id = auth.uid());

-- Workspace admins can read the workspace's aggregate usage.
CREATE POLICY "usage_tracking_select_workspace_admin"
    ON public.usage_tracking
    FOR SELECT
    USING (
        workspace_id IS NOT NULL
        AND public.is_workspace_admin(workspace_id)
    );

-- All writes (INSERT / UPDATE) use the increment_usage() function via service role.
-- No user-facing mutation policies.
