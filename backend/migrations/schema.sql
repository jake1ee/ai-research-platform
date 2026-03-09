-- =============================================================================
-- ModelCompare – Supabase (PostgreSQL) Schema
-- =============================================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Tables live in the "public" schema.  Auth is handled by auth.users.
--
-- Conventions
-- -----------
--   • All PKs are UUID with gen_random_uuid() defaults.
--   • All timestamps are TIMESTAMPTZ (timezone-aware).
--   • Cost fields use NUMERIC for financial precision (no float rounding).
--   • JSONB used for flexible setting bags (avoids ALTER TABLE on every change).
--   • TEXT arrays (text[]) used for model_ids (Postgres native, no junction table).
--   • Every FK column has an index for fast joins.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions (idempotent)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- gen_random_uuid() fallback
CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- crypt() for any app-level hashing

-- ---------------------------------------------------------------------------
-- 1. users
--    Public profile that extends Supabase's auth.users.
--    Created automatically by a trigger when a user signs up.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    -- References the Supabase Auth user. Cascade-delete cleans up on account deletion.
    id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    email           TEXT        NOT NULL UNIQUE,
    name            TEXT        NOT NULL DEFAULT '',

    -- Billing plan. Drives rate-limit decisions in the API.
    plan_tier       TEXT        NOT NULL DEFAULT 'free'
                    CHECK (plan_tier IN ('free', 'pro', 'enterprise')),

    -- Stripe customer ID (populated when the user upgrades).
    stripe_customer_id TEXT,

    avatar_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.users                  IS 'User profiles linked 1-to-1 with auth.users';
COMMENT ON COLUMN public.users.plan_tier        IS 'free | pro | enterprise – controls monthly limits';
COMMENT ON COLUMN public.users.stripe_customer_id IS 'Set when the user adds a payment method';

-- Trigger: keep updated_at fresh on every UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: auto-create a users row when auth.users gets a new record
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Hook into Supabase Auth
CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 2. workspaces
--    Team containers. Each user gets a personal workspace on signup.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL,

    -- The user who created (and owns) the workspace.
    owner_id        UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    plan_tier       TEXT        NOT NULL DEFAULT 'free'
                    CHECK (plan_tier IN ('free', 'pro', 'enterprise')),

    stripe_customer_id TEXT,

    -- Optional: custom slug for vanity URLs (/workspaces/acme-corp)
    slug            TEXT        UNIQUE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.workspaces             IS 'Team containers – each user has ≥1 workspace';
COMMENT ON COLUMN public.workspaces.owner_id    IS 'The user who created the workspace; always an ADMIN member';
COMMENT ON COLUMN public.workspaces.plan_tier   IS 'Overrides user plan tier for team billing';

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces (owner_id);

CREATE TRIGGER trg_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. workspace_members
--    Many-to-many users ↔ workspaces with role-based access control.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_members (
    workspace_id    UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES public.users(id)      ON DELETE CASCADE,

    -- RBAC role within this workspace
    role            TEXT        NOT NULL DEFAULT 'viewer'
                    CHECK (role IN ('admin', 'engineer', 'viewer')),

    -- Who sent the invitation
    invited_by      UUID        REFERENCES public.users(id) ON DELETE SET NULL,

    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (workspace_id, user_id)
);

COMMENT ON COLUMN public.workspace_members.role IS
    'admin: full control | engineer: run evals | viewer: read-only';

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id      ON public.workspace_members (user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members (workspace_id);

-- ---------------------------------------------------------------------------
-- 4. models
--    Catalogue of supported LLMs.  Updated by admins via the service role key.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.models (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Human-readable provider label: 'OpenAI', 'Anthropic', 'Google', 'Cohere'
    provider            TEXT        NOT NULL,

    -- Display name shown in the UI: 'GPT-4o', 'Claude 3.5 Sonnet'
    name                TEXT        NOT NULL,

    -- LiteLLM model string used in API calls: 'openai/gpt-4o'
    litellm_id          TEXT        NOT NULL UNIQUE,

    -- Pricing in USD per 1 000 tokens
    cost_per_1k_input   NUMERIC(12, 8) NOT NULL DEFAULT 0,
    cost_per_1k_output  NUMERIC(12, 8) NOT NULL DEFAULT 0,

    -- Maximum prompt + completion token budget
    context_window      INTEGER     NOT NULL,

    -- Whether this model is currently offered in the UI
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.models                     IS 'LLM catalogue – seed rows inserted by admin migration';
COMMENT ON COLUMN public.models.litellm_id          IS 'Passed directly to litellm.acompletion(model=...)';
COMMENT ON COLUMN public.models.cost_per_1k_input   IS 'USD per 1 000 prompt tokens';
COMMENT ON COLUMN public.models.cost_per_1k_output  IS 'USD per 1 000 completion tokens';
COMMENT ON COLUMN public.models.context_window      IS 'Max total tokens (prompt + completion)';

CREATE INDEX IF NOT EXISTS idx_models_provider   ON public.models (provider);
CREATE INDEX IF NOT EXISTS idx_models_is_active  ON public.models (is_active);

CREATE TRIGGER trg_models_updated_at
    BEFORE UPDATE ON public.models
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed: common models (update pricing as providers change rates)
INSERT INTO public.models (provider, name, litellm_id, cost_per_1k_input, cost_per_1k_output, context_window) VALUES
    ('OpenAI',    'GPT-4o',              'openai/gpt-4o',                          0.00250000, 0.01000000, 128000),
    ('OpenAI',    'GPT-4o Mini',         'openai/gpt-4o-mini',                     0.00015000, 0.00060000, 128000),
    ('OpenAI',    'GPT-3.5 Turbo',       'openai/gpt-3.5-turbo',                   0.00050000, 0.00150000,  16385),
    ('Anthropic', 'Claude 3.5 Sonnet',   'anthropic/claude-3-5-sonnet-20241022',   0.00300000, 0.01500000, 200000),
    ('Anthropic', 'Claude 3.5 Haiku',    'anthropic/claude-3-5-haiku-20241022',    0.00080000, 0.00400000, 200000),
    ('Anthropic', 'Claude 3 Opus',       'anthropic/claude-3-opus-20240229',       0.01500000, 0.07500000, 200000),
    ('Google',    'Gemini 1.5 Pro',      'google/gemini-1.5-pro',                  0.00125000, 0.00500000, 2000000),
    ('Google',    'Gemini 1.5 Flash',    'google/gemini-1.5-flash',                0.00007500, 0.00030000, 1000000),
    ('Cohere',    'Command R+',          'cohere/command-r-plus',                  0.00300000, 0.01500000, 128000),
    ('Cohere',    'Command R',           'cohere/command-r',                       0.00050000, 0.00150000, 128000)
ON CONFLICT (litellm_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. prompts
--    Saved prompt templates with version chaining.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prompts (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Scope: personal (workspace_id IS NULL) or team
    workspace_id    UUID        REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    title           TEXT        NOT NULL,
    content         TEXT        NOT NULL,           -- The user prompt template
    system_prompt   TEXT,                           -- Optional system instruction

    -- Versioning: version starts at 1; parent_id points to the previous version
    version         INTEGER     NOT NULL DEFAULT 1,
    parent_id       UUID        REFERENCES public.prompts(id) ON DELETE SET NULL,

    -- Allow sharing templates across the platform
    is_public       BOOLEAN     NOT NULL DEFAULT FALSE,

    -- Optional tags for search (e.g. ['coding', 'summarisation'])
    tags            TEXT[],

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.prompts.parent_id   IS 'Forms a version chain: v3 → v2 → v1 (v1 has NULL parent_id)';
COMMENT ON COLUMN public.prompts.is_public   IS 'Public prompts are readable by all authenticated users';

CREATE INDEX IF NOT EXISTS idx_prompts_user_id      ON public.prompts (user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_workspace_id ON public.prompts (workspace_id);
CREATE INDEX IF NOT EXISTS idx_prompts_parent_id    ON public.prompts (parent_id);
-- Full-text search index on title and content
CREATE INDEX IF NOT EXISTS idx_prompts_fts ON public.prompts
    USING GIN (to_tsvector('english', title || ' ' || content));

-- ---------------------------------------------------------------------------
-- 6. evaluations
--    One evaluation = one prompt submitted to multiple LLMs simultaneously.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evaluations (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- NULL for personal (non-workspace) evaluations
    workspace_id    UUID        REFERENCES public.workspaces(id) ON DELETE SET NULL,

    -- Optional reference to a saved prompt template
    prompt_id       UUID        REFERENCES public.prompts(id) ON DELETE SET NULL,

    -- The actual prompt text (copied from template or entered directly)
    prompt          TEXT        NOT NULL,
    system_prompt   TEXT,

    -- Execution settings stored as JSONB for flexibility without schema changes.
    -- Expected keys:
    --   temperature       FLOAT    (default 1.0; 0.0 in deterministic mode)
    --   max_tokens        INTEGER
    --   deterministic_seed INTEGER (when set, temperature is forced to 0)
    --   require_json_output BOOLEAN
    --   json_schema       OBJECT  (JSON Schema the output must conform to)
    --   judge_model       STRING  (litellm_id of the judge, e.g. "openai/gpt-4o")
    settings        JSONB       NOT NULL DEFAULT '{}',

    -- Array of litellm_id strings, e.g. ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet-20241022']
    model_ids       TEXT[]      NOT NULL,

    status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'running', 'completed', 'failed')),

    -- Populated once all models have responded
    completed_at    TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.evaluations.settings IS
    'Flexible bag: temperature, max_tokens, deterministic_seed, judge_model, require_json_output, json_schema';
COMMENT ON COLUMN public.evaluations.model_ids IS
    'Array of LiteLLM model strings submitted for this run';

CREATE INDEX IF NOT EXISTS idx_evaluations_user_id      ON public.evaluations (user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_workspace_id ON public.evaluations (workspace_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_status       ON public.evaluations (status);
-- Composite: most common query – "latest evals for workspace X"
CREATE INDEX IF NOT EXISTS idx_evaluations_ws_created
    ON public.evaluations (workspace_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 7. evaluation_results
--    One row per model per evaluation.  Inserted by the backend after each
--    model call completes.  Never mutated after insertion.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evaluation_results (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    evaluation_id   UUID        NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,

    -- litellm_id string, e.g. 'openai/gpt-4o'
    model_id        TEXT        NOT NULL,

    -- The raw completion text from the model
    output_text     TEXT,

    -- Token counts reported by the provider
    input_tokens    INTEGER     NOT NULL DEFAULT 0,
    output_tokens   INTEGER     NOT NULL DEFAULT 0,

    -- Wall-clock latency (ms) from request start to full response received
    latency_ms      NUMERIC(10, 2) NOT NULL DEFAULT 0,

    -- Calculated cost in USD: (input/1000 * cpi) + (output/1000 * cpo)
    total_cost      NUMERIC(12, 8) NOT NULL DEFAULT 0,

    -- LLM-as-a-Judge scoring (0.0 – 10.0); NULL when judge was not requested
    quality_score   NUMERIC(4, 2)  CHECK (quality_score BETWEEN 0 AND 10),
    judge_reasoning TEXT,

    -- Populated when evaluations.settings->>'require_json_output' = true
    is_valid_json           BOOLEAN,
    json_validation_error   TEXT,

    -- Set when the model call failed (timeout, rate limit, etc.)
    error           TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.evaluation_results.latency_ms  IS 'End-to-end latency in milliseconds';
COMMENT ON COLUMN public.evaluation_results.total_cost  IS 'USD cost calculated from provider pricing';
COMMENT ON COLUMN public.evaluation_results.quality_score IS 'LLM-as-a-Judge score 0-10; NULL if not judged';

CREATE INDEX IF NOT EXISTS idx_eval_results_evaluation_id ON public.evaluation_results (evaluation_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_model_id      ON public.evaluation_results (model_id);

-- ---------------------------------------------------------------------------
-- 8. usage_tracking
--    One row per (user, year, month).  UPSERTED atomically after each
--    evaluation so the backend can cheaply check monthly limits.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- NULL for personal evaluations, set for workspace evaluations
    workspace_id    UUID        REFERENCES public.workspaces(id) ON DELETE SET NULL,

    year            SMALLINT    NOT NULL,
    month           SMALLINT    NOT NULL CHECK (month BETWEEN 1 AND 12),

    -- Running totals for the month
    eval_count      INTEGER     NOT NULL DEFAULT 0,
    input_tokens    BIGINT      NOT NULL DEFAULT 0,
    output_tokens   BIGINT      NOT NULL DEFAULT 0,
    total_cost      NUMERIC(14, 8) NOT NULL DEFAULT 0,

    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One row per user per calendar month
    UNIQUE (user_id, year, month)
);

COMMENT ON TABLE  public.usage_tracking                IS 'Monthly usage totals – upserted after every evaluation';
COMMENT ON COLUMN public.usage_tracking.eval_count     IS 'Evaluations submitted this month (for rate limiting)';
COMMENT ON COLUMN public.usage_tracking.total_cost     IS 'Cumulative USD spend this month';

CREATE INDEX IF NOT EXISTS idx_usage_user_id       ON public.usage_tracking (user_id);
CREATE INDEX IF NOT EXISTS idx_usage_workspace_id  ON public.usage_tracking (workspace_id);
-- Fast lookup: "current month usage for user X"
CREATE INDEX IF NOT EXISTS idx_usage_user_month
    ON public.usage_tracking (user_id, year, month);

-- ---------------------------------------------------------------------------
-- 9. Atomic upsert function for usage tracking
--    Called by the FastAPI backend after an evaluation completes.
--    Using a function keeps the upsert logic in one place and is RLS-safe
--    (declared SECURITY DEFINER so the service role can call it).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_usage(
    p_user_id       UUID,
    p_workspace_id  UUID,
    p_year          SMALLINT,
    p_month         SMALLINT,
    p_eval_count    INTEGER,
    p_input_tokens  BIGINT,
    p_output_tokens BIGINT,
    p_total_cost    NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER   -- runs as the function owner, bypassing RLS for safe writes
AS $$
BEGIN
    INSERT INTO public.usage_tracking
        (user_id, workspace_id, year, month, eval_count, input_tokens, output_tokens, total_cost)
    VALUES
        (p_user_id, p_workspace_id, p_year, p_month,
         p_eval_count, p_input_tokens, p_output_tokens, p_total_cost)
    ON CONFLICT (user_id, year, month) DO UPDATE SET
        eval_count    = usage_tracking.eval_count    + EXCLUDED.eval_count,
        input_tokens  = usage_tracking.input_tokens  + EXCLUDED.input_tokens,
        output_tokens = usage_tracking.output_tokens + EXCLUDED.output_tokens,
        total_cost    = usage_tracking.total_cost    + EXCLUDED.total_cost,
        updated_at    = NOW();
END;
$$;

COMMENT ON FUNCTION public.increment_usage IS
    'Atomically increments monthly usage totals. Call after every evaluation.';
