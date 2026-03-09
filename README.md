# ModelCompare – AI SaaS Monorepo

Multi-LLM evaluation platform. Compare latency, cost, and quality across OpenAI, Anthropic, Google, and Cohere models side-by-side.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 · React 19 · TypeScript · Tailwind CSS |
| Backend | FastAPI · Python 3.12 · Pydantic v2 |
| Database / Auth | Supabase (PostgreSQL + GoTrue Auth) |
| LLM execution | LiteLLM (unified interface for all providers) |
| Task queue | Celery + Redis |
| Billing | Stripe |

---

## Project Structure

```
.
├── backend/          FastAPI application
└── frontend/         Next.js application
```

---

## Backend (`backend/`)

```
backend/
├── main.py                      ← Entry point: uvicorn main:app
├── requirements.txt
├── .env                         ← Copy from .env.example and fill secrets
│
├── app/
│   ├── api/
│   │   └── routes/
│   │       ├── auth.py          POST /auth/signup, /auth/login, …
│   │       ├── users.py         GET /users/me, /users/me/workspaces
│   │       ├── workspaces.py    CRUD /workspaces, members, usage, upgrade
│   │       ├── evaluations.py   POST /evaluate (sync) + /workspaces/*/evaluations (async)
│   │       ├── billing.py       GET /billing/report, /billing/history; POST /billing/webhook
│   │       └── analytics.py     GET /workspaces/*/analytics
│   │
│   ├── core/
│   │   ├── config.py            pydantic-settings → Settings singleton
│   │   └── supabase/
│   │       ├── client.py        supabase_admin + get_supabase()
│   │       └── auth_dependency.py  get_current_user FastAPI dependency
│   │
│   ├── schemas/                 Pydantic v2 schemas (one file per domain)
│   │   ├── common.py            PlanTier, Role, EvaluationStatus, BillingStatus enums
│   │   ├── auth.py              SignupRequest, AuthResponse, UserProfile, …
│   │   ├── workspace.py         WorkspaceCreate/Response, UsageStats, …
│   │   ├── evaluation.py        EvaluationCreate/Response, EvaluateRequest/Response, …
│   │   ├── billing.py           BillingRecordResponse
│   │   └── analytics.py         AnalyticsSummary, ModelMetricPoint
│   │
│   ├── services/                Business logic (no HTTP concerns)
│   │   ├── auth_service.py      signup_user, login_user, logout_user, refresh_session
│   │   ├── evaluation_service.py EvaluationService (CRUD + status updates)
│   │   ├── workspace_service.py  WorkspaceService (membership, role checks)
│   │   ├── billing_service.py   Stripe integration + monthly reports
│   │   ├── usage_service.py     Plan limits + atomic usage tracking
│   │   ├── llm_executor.py      execute_models_parallel() via LiteLLM
│   │   └── llm_judge.py         score_with_judge() – LLM-as-a-Judge
│   │
│   ├── dependencies/
│   │   └── workspace.py         require_workspace_role(), get_workspace_or_404()
│   │
│   ├── tasks/                   Celery async tasks
│   │   ├── celery_app.py        Celery factory + beat schedule
│   │   └── evaluation_tasks.py  run_evaluation task + cleanup_stale_evaluations
│   │
│   └── utils/
│       ├── badge_assigner.py    fastest / cheapest / best_quality badges
│       ├── cost_calculator.py   USD cost per model call
│       ├── json_validator.py    JSON + jsonschema validation
│       ├── rate_limiter.py      In-process sliding-window rate limiter
│       └── token_counter.py     tiktoken-based token counting
│
├── migrations/
│   ├── schema.sql               Full DDL (run in Supabase SQL Editor)
│   └── rls.sql                  Row-Level Security policies
│
└── tests/
```

### Running the backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Copy and fill the env file
cp .env .env.local  # or edit .env directly

# Start the API server
uvicorn main:app --reload --port 8000

# Start a Celery worker (separate terminal)
celery -A app.tasks.celery_app worker --loglevel=info

# Start Celery Beat for scheduled tasks (separate terminal)
celery -A app.tasks.celery_app beat --loglevel=info
```

### API docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Frontend (`frontend/`)

```
frontend/
├── app/                          Next.js App Router pages
│   ├── layout.tsx
│   ├── page.tsx                  Landing page → <LandingPage />
│   ├── providers.tsx             <AuthProvider> wrapper
│   ├── dashboard/                Dashboard (lowercase – Next.js convention)
│   │   ├── layout.tsx            Sidebar layout
│   │   └── page.tsx              Performance Intelligence dashboard
│   ├── compare/
│   │   └── page.tsx              Evaluation Lab (3-panel compare UI)
│   ├── login/page.tsx
│   └── signup/page.tsx
│
├── components/                   Shared UI components
│   ├── ui/                       Generic, reusable primitives
│   │   ├── Logo.tsx
│   │   ├── SkeletonCard.tsx
│   │   └── StatsBar.tsx
│   ├── auth/
│   │   └── AuthModal.tsx         Sign-in / sign-up modal
│   ├── landing/
│   │   └── LandingPage.tsx
│   └── layout/
│       └── Sidebar.tsx           App navigation sidebar
│
├── features/                     Feature-scoped components (co-located logic)
│   ├── compare/
│   │   └── components/
│   │       ├── Badge.tsx         fastest / cheapest / best_quality badges
│   │       ├── MetricsPanel.tsx  Right panel: charts + scores
│   │       ├── ModelResultCard.tsx
│   │       ├── ModelSelector.tsx
│   │       └── PromptPanel.tsx   Left panel: config + model selection
│   └── dashboard/
│       └── components/
│           ├── ChartCard.tsx
│           ├── EvaluationTable.tsx
│           ├── KPICard.tsx
│           └── WorkspaceSwitcher.tsx
│
├── hooks/
│   └── useAuth.ts                Re-export from AuthContext
│
├── lib/
│   ├── supabase.ts               Supabase client singleton
│   └── utils.ts                  cn() helper (clsx + tailwind-merge)
│
├── services/
│   └── api.ts                    All FastAPI calls (typed, auth-injected)
│
├── types/
│   ├── evaluation.ts             EvaluationResult, Model, AVAILABLE_MODELS
│   └── api.ts                    API request/response types mirroring FastAPI schemas
│
└── public/
```

### Running the frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and fill the env file
cp .env.local .env.local  # .env.local already has defaults

# Start development server
npm run dev

# Start both frontend + backend together
npm run dev:all
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret service-role key (backend only) |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `REDIS_URL` | Redis connection URL |
| `FREE_EVAL_LIMIT` | Max evaluations/month for free plan (default: 100) |
| `PRO_EVAL_LIMIT` | Max evaluations/month for pro plan (default: 10000) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | FastAPI backend URL (default: http://localhost:8000) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |

---

## Architecture Decisions

### Auth flow
Supabase handles auth. The frontend gets a JWT from Supabase after sign-in and sends it as `Authorization: Bearer <token>` on every API call. The FastAPI backend verifies the JWT via `supabase_admin.auth.get_user(token)` in `app.core.supabase.auth_dependency`.

### Two evaluation paths
1. **Synchronous** (`POST /evaluate`) – FastAPI executes all LLM calls in parallel via `asyncio.gather` and returns results immediately. Good for ≤3 models.
2. **Asynchronous** (`POST /workspaces/{id}/evaluations`) – Returns 202 immediately. Celery worker picks up the task from Redis, executes the full pipeline (with caching), and stores results. Poll `GET /evaluations/{id}` for status.

### Service layering
- **Routes** (`app/api/routes/`) – only HTTP concerns: parsing, auth, response serialisation.
- **Services** (`app/services/`) – pure business logic, testable without HTTP.
- **Dependencies** (`app/dependencies/`) – reusable FastAPI `Depends()` callables.
- **Utils** (`app/utils/`) – stateless helper functions.

### Plan limits
Enforced in `app.services.usage_service.UsageService.enforce_plan_limit()` **before** any LLM call is made. Token limits enforced similarly. Usage is tracked atomically via the PostgreSQL `increment_usage()` function (race-safe upsert).
