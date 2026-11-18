# Inferra

LLM leaderboard, model/benchmark directories, comparison tool and public data API, plus an
authenticated Evaluation Lab for running prompts across models.

```
frontend/  Next.js 16 (App Router, Tailwind 4)   public pages are server-rendered from the API
backend/   FastAPI + Celery + Redis + Supabase   /v1 public API, auth'd lab/billing APIs
```

## Quick start

```powershell
# API
cd backend
python -m venv .venv; .venv\Scripts\pip install -r requirements-dev.txt
copy .env.example .env
.venv\Scripts\uvicorn main:app --reload --port 8000

# Web
cd frontend
copy .env.example .env.local
npm install; npm run dev
```

Or `docker compose up --build` (needs `backend/.env`).

The public API serves `backend/data/dataset.json` by default (**fictional demo data**). To use
Supabase: apply `backend/migrations/003_benchmarks.sql`, run
`python scripts/seed_benchmarks.py`, then set `BENCHMARK_DATA_SOURCE=supabase`.

## Public API (`/v1`)

`leaderboard`, `models[/slug]`, `benchmarks[/slug]`, `compare?models=a,b`, `recommend`, `stats`,
`methodology`, `data/{leaderboard|models|benchmarks|pricing|speed}.{json,csv}`,
`data/manifest.json`. Responses carry ETags and `Cache-Control`; the API is rate limited.
Interactive docs at `/docs` (non-production).

## Live data

| Data | Source | Schedule |
|---|---|---|
| Price, context window, release date | OpenRouter `/models` (primary), LiteLLM price table (fallback) | hourly |
| Latency, tokens/sec | Probe through LiteLLM with your own provider keys | every 6 h |
| Benchmark scores | Seed/import (`scripts/seed_benchmarks.py`); add adapters for aggregators you are licensed to use | manual |

1. Map your models to external ids in `backend/data/aliases.json`
   (`{"slug": {"openrouter": "...", "litellm": "...", "probe": "provider/model"}}`).
   Find ids with `python scripts/refresh_live_data.py --discover <text>`.
2. Run once: `python scripts/refresh_live_data.py --metadata` (and `--speed`).
3. Run `celery -A app.tasks.celery_app worker` and `beat` for the schedule (compose does this).

File mode writes `data/live_overlay.json` (single host only). With separate api/worker
containers use `BENCHMARK_DATA_SOURCE=supabase` (apply `migrations/004_live_data.sql`).
The API caches the dataset for `DATASET_TTL_SECONDS` (default 60 s). Models without an alias
are never touched. Check each source's terms of use before commercial use.

## Scoring

See `backend/app/benchmarks/scoring.py` (documented at the top of the file) and the in-app
Methodology page. Missing results are never interpolated.

## Quality gates

```powershell
cd backend;  ruff check .; mypy app; pytest
cd frontend; npm run lint; npm run typecheck; npm test; npm run build
```

CI runs the same in `.github/workflows/ci.yml`.

## Configuration

All settings are environment variables; see `backend/.env.example` and `frontend/.env.example`.
In production (`ENVIRONMENT=production`) the API refuses to start without Supabase URL,
service-role key and JWT secret, and disables `/docs`.

## Status / known gaps

- Evaluation Lab, Dashboard, History and Settings still use the legacy UI and mock data; wiring
  them to the real backend endpoints is pending.
- Schema drift between legacy backend code and `migrations/schema.sql` (profiles / usage_logs /
  billing_records) is not yet reconciled.
- Frontend API types are hand-written (`frontend/lib/types.ts`); generate from OpenAPI later.
