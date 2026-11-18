# Interview Notes – ModelCompare / Inferra

> Generated from the code, config, README and git history as of commit `340260b` (2026-03-09).
> "(inferred)" = my reading of the code, not something stated in it. "UNKNOWN – TQ to fill in" = cannot be confirmed from the repo.

## Project name

**ModelCompare** (README, Celery app name, SQL comments). The FastAPI app title is **"Inferra"** ([backend/main.py](backend/main.py)) and the Settings page uses `inf_live_` key prefixes, so the product was apparently being renamed (inferred).

## One-line summary

A multi-tenant SaaS for comparing LLMs side by side: send one prompt to several models (OpenAI, Anthropic, Google, Cohere via LiteLLM) and compare latency, token usage, cost and an LLM-as-a-judge quality score. It is aimed at engineers and teams choosing a model (inferred from the README and the workspace/RBAC design).

## My role

Sole developer (inferred from git history). All 14 commits belong to TQ under three identities: `TQ` (11 commits), `Lee Ter Qin(TQ)` via GitHub (1) and `leeterqin81` via Replit (1). Two of those commits came from AI tools (a Replit Agent commit and a "[Blink]" landing-page commit), and both were reverted (`4c1b2c5`, `33c4643`). Which parts TQ hand-wrote versus generated with AI help: **UNKNOWN – TQ to fill in** (expect to be asked).

## Tech stack

**Frontend** ([frontend/package.json](frontend/package.json))
- Next.js 16.1.6 (App Router), React 19.2.3, TypeScript ^5
- Tailwind CSS ^4, clsx, tailwind-merge, class-variance-authority, some Radix UI primitives
- Recharts ^3.7.0 (dashboard charts), Framer Motion ^12.34.4 (landing page), lucide-react
- @supabase/supabase-js ^2.98.0 (auth and some direct table reads)
- Listed but never imported: `@google/genai`, `react-router-dom`, `radius-ui`

**Backend** ([backend/requirements.txt](backend/requirements.txt))
- Python 3.12 (README; `__pycache__` has both cpython-312 and cpython-314 files)
- FastAPI 0.115.6, Uvicorn 0.32.1, Pydantic 2.10.3, pydantic-settings 2.7.0
- Listed but never imported: SQLAlchemy 2.0.36, Alembic 1.14.0, python-jose 3.3.0, passlib 1.7.4

**AI/ML**
- LiteLLM 1.55.8 (one interface to every provider), plus openai 1.58.1, anthropic 0.40.0, google-generativeai 0.8.3
- tiktoken 0.8.0 ([backend/app/utils/token_counter.py](backend/app/utils/token_counter.py), which nothing calls)
- jsonschema 4.23.0 (checks model output against a JSON Schema)

**Database/Storage**
- Supabase (PostgreSQL + GoTrue Auth), supabase-py 2.10.0
- DDL in [backend/migrations/schema.sql](backend/migrations/schema.sql), RLS policies in [backend/migrations/rls.sql](backend/migrations/rls.sql)
- Redis 5.2.1 client: Celery broker/result backend and a cache for model outputs

**Infra/DevOps**
- Celery 5.4.0 + Redis (worker plus beat scheduler), [backend/app/tasks/celery_app.py](backend/app/tasks/celery_app.py)
- VS Code launch configs for full-stack debugging, [.vscode/launch.json](.vscode/launch.json)
- `npm run dev:all` uses `concurrently` to run Next.js and Uvicorn together
- No Dockerfile, no CI, no hosting config

**Third-party services**
- OpenAI, Anthropic, Google Gemini and Cohere APIs (keys in [backend/app/core/config.py](backend/app/core/config.py))
- Stripe 11.3.0 (customers, subscriptions, webhook) in [backend/app/services/billing_service.py](backend/app/services/billing_service.py)
- Supabase OAuth with Google and GitHub ([frontend/app/components/AuthContext.tsx](frontend/app/components/AuthContext.tsx))

## How it works

This is the flow **as the backend was designed**. In the current frontend, the Compare and Dashboard pages still use mock data (see Weaknesses).

1. The user signs up or logs in through Supabase Auth from the browser (`AuthContext.tsx`). The browser stores a JWT.
2. The frontend calls FastAPI with `Authorization: Bearer <jwt>`. The headers are built in [frontend/services/api.ts](frontend/services/api.ts).
3. `get_current_user` ([backend/app/core/supabase/auth_dependency.py](backend/app/core/supabase/auth_dependency.py)) checks the token by calling `supabase_admin.auth.get_user(token)`.
4. The evaluation route checks workspace role (admin/engineer/viewer) and the monthly plan limit (`usage_service.enforce_plan_limit` or `_check_rate_limit`).
5. **Sync path** (`POST /evaluate`): `execute_models_parallel()` sends the prompt to every model at once with `asyncio.gather` through `litellm.acompletion`, recording latency, tokens and cost per model.
6. **Async path** (`POST /workspaces/{id}/evaluations`): the route inserts a `pending` row, calls `run_evaluation.delay(id)` and returns 202. A Celery worker picks the job up from Redis.
7. The worker looks in Redis for a cached output for each (prompt, system prompt, model), using a SHA-256 key. It runs only the models with no cached output and caches the new outputs (TTL 3600 s).
8. Optional post-processing: JSON/JSON-Schema validation, then an LLM judge scores each output 0–10 (`score_with_judge`), then `assign_badges` adds fastest / cheapest / best_quality / most_tokens / valid_json.
9. Results go to `evaluation_results`. Usage goes to `usage_logs` (async path) or to `usage_tracking` through the atomic `increment_usage()` SQL function (sync path). The evaluation is marked `completed`.
10. The client fetches `GET /evaluations/{id}` (async) or gets results in the response (sync). `GET /workspaces/{id}/analytics` combines the logs into per-model averages and daily trends.

```
┌──────────────────────┐   JWT    ┌─────────────────────────────┐
│ Next.js 16 frontend  │────────▶│ FastAPI (main.py)            │
│ AuthContext/Supabase │          │  routes → services → utils  │
└─────────┬────────────┘          └───┬───────────┬─────────────┘
          │ direct reads (RLS)        │ sync      │ async .delay()
          ▼                           ▼           ▼
┌──────────────────────┐     ┌──────────────┐  ┌───────────┐   ┌────────────────┐
│ Supabase Postgres    │◀────│ llm_executor │  │  Redis    │──▶│ Celery worker  │
│ + Auth + RLS         │     │ (LiteLLM,    │  │ broker +  │   │ run_evaluation │
│ evaluations, results,│◀────│ asyncio.     │◀─│ out cache │◀──│ cache→exec→    │
│ usage_*, workspaces  │     │ gather)      │  └───────────┘   │ judge→badges   │
└──────────────────────┘     └──────┬───────┘                  └────────────────┘
                                    ▼
                    OpenAI · Anthropic · Gemini · Cohere      Stripe (webhook, subs)
```

## Key components

1. **[backend/app/services/llm_executor.py](backend/app/services/llm_executor.py)**: sends the prompt to N models concurrently through LiteLLM. Each call gets a timeout and its errors are caught and returned as data, so one failing provider does not fail the whole run.
2. **[backend/app/tasks/evaluation_tasks.py](backend/app/tasks/evaluation_tasks.py)**: the Celery pipeline (cache → execute → validate → judge → badges → persist), with exponential-backoff retries and an hourly job that fails evaluations stuck in `running`.
3. **[backend/app/services/llm_judge.py](backend/app/services/llm_judge.py)**: LLM-as-a-judge. Uses a fixed rubric prompt, temperature 0 and a three-step parser that copes with badly formatted judge output.
4. **[backend/app/api/routes/evaluations.py](backend/app/api/routes/evaluations.py)**: both evaluation paths (sync `/evaluate` and async workspace evaluations), plus plan-limit and RBAC checks.
5. **[backend/app/services/usage_service.py](backend/app/services/usage_service.py)** + `increment_usage()` in [schema.sql](backend/migrations/schema.sql): per-plan monthly limits and an atomic usage upsert.
6. **[backend/migrations/rls.sql](backend/migrations/rls.sql)**: Postgres Row-Level Security policies for workspace multi-tenancy (`is_workspace_member` / `is_workspace_admin` helper functions).
7. **[backend/app/utils/cost_calculator.py](backend/app/utils/cost_calculator.py)** / **[badge_assigner.py](backend/app/utils/badge_assigner.py)**: a pricing table per model and the comparison badges.
8. **[frontend/app/compare/page.tsx](frontend/app/compare/page.tsx)** + [frontend/features/compare/components/](frontend/features/compare/components/): the 3-panel "Evaluation Lab" UI (prompt/config panel, result cards, metrics panel, CSV/JSON export).

## AI / ML details (if any)

- **Models/providers:** Ten models are seeded in `schema.sql` (GPT-4o, GPT-4o Mini, GPT-3.5 Turbo, Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus, Gemini 1.5 Pro/Flash, Command R/R+), all called through LiteLLM model strings such as `openai/gpt-4o`. The frontend's `AVAILABLE_MODELS` lists 8.
- **Execution:** Single-turn chat (optional system prompt + user prompt). Temperature is 1.0, or 0.0 when a `deterministic_seed` is set; the seed is passed through to the provider. The timeout is `LLM_TIMEOUT_SECONDS = 60`.
- **Prompts:** The judge system prompt asks for a 0–10 score (0 = wrong/harmful, 5 = partial, 10 = perfect) and replies of the form `{"score", "reasoning"}` ([llm_judge.py:26-45](backend/app/services/llm_judge.py#L26-L45)).
- **Evaluation:** LLM-as-a-judge only, scoring each output on its own (no pairwise comparison and no reference answers). The default judge is `gpt-4o`. JSON-mode outputs are also validated with `jsonschema`.
- **Guardrails:** The judge reply parser falls back from `json.loads` to a fenced-code-block regex to a loose regex, and checks the score is in range. JSON-schema validation of outputs. No content moderation, PII filtering or prompt-injection defence.
- **Caching:** Redis key = SHA-256 of `{prompt, system, model}`, TTL 3600 s. Async path only.
- **Agents / RAG / embeddings / vector store:** **None.** There is no retrieval, chunking or embedding code.
- **Cost tracking:** A static pricing table (USD per 1K tokens) with a fallback price for unknown models.

## Hardest technical problems

1. **Running many slow, unreliable provider calls at once.** `execute_models_parallel` uses `asyncio.gather` over `_call_single_model`, which catches every exception and returns a `ModelCallResult` with an `error` field instead of raising. A Cohere timeout therefore cannot fail the other models' results, and wall-clock time is roughly the slowest model rather than the sum. Latency is measured per call with `time.monotonic()`.
2. **Background job reliability.** The Celery config sets `task_acks_late=True` and `task_reject_on_worker_lost=True`, so a worker crash requeues the task instead of losing it. Retries back off exponentially (`countdown=5 * 2**retries`, max 3). A beat task runs every hour and marks evaluations stuck in `running` for more than 10 minutes as `failed`.
3. **Usage accounting under concurrency.** Monthly usage is incremented with a PL/pgSQL `INSERT … ON CONFLICT (user_id, year, month) DO UPDATE SET x = x + EXCLUDED.x` ([schema.sql:382-409](backend/migrations/schema.sql#L382-L409)), so parallel requests never lose increments, which a read-modify-write in Python could. *Caveat:* the limit **check** is still a separate earlier read, so concurrent requests can go over the limit (see Weaknesses).

*(Also worth discussing: the judge output parser in `llm_judge.py`, and multi-tenancy enforced twice, through FastAPI role checks and Postgres RLS.)*

## Key decisions and trade-offs

| Decision | Alternative | Why it makes sense |
|---|---|---|
| **LiteLLM** as one client for all providers | Separate OpenAI/Anthropic/Gemini SDK code | One call signature and one usage format. Adding a model means adding a string, not an integration. Cost: an extra dependency and a delay before new provider features are supported. |
| **Two evaluation paths**: sync `/evaluate` and async Celery | Only sync, or only async | Sync is simpler and fine for 2–3 fast models. Async avoids HTTP timeouts and adds caching and retries. Cost: two code paths that have already drifted apart (different column names and usage tables). |
| **Supabase** (Postgres + Auth + RLS) | Self-hosted Postgres + custom JWT auth | Auth, OAuth and RLS come built in, which lets a solo developer move fast. The unused `python-jose`/`passlib` suggest custom JWT auth was dropped (inferred). |
| **Service-role client in the backend, access checks in FastAPI** ([client.py](backend/app/core/supabase/client.py)) | User-JWT client so RLS applies to every query | Simpler queries, and the backend can write results and usage. Cost: RLS does nothing for backend queries, so one missing role check exposes data. |
| **Redis cache keyed by hash of prompt+model** | No cache, or a Postgres cache | Repeat comparisons cost no tokens. Cost: the key ignores temperature/seed, and cached rows report 0 ms latency and $0, which skews the metrics. |
| **LLM-as-a-judge** for quality | Human ratings, reference-based metrics (BLEU, exact match), pairwise judging | Works on open-ended prompts with no labelled data. Cost: the judge's own bias and an extra paid call per model. |
| **Per-model settings in JSONB, `model_ids` as `TEXT[]`** (schema) | Normalised settings table / junction table | Settings can change without a migration. The code does not follow this, though (see Weaknesses). |

## Numbers

All values below are configured limits or constants. **No measured performance, accuracy or usage data exists in the repo.**

- Plan limits ([config.py](backend/app/core/config.py), [usage_service.py](backend/app/services/usage_service.py)): Free = 100 evals/month and 500K tokens; Pro = 10,000 evals and 50M tokens; Enterprise = unlimited (-1).
- LLM timeout 60 s; Redis cache TTL 3600 s; Celery result expiry 86,400 s; `run_evaluation` rate limit 100/min; up to 3 retries.
- Stale-job sweep every 3600 s, threshold 10 min.
- Auth rate limits: signup 5/min per IP, login 10/min per IP ([routes/auth.py](backend/app/api/routes/auth.py)).
- Judge score range 0–10. History page shows up to 100 rows. List endpoints default to 20 items, capped at 100.
- 10 seeded models (backend), 8 in the frontend list. Context windows 16,385 to 2,000,000 tokens.
- Codebase: about 6,100 lines of TS/TSX in the frontend; 14 commits between 2026-03-03 and 2026-03-09.
- Test coverage: **0%** ([backend/tests/](backend/tests/) contains only `__init__.py`; the frontend has no tests).
- Latency, cost savings, accuracy, user counts: **UNKNOWN – TQ to fill in**

## Status

**A local prototype/demo, not deployed** (inferred).
- No Dockerfile, CI workflow, Vercel/Render/Fly config or production env files. `.env` is gitignored.
- CORS allows only `http://localhost:3000` ([main.py](backend/main.py)).
- Stripe price IDs are placeholders (`price_pro_monthly_placeholder`).
- A Replit deployment setup (`.replit`, `pyproject.toml`) was committed and then reverted (`66d5a8f` → `4c1b2c5`).
- Whether a Supabase project actually exists and has been used: **UNKNOWN – TQ to fill in**. The frontend reads tables (`profiles`, `usage_logs`) that are not in `schema.sql`, which suggests the live database was built differently from the migration file (inferred).
- Real users: **UNKNOWN – TQ to fill in** (nothing in the repo suggests any).

## Weaknesses and gaps (be honest)

**The frontend is not wired to the backend**
- `api` in [frontend/services/api.ts](frontend/services/api.ts) is **never imported**. [compare/page.tsx:52-92](frontend/app/compare/page.tsx#L52-L92) uses a mock `runEvaluation()` with `Math.random()` latency, tokens and judge scores, and hard-codes the badges by array index.
- [Dashboard/page.tsx:31-100](frontend/app/Dashboard/page.tsx#L31-L100) is all mock data (fake workspaces, random trends, 47 made-up evaluations).
- The Settings page shows hard-coded `MOCK_KEYS`; there is no API-key feature.
- The History, Profile and Settings pages query Supabase directly from the browser and skip FastAPI.

**Backend bugs that would fail at runtime** (inferred from reading the code; never run against tests)
- `get_current_user` returns a Pydantic `AuthUser`, but most routes then read `user["id"]` (e.g. [analytics.py:29](backend/app/api/routes/analytics.py#L29), billing, workspaces, users, async evaluations). Pydantic v2 models do not support item access, so these endpoints would raise a TypeError (HTTP 500). Only `/evaluate` uses `current_user.id` correctly.
- `/users/me` reads `user["created_at"]` and `/auth/me` returns `AuthUser` against a `UserProfile` response model that has required fields `AuthUser` lacks. Both would fail.
- `logout` declares `credentials = bearer_scheme` without `Depends(...)` ([routes/auth.py](backend/app/api/routes/auth.py)).
- The sync `/evaluate` route ignores the client's `temperature` and `max_tokens`; the executor only uses 1.0 or 0.0 ([llm_executor.py:96](backend/app/services/llm_executor.py#L96)).

**Code and schema do not match** ([schema.sql](backend/migrations/schema.sql))
- The code uses tables `profiles`, `usage_logs` and `billing_records`, which do not exist in the schema; the schema has `users` and `usage_tracking` instead.
- `workspaces`: the code writes `tier` with no `owner_id` ([workspaces.py:59](backend/app/api/routes/workspaces.py#L59)); the schema has `plan_tier` and `owner_id NOT NULL`.
- `evaluations.model_ids` is `TEXT[]`, but the async route stores a comma-joined string ([evaluations.py:106](backend/app/api/routes/evaluations.py#L106)) and writes columns (`judge_model`, `json_schema`, …) that the schema keeps inside a `settings` JSONB column.
- `evaluation_results`: the Celery task writes `output` / `cost_usd` / `judge_score`, while the sync path and the schema use `output_text` / `total_cost` / `quality_score`.
- The sync path records usage in `usage_tracking` and the async path in `usage_logs`. Analytics reads only `usage_logs`, so sync evaluations never appear in analytics.

**Security**
- **Plan tier is user-controllable.** The backend reads `plan_tier` from Supabase `user_metadata` ([auth_dependency.py:62](backend/app/core/supabase/auth_dependency.py#L62)). Users can write their own `user_metadata` with `supabase.auth.updateUser` (the frontend already does this in [onboarding/page.tsx:30](frontend/app/onboarding/page.tsx#L30)), so a free user could set `plan_tier: "enterprise"` and lift the limits on `/evaluate`. The fix is to read it from `app_metadata` or the database.
- The rate limiter keeps counts in process memory and trusts the client-supplied `X-Forwarded-For` header, so it can be bypassed by spoofing the header, and it resets on restart and is not shared across workers ([rate_limiter.py](backend/app/utils/rate_limiter.py)).
- The backend uses the service-role key for everything, so RLS gives no protection against backend bugs.
- [analytics.py:51-56](backend/app/api/routes/analytics.py#L51-L56) selects **every** row of `evaluation_results` across all tenants and filters in Python. That is both a scaling problem and a tenant-isolation risk.
- `invite_member` calls `auth.admin.list_users()`, loading the user list (first page only) to find an email ([workspaces.py:112](backend/app/api/routes/workspaces.py#L112)).
- Errors return raw exception text (`detail=f"Failed to create user profile: {exc}"`).
- The judge prompt inserts model output unescaped, so a model's output can manipulate its own score (prompt injection).

**Correctness / logic**
- Checking the plan limit and incrementing usage are separate steps (TOCTOU), so concurrent requests can exceed the limit.
- Cached results are saved with `latency_ms=0` and `cost_usd=0` ([evaluation_tasks.py:150](backend/app/tasks/evaluation_tasks.py#L150)), so cached models always get the "fastest" and "cheapest" badges. The cache key also ignores temperature/seed, so a random (temperature 1.0) output is served as if it were deterministic.
- The Celery task sets status `failed` and then retries. A retry after a partial insert could duplicate `evaluation_results` rows. It also calls `asyncio.run()` twice per task.
- The stale-job sweep compares against `created_at`, not the time the job started running.
- Billing: `upgrade_plan` requires a `stripe_customer_id`, but nothing calls `get_or_create_stripe_customer`, so upgrades always return 400. Price IDs are placeholders. `report_usage_to_stripe` only writes customer metadata, which is not metered billing. The webhook reads `workspace_id` from invoice metadata, which Stripe does not copy over from subscription metadata automatically, and `billing_records` is never written.
- Two hard-coded pricing tables that disagree: the frontend has Claude 3.5 Haiku at $0.00025/1K input, the backend at $0.0008. Prices are 2024-era and not loaded from the `models` table.
- The judge model can be one of the models it is judging, which risks self-preference bias.

**Hygiene**
- 43 `__pycache__/*.pyc` files are committed (they were committed before `.gitignore` was added).
- Unused dependencies: SQLAlchemy, Alembic, python-jose, passlib, `@google/genai`, `react-router-dom`, `radius-ui`. Duplicate Supabase clients in [frontend/lib/supabase.ts](frontend/lib/supabase.ts) and [frontend/app/lib/supabase.ts](frontend/app/lib/supabase.ts). Two `ModelSelector` components.
- The README says `app/dashboard/` (lowercase), but the folder is `app/Dashboard/`. There is no Next.js middleware protecting routes. The Supabase clients are created at import time, so the backend cannot even be imported without env vars, which makes it harder to test.
- No tests, no CI, no type checking or linting of the Python code.

## What I would improve for production

1. **Fix the auth and security holes first.** Take `plan_tier` from `app_metadata` or the `workspaces` table instead of `user_metadata`. Fix the `user["id"]` vs `user.id` bug. Switch the rate limiter to Redis (e.g. slowapi) and only trust `X-Forwarded-For` from a known proxy.
2. **Reconcile the code with the schema.** Pick one set of table and column names, write real versioned migrations (Supabase CLI or Alembic), and generate shared types (e.g. `supabase gen types`) so the frontend, backend and DB cannot drift apart.
3. **Connect the frontend to the API.** Replace the mocks in Compare and Dashboard with `api.runEvaluation` / `api.getAnalytics`. Use the async path with polling or SSE/WebSockets for long runs.
4. **Use one evaluation pipeline.** Have the sync route call the same service the Celery task uses, so caching, usage logging and column names stay in one place. Use an idempotency key or upsert so retries cannot duplicate results.
5. **Make limits and usage correct.** Do check-and-reserve in a single SQL function (atomic `UPDATE … WHERE count < limit RETURNING`), and keep the real latency and cost of a cached result while flagging it as `cached`.
6. **Tests and CI.** Unit tests for the judge parser, cost calculator and badges; route tests using an in-memory or mocked Supabase; a GitHub Actions workflow running pytest, ruff, mypy, `next build` and eslint.
7. **Improve evaluation quality.** Load pricing from the `models` table; offer pairwise or rubric-based judging, a judge separate from the models being compared, several judge samples, and delimiting/escaping of model outputs in the judge prompt.
8. **Deployment and observability.** Dockerfiles plus compose (API, worker, beat, Redis), CORS set from env, structured logging, and tracing per LLM call (e.g. OpenTelemetry or LiteLLM callbacks). Finish Stripe Checkout and a proper webhook flow.

## Likely interview questions

1. **"Walk me through what happens when a user clicks Run."**
   Today the Compare page runs a mock function. The real backend flow is: JWT verification, then role and plan-limit checks, then a fan-out to N models through LiteLLM with `asyncio.gather`, then optional JSON validation and LLM-judge scoring, then badges, then results saved to Supabase. Say up front that the frontend wiring is unfinished.

2. **"Why both a sync and an async path?"**
   Sync is simplest for a few fast models and gives an immediate response. Async (202 + Celery) avoids HTTP timeouts, survives worker crashes (`acks_late`) and adds caching and retries. The honest trade-off is that the two paths have drifted (different column names and usage tables), so I would merge them into one service.

3. **"How do you stop one slow or failing provider from breaking the comparison?"**
   Every model call has its own timeout and wraps its exceptions into a result object with an `error` field, so `gather` never raises. Badges only consider successful results, and the UI can show a per-model error.

4. **"How reliable is LLM-as-a-judge? How would you validate it?"**
   It is a cheap way to score open-ended answers, but it is biased (self-preference, verbosity, position) and can be prompt-injected by the output it is judging. I would check it against a small human-labelled set, use pairwise comparison, take several judge samples and keep the judge separate from the models being compared.

5. **"How does multi-tenancy and access control work?"**
   There are workspaces with admin/engineer/viewer roles, checked in FastAPI by `require_workspace_role`. Postgres RLS policies (`is_workspace_member`) apply to direct browser queries. The backend uses the service-role key, so for backend queries the FastAPI checks are the only line of defence, and I found a place (analytics) where a query is not scoped to the tenant.

6. **"How do you enforce plan limits without race conditions?"**
   Usage increments are atomic through `INSERT … ON CONFLICT DO UPDATE` in a SQL function. The check still happens before execution as a separate read, so concurrent requests can go over the limit. The fix is an atomic reserve step. I would also mention the `user_metadata` plan-tier issue and how I would fix it.

7. **"How does caching work, and what are the pitfalls?"**
   The Redis key is a SHA-256 of prompt, system prompt and model, with a one-hour TTL. Pitfalls: the key ignores temperature and seed; cached results report 0 ms and $0, which skews the "fastest/cheapest" badges; and caching random outputs is only valid in deterministic mode.

8. **"How do you calculate cost?"**
   Token counts come from the provider's `usage` field, multiplied by a static per-1K price table with a fallback price for unknown models. In production I would load prices from the `models` table (which already exists in the schema) or use LiteLLM's built-in cost map, because hard-coded prices go stale.

9. **"What would break first at scale?"**
   Analytics loads the whole `evaluation_results` table into Python; aggregation should happen in SQL. Next are the in-process rate limiter, calling Supabase on every request to verify the JWT instead of verifying it locally with the JWT secret, and `list_users()` in invites.

10. **"What's not finished, and what would you do next?"**
    Be direct: the frontend still uses mock data, code and schema have drifted, Stripe is a skeleton, and there are no tests or deployment. My priority order would be security fixes, then schema reconciliation, then wiring the frontend to the API, then tests and CI, then deployment.
