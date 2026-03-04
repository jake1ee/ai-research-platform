"""
ModelCompare FastAPI application – root entry point.

Route groups
------------
  /auth          – signup, login
  /users         – current user profile
  /workspaces    – CRUD, member management, plan upgrades
  /evaluations   – submit evaluations, poll status, list history
  /billing       – Stripe webhook, monthly reports
  /analytics     – latency trends, cost trends, token usage, model performance

Authentication
--------------
  All routes except /auth/* require a valid JWT in the Authorization header:
    Authorization: Bearer <access_token>

Running locally
---------------
    # From backend/ directory:
    uvicorn api.main:app --reload --port 8000
"""

import json
import os
import sys
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    Header,
    HTTPException,
    Request,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

# ── Make backend/ importable regardless of working directory ──────────────────
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

import auth as auth_module
import models
import schemas
from config import settings
from database import engine, get_db
from services.billing_service import (
    get_monthly_report,
    handle_stripe_webhook,
    upgrade_plan,
)
from tasks.evaluation_tasks import run_evaluation

# Create all DB tables on startup (use Alembic for migrations in production)
models.Base.metadata.create_all(bind=engine)

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="ModelCompare API",
    description="Multi-LLM evaluation platform – compare latency, cost, and quality.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate-limit helpers ────────────────────────────────────────────────────────

def _plan_eval_limit(tier: models.PlanTier) -> int:
    """Return the monthly evaluation limit for a plan tier (-1 = unlimited)."""
    return {
        models.PlanTier.FREE: settings.FREE_EVAL_LIMIT,
        models.PlanTier.PRO: settings.PRO_EVAL_LIMIT,
        models.PlanTier.ENTERPRISE: settings.ENTERPRISE_EVAL_LIMIT,
    }[tier]


def _check_rate_limit(workspace: models.Workspace, db: Session) -> None:
    """
    Count this calendar month's evaluations and raise 429 if over the limit.
    Enterprise tier (-1) is always allowed.
    """
    limit = _plan_eval_limit(workspace.tier)
    if limit == -1:
        return  # Unlimited

    now = datetime.now(timezone.utc)
    # Count evaluations created this month for this workspace
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    count = (
        db.query(func.count(models.Evaluation.id))
        .filter(
            models.Evaluation.workspace_id == workspace.id,
            models.Evaluation.created_at >= month_start,
        )
        .scalar()
        or 0
    )
    if count >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"{workspace.tier.value.capitalize()} plan limit of {limit} evaluations/month reached. Please upgrade.",
        )


# ═════════════════════════════════════════════════════════════════════════════
# AUTH ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/auth/signup", response_model=schemas.Token, tags=["auth"])
def signup(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user account.

    On success:
      • Creates a User row.
      • Creates a personal Workspace for the user (they become ADMIN).
      • Returns a JWT access token.
    """
    if db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    new_user = models.User(
        id=user_id,
        email=user_in.email,
        name=user_in.name,
        hashed_password=auth_module.get_password_hash(user_in.password),
    )
    db.add(new_user)

    # Auto-create a personal workspace
    workspace_id = str(uuid.uuid4())
    workspace = models.Workspace(id=workspace_id, name=f"{user_in.name}'s Workspace")
    db.add(workspace)

    member = models.WorkspaceMember(
        workspace_id=workspace_id,
        user_id=user_id,
        role=models.Role.ADMIN,
    )
    db.add(member)
    db.commit()

    token = auth_module.create_access_token({"sub": user_id})
    return {"access_token": token, "token_type": "bearer"}


@app.post("/auth/login", response_model=schemas.Token, tags=["auth"])
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email + password and receive a JWT."""
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not auth_module.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = auth_module.create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer"}


# ═════════════════════════════════════════════════════════════════════════════
# USER ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/users/me", response_model=schemas.UserResponse, tags=["users"])
def get_me(current_user: models.User = Depends(auth_module.get_current_user)):
    """Return the authenticated user's profile."""
    return current_user


@app.get("/users/me/workspaces", response_model=List[schemas.WorkspaceResponse], tags=["users"])
def list_my_workspaces(
    current_user: models.User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db),
):
    """Return all workspaces the current user belongs to."""
    memberships = (
        db.query(models.WorkspaceMember)
        .filter(models.WorkspaceMember.user_id == current_user.id)
        .all()
    )
    workspace_ids = [m.workspace_id for m in memberships]
    return db.query(models.Workspace).filter(models.Workspace.id.in_(workspace_ids)).all()


# ═════════════════════════════════════════════════════════════════════════════
# WORKSPACE ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/workspaces", response_model=schemas.WorkspaceResponse, tags=["workspaces"])
def create_workspace(
    workspace_in: schemas.WorkspaceCreate,
    current_user: models.User = Depends(auth_module.get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new workspace. The creator is automatically assigned ADMIN role."""
    workspace = models.Workspace(id=str(uuid.uuid4()), name=workspace_in.name)
    db.add(workspace)
    member = models.WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role=models.Role.ADMIN,
    )
    db.add(member)
    db.commit()
    db.refresh(workspace)
    return workspace


@app.get("/workspaces/{workspace_id}", response_model=schemas.WorkspaceResponse, tags=["workspaces"])
def get_workspace(
    workspace_id: str,
    db: Session = Depends(get_db),
    _: models.WorkspaceMember = Depends(
        auth_module.require_role([models.Role.ADMIN, models.Role.ENGINEER, models.Role.VIEWER])
    ),
):
    """Get workspace details. Requires membership."""
    workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@app.get("/workspaces/{workspace_id}/members", response_model=List[schemas.WorkspaceMemberResponse], tags=["workspaces"])
def list_workspace_members(
    workspace_id: str,
    db: Session = Depends(get_db),
    _: models.WorkspaceMember = Depends(
        auth_module.require_role([models.Role.ADMIN, models.Role.ENGINEER, models.Role.VIEWER])
    ),
):
    """List all members of a workspace."""
    return (
        db.query(models.WorkspaceMember)
        .filter(models.WorkspaceMember.workspace_id == workspace_id)
        .all()
    )


@app.post("/workspaces/{workspace_id}/members", response_model=schemas.WorkspaceMemberResponse, tags=["workspaces"])
def invite_member(
    workspace_id: str,
    invite: schemas.WorkspaceMemberInvite,
    db: Session = Depends(get_db),
    _: models.WorkspaceMember = Depends(auth_module.require_role([models.Role.ADMIN])),
):
    """
    Invite an existing user to the workspace by email (ADMIN only).
    Enterprise plan required for multiple members.
    """
    workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
    if workspace.tier == models.PlanTier.FREE:
        raise HTTPException(
            status_code=403,
            detail="Team workspaces require Pro or Enterprise plan",
        )

    target_user = db.query(models.User).filter(models.User.email == invite.email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="No user found with that email")

    existing = (
        db.query(models.WorkspaceMember)
        .filter(
            models.WorkspaceMember.workspace_id == workspace_id,
            models.WorkspaceMember.user_id == target_user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="User is already a member")

    member = models.WorkspaceMember(
        workspace_id=workspace_id,
        user_id=target_user.id,
        role=invite.role,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@app.get("/workspaces/{workspace_id}/usage", response_model=schemas.UsageStats, tags=["workspaces"])
def get_workspace_usage(
    workspace_id: str,
    db: Session = Depends(get_db),
    _: models.WorkspaceMember = Depends(
        auth_module.require_role([models.Role.ADMIN, models.Role.ENGINEER, models.Role.VIEWER])
    ),
):
    """
    Return monthly usage statistics for the workspace.
    Includes plan limit and remaining evaluation count.
    """
    workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()

    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    logs = (
        db.query(models.UsageLog)
        .filter(
            models.UsageLog.workspace_id == workspace_id,
            models.UsageLog.timestamp >= month_start,
        )
        .all()
    )

    eval_count = (
        db.query(func.count(models.Evaluation.id))
        .filter(
            models.Evaluation.workspace_id == workspace_id,
            models.Evaluation.created_at >= month_start,
        )
        .scalar()
        or 0
    )

    total_cost = sum(log.cost_usd for log in logs)
    total_tokens = sum(log.input_tokens + log.output_tokens for log in logs)
    limit = _plan_eval_limit(workspace.tier)
    remaining = -1 if limit == -1 else max(0, limit - eval_count)

    return schemas.UsageStats(
        total_evaluations=eval_count,
        total_cost_usd=round(total_cost, 6),
        total_tokens=total_tokens,
        plan_limit=limit,
        remaining_evals=remaining,
    )


@app.post("/workspaces/{workspace_id}/upgrade", tags=["workspaces"])
def upgrade_workspace_plan(
    workspace_id: str,
    body: schemas.UpgradePlanRequest,
    db: Session = Depends(get_db),
    _: models.WorkspaceMember = Depends(auth_module.require_role([models.Role.ADMIN])),
):
    """Upgrade the workspace plan (ADMIN only). Triggers Stripe subscription creation."""
    workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    try:
        upgrade_plan(workspace, body.tier, body.payment_method_id, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {"message": f"Plan upgraded to {body.tier.value}", "workspace_id": workspace_id}


# ═════════════════════════════════════════════════════════════════════════════
# EVALUATION ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/workspaces/{workspace_id}/evaluations", response_model=schemas.EvaluationResponse, status_code=202, tags=["evaluations"])
def submit_evaluation(
    workspace_id: str,
    body: schemas.EvaluationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_module.get_current_user),
    member: models.WorkspaceMember = Depends(
        auth_module.require_role([models.Role.ADMIN, models.Role.ENGINEER])
    ),
):
    """
    Submit a new multi-model evaluation (returns 202 Accepted).

    The evaluation is queued in Celery. Poll GET /evaluations/{id} to check status.
    Viewers cannot submit evaluations (ENGINEER or ADMIN required).
    """
    workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Enforce plan rate limits before queuing
    _check_rate_limit(workspace, db)

    evaluation_id = str(uuid.uuid4())
    evaluation = models.Evaluation(
        id=evaluation_id,
        workspace_id=workspace_id,
        user_id=current_user.id,
        prompt=body.prompt,
        system_prompt=body.system_prompt,
        model_ids=",".join(body.model_ids),
        status=models.EvaluationStatus.PENDING,
        deterministic_seed=body.deterministic_seed,
        judge_model=body.judge_model,
        require_json_output=body.require_json_output,
        json_schema=json.dumps(body.json_schema) if body.json_schema else None,
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)

    # Dispatch to Celery worker (non-blocking)
    run_evaluation.delay(evaluation_id)

    return evaluation


@app.get("/workspaces/{workspace_id}/evaluations", response_model=List[schemas.EvaluationResponse], tags=["evaluations"])
def list_evaluations(
    workspace_id: str,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: models.WorkspaceMember = Depends(
        auth_module.require_role([models.Role.ADMIN, models.Role.ENGINEER, models.Role.VIEWER])
    ),
):
    """List evaluation history for a workspace, newest first."""
    return (
        db.query(models.Evaluation)
        .filter(models.Evaluation.workspace_id == workspace_id)
        .order_by(models.Evaluation.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@app.get("/evaluations/{evaluation_id}", response_model=schemas.EvaluationResponse, tags=["evaluations"])
def get_evaluation(
    evaluation_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_module.get_current_user),
):
    """
    Get an evaluation by ID including all per-model results.
    The authenticated user must be a member of the evaluation's workspace.
    """
    evaluation = (
        db.query(models.Evaluation)
        .filter(models.Evaluation.id == evaluation_id)
        .first()
    )
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation not found")

    # Confirm user is a member of this evaluation's workspace
    membership = (
        db.query(models.WorkspaceMember)
        .filter(
            models.WorkspaceMember.workspace_id == evaluation.workspace_id,
            models.WorkspaceMember.user_id == current_user.id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Access denied")

    # Attach badges to result dicts before returning
    result_dicts = [
        {
            "model_id": r.model_id,
            "latency_ms": r.latency_ms,
            "cost_usd": r.cost_usd,
            "judge_score": r.judge_score,
            "input_tokens": r.input_tokens,
            "output_tokens": r.output_tokens,
            "is_valid_json": r.is_valid_json,
            "error": r.error,
        }
        for r in evaluation.results
    ]
    from utils.badge_assigner import assign_badges
    assign_badges(result_dicts)
    badge_map = {d["model_id"]: d.get("badges", []) for d in result_dicts}

    # Build response manually to inject badges
    response = schemas.EvaluationResponse.model_validate(evaluation)
    for result_resp in response.results:
        result_resp.badges = badge_map.get(result_resp.model_id, [])

    return response


# ═════════════════════════════════════════════════════════════════════════════
# BILLING ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/workspaces/{workspace_id}/billing/report", tags=["billing"])
def get_billing_report(
    workspace_id: str,
    year: int,
    month: int,
    db: Session = Depends(get_db),
    _: models.WorkspaceMember = Depends(auth_module.require_role([models.Role.ADMIN])),
):
    """
    Generate a monthly billing report (ADMIN only).
    Returns cost and token breakdown per model for the given year/month.
    """
    if not (1 <= month <= 12):
        raise HTTPException(status_code=400, detail="month must be between 1 and 12")
    return get_monthly_report(workspace_id, year, month, db)


@app.get("/workspaces/{workspace_id}/billing/history", response_model=List[schemas.BillingRecordResponse], tags=["billing"])
def list_billing_records(
    workspace_id: str,
    db: Session = Depends(get_db),
    _: models.WorkspaceMember = Depends(auth_module.require_role([models.Role.ADMIN])),
):
    """Return all billing records (invoices) for a workspace (ADMIN only)."""
    return (
        db.query(models.BillingRecord)
        .filter(models.BillingRecord.workspace_id == workspace_id)
        .order_by(models.BillingRecord.created_at.desc())
        .all()
    )


@app.post("/billing/webhook", tags=["billing"])
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Stripe webhook endpoint. Verifies the signature and updates BillingRecord status.
    Configure this URL in the Stripe dashboard (no auth header required – Stripe signs the payload).
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    result = handle_stripe_webhook(payload, sig_header, db)
    if result.get("status") == "invalid_signature":
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    return result


# ═════════════════════════════════════════════════════════════════════════════
# ANALYTICS ROUTES
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/workspaces/{workspace_id}/analytics", response_model=schemas.AnalyticsSummary, tags=["analytics"])
def get_analytics(
    workspace_id: str,
    days: int = 30,
    db: Session = Depends(get_db),
    _: models.WorkspaceMember = Depends(
        auth_module.require_role([models.Role.ADMIN, models.Role.ENGINEER, models.Role.VIEWER])
    ),
):
    """
    Return aggregated analytics for the workspace over the last *days* days.

    Includes:
      • Total evaluations, cost, tokens, avg latency
      • Per-model call counts, avg latency, avg cost, avg judge score
      • Daily time-series for latency, cost, and token usage (for charts)
    """
    from datetime import timedelta

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    logs = (
        db.query(models.UsageLog)
        .filter(
            models.UsageLog.workspace_id == workspace_id,
            models.UsageLog.timestamp >= cutoff,
        )
        .all()
    )

    eval_results = (
        db.query(models.EvaluationResult)
        .join(models.Evaluation, models.Evaluation.id == models.EvaluationResult.evaluation_id)
        .filter(
            models.Evaluation.workspace_id == workspace_id,
            models.Evaluation.created_at >= cutoff,
        )
        .all()
    )

    # ── Aggregate totals ───────────────────────────────────────────────────
    total_cost = sum(l.cost_usd for l in logs)
    total_tokens = sum(l.input_tokens + l.output_tokens for l in logs)
    total_latency = sum(l.latency_ms for l in logs)
    avg_latency = total_latency / len(logs) if logs else 0.0

    # ── Per-model aggregates ───────────────────────────────────────────────
    model_calls: dict[str, int] = defaultdict(int)
    model_latency_sum: dict[str, float] = defaultdict(float)
    model_cost_sum: dict[str, float] = defaultdict(float)
    model_score_sum: dict[str, float] = defaultdict(float)
    model_score_count: dict[str, int] = defaultdict(int)

    for log in logs:
        model_calls[log.model_id] += 1
        model_latency_sum[log.model_id] += log.latency_ms
        model_cost_sum[log.model_id] += log.cost_usd

    for r in eval_results:
        if r.judge_score is not None:
            model_score_sum[r.model_id] += r.judge_score
            model_score_count[r.model_id] += 1

    model_avg_latency = {
        m: round(model_latency_sum[m] / model_calls[m], 2)
        for m in model_calls
    }
    model_avg_cost = {
        m: round(model_cost_sum[m] / model_calls[m], 8)
        for m in model_calls
    }
    model_avg_score = {
        m: round(model_score_sum[m] / model_score_count[m], 2)
        for m in model_score_count
    }

    # ── Daily time-series for charts ──────────────────────────────────────
    daily_latency: dict[tuple, list] = defaultdict(list)
    daily_cost: dict[tuple, float] = defaultdict(float)
    daily_tokens: dict[tuple, int] = defaultdict(int)

    for log in logs:
        date_str = log.timestamp.strftime("%Y-%m-%d")
        key = (date_str, log.model_id)
        daily_latency[key].append(log.latency_ms)
        daily_cost[key] += log.cost_usd
        daily_tokens[key] += log.input_tokens + log.output_tokens

    latency_trend = [
        schemas.ModelMetricPoint(
            date=k[0],
            model_id=k[1],
            value=round(sum(v) / len(v), 2),  # daily average latency
        )
        for k, v in daily_latency.items()
    ]
    cost_trend = [
        schemas.ModelMetricPoint(date=k[0], model_id=k[1], value=round(v, 8))
        for k, v in daily_cost.items()
    ]
    token_trend = [
        schemas.ModelMetricPoint(date=k[0], model_id=k[1], value=float(v))
        for k, v in daily_tokens.items()
    ]

    eval_count = (
        db.query(func.count(models.Evaluation.id))
        .filter(
            models.Evaluation.workspace_id == workspace_id,
            models.Evaluation.created_at >= cutoff,
        )
        .scalar()
        or 0
    )

    return schemas.AnalyticsSummary(
        total_evaluations=eval_count,
        total_cost_usd=round(total_cost, 6),
        total_tokens=total_tokens,
        avg_latency_ms=round(avg_latency, 2),
        model_call_counts=dict(model_calls),
        model_avg_latency_ms=model_avg_latency,
        model_avg_cost_usd=model_avg_cost,
        model_avg_judge_score=model_avg_score,
        latency_trend=latency_trend,
        cost_trend=cost_trend,
        token_usage_trend=token_trend,
    )
