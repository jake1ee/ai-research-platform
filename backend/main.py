"""
ModelCompare FastAPI – root entry point.

Running locally
---------------
    # From the backend/ directory:
    uvicorn main:app --reload --port 8000

    # Or using the frontend package.json script:
    npm run backend  (from frontend/)

Auth
----
  All routes except POST /billing/webhook require a Supabase JWT:
    Authorization: Bearer <supabase_access_token>

  The JWT is verified by app.core.supabase.auth_dependency.get_current_user.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analytics, auth, billing, evaluations, users, workspaces

app = FastAPI(
    title="ModelCompare API",
    description="Multi-LLM evaluation platform – compare latency, cost, and quality.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],   # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)                         # /auth/*
app.include_router(users.router)                        # /users/*
app.include_router(workspaces.router)                   # /workspaces/*
app.include_router(evaluations.router)                  # /workspaces/*/evaluations, /evaluations/*
app.include_router(evaluations.evaluate_router)         # /evaluate/*
app.include_router(billing.router)                      # /workspaces/*/billing/*, /billing/webhook
app.include_router(analytics.router)                    # /workspaces/*/analytics


@app.get("/health", tags=["health"])
def health_check():
    """Service health check endpoint."""
    return {"status": "ok", "version": "2.0.0"}
